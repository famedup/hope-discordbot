/* ⌁ crafted by cashholy (carti) ⌁ */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../media/emojis.json');

module.exports = {
  name: 'binstr',
  description: 'Convert binary to a string',
  
  async execute(message, args) {
    if (!args || args.length === 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Usage: \`binstr <binary>\``)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }

    let binary = args.join(' ').trim();
    binary = binary.replace(/\s+/g, ' ');
    const binaryArray = binary.split(' ');
    
    for (const bin of binaryArray) {
      if (!/^[01]+$/.test(bin)) {
        const container = new ContainerBuilder().setAccentColor(0xED4245)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${emojis.error} Invalid binary`)
          );
        return message.reply({ 
          components: [container], 
          flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
        });
      }
    }

    try {
      const text = binaryArray.map(bin => {
        return String.fromCharCode(parseInt(bin, 2));
      }).join('');
      
      const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${text}\n-# Binary → String`)
        );

      return message.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to convert binary to string`)
        );
      return message.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    }
  },
};
