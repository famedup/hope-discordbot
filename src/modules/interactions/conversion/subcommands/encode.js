/** @author cashholy (carti) */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'encode',
  description: 'Encode text to various formats',
  
  async execute(interaction) {
    const format = interaction.options.getString('format');
    const text = interaction.options.getString('text');
    
    if (text.length > 1000) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Text too long (max 1000)`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
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
          encoded = 'Unknown format';
          formatName = 'Unknown';
      }

      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${text} →\n\`\`\`${encoded}\`\`\`\n-# ${formatName} encoding`)
        );

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to encode text`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
  },
};
