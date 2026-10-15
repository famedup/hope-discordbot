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
  name: 'hexdec',
  description: 'Convert hexadecimal to decimal',
  
  async execute(message, args) {
    if (!args || args.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Usage: \`hexdec <hex>\``)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    let hex = args[0].trim();
    hex = hex.replace(/^0x/i, '');
    
    if (!/^[0-9A-Fa-f]+$/.test(hex)) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Invalid hex`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    const decimal = parseInt(hex, 16);
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**0x${hex.toUpperCase()}** = **${decimal}**\n-# Hexadecimal → Decimal`)
        );

    return message.reply({
      components: [container],
      flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
    });
  },
};
