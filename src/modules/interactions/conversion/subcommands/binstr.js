//
//  Made with care by cashholy (carti)
//

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'binstr',
  description: 'Convert binary to a string',
  
  async execute(interaction) {
    let binary = interaction.options.getString('binary').trim();
    
    binary = binary.replace(/\s+/g, ' ');
    const binaryArray = binary.split(' ');
    
    for (const bin of binaryArray) {
      if (!/^[01]+$/.test(bin)) {
        const container = new ContainerBuilder().setAccentColor(0xED4245)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`${emojis.error} Invalid binary`)
          );
        return interaction.reply({ 
          components: [container], 
          flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
          ephemeral: true
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

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
      });
    } catch (error) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Failed to convert binary to string`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }
  },
};
