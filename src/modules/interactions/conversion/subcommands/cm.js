// dev: cashholy (carti) | module: cm

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'cm',
  description: 'Convert centimeters to feet and inches',
  
  async execute(interaction) {
    const centimeters = interaction.options.getNumber('centimeters');
    
    if (centimeters < 0) {
      const container = new ContainerBuilder().setAccentColor(0xED4245)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${emojis.error} Centimeters cannot be negative`)
        );
      return interaction.reply({ 
        components: [container], 
        flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2,
        ephemeral: true
      });
    }

    const totalInches = centimeters / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`**${centimeters} cm** = **${feet}' ${inches.toFixed(2)}"**\n-# Centimeters → Feet & inches`)
        );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
    });
  },
};
