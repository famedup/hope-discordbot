/* ---
   author : cashholy (carti)
   module : lb
   --- */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'lb',
  description: 'Convert pounds to kilograms',
  
  async execute(interaction) {
    const pounds = interaction.options.getNumber('pounds');
    
    if (pounds < 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Pounds cannot be negative`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const kilograms = pounds * 0.45359237;
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${pounds} lb** = **${kilograms.toFixed(2)} kg**\n-# Pounds → Kilograms`)
        );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
    });
  },
};
