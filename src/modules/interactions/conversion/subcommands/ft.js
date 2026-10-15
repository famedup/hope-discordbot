/**
 * ┌ cashholy (carti)
 * └ modules/interactions/conversion/subcommands/ft.js
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'ft',
  description: 'Convert feet.inches to centimeters',
  
  async execute(interaction) {
    const feet = interaction.options.getNumber('feet');
    const inches = interaction.options.getNumber('inches') || 0;
    
    if (feet < 0 || inches < 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Values cannot be negative`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const totalInches = (feet * 12) + inches;
    const centimeters = totalInches * 2.54;
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${feet}' ${inches}"** = **${centimeters.toFixed(2)} cm**\n-# Feet & inches → Centimeters`)
        );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
    });
  },
};
