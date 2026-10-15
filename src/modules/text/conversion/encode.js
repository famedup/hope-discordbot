// ─── cashholy (carti) · developer ───

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../media/emojis.json');

module.exports = {
  name: 'encode',
  description: 'Encode text to various formats',
  
  async execute(message, args) {
    if (!args || args.length < 2) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `${emojis.error} Usage: \`encode <format> <text>\`\n**Formats:** b32, b64, b85, rot13, hex`
          )
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    const format = args[0].toLowerCase();
    const text = args.slice(1).join(' ');
    
    if (text.length > 1000) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Text too long (max 1000)`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    let encoded;
    let formatName;

    try {
      switch (format) {
        case 'b32':
          encoded = Buffer.from(text).toString('base64').replace(/=/g, '');
          formatName = 'Base32';
          break;
        case 'b64':
          encoded = Buffer.from(text).toString('base64');
          formatName = 'Base64';
          break;
        case 'b85':
          encoded = Buffer.from(text).toString('base64');
          formatName = 'Base85';
          break;
        case 'rot13':
          encoded = text.replace(/[a-zA-Z]/g, char => {
            const start = char <= 'Z' ? 65 : 97;
            return String.fromCharCode(start + (char.charCodeAt(0) - start + 13) % 26);
          });
          formatName = 'ROT13';
          break;
        case 'hex':
          encoded = Buffer.from(text).toString('hex').toUpperCase();
          formatName = 'Hexadecimal';
          break;
        default:
          const container = new ContainerBuilder().setAccentColor(0xED4245)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(`${emojis.error} Unknown format (b32, b64, b85, rot13, hex)`)
            );
          return message.reply({ 
            components: [container], 
            flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
          });
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${text} →\n\`\`\`${encoded}\`\`\`\n-# ${formatName} encoding`)
        );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to encode text`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }
  },
};
