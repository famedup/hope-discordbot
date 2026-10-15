/*! © 2026 cashholy (carti) !*/

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const emojis = require('../../../../media/emojis.json');

module.exports = {
  name: 'hex',
  description: 'Encode text to hexadecimal',
  
  async execute(interaction) {
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

    const encoded = Buffer.from(text).toString('hex').toUpperCase();
    
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${text} →\n\`\`\`${encoded}\`\`\`\n-# Hexadecimal encoding`)
        );

    return interaction.reply({
      components: [container],
      flags: MessageFlags.IsPersistent | MessageFlags.IsComponentsV2
    });
  },
};
