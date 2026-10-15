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
  name: 'rot13',
  description: 'Encode text to ROT13',
  
  async execute(message, args) {
    if (!args || args.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Usage: \`rot13 <text>\``)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    const text = args.join(' ');
    
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

    const encoded = text.replace(/[a-zA-Z]/g, char => {
      const start = char <= 'Z' ? 65 : 97;
      return String.fromCharCode(start + (char.charCodeAt(0) - start + 13) % 26);
    });
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${text} →\n\`\`\`${encoded}\`\`\`\n-# ROT13 encoding`)
        );

    return message.reply({
      components: [container],
      flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
    });
  },
};
