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
  name: 'size',
  description: 'Shows pp size (for fun)',
  
  async execute(interaction) {
    let user = interaction.user;
    const userOption = interaction.options.getUser('user');
    
    if (userOption) {
      user = userOption;
    }

    const userId = user.id;
    const seed = parseInt(userId.slice(-8), 16);
    const length = (seed % 15) + 1;

    const shaft = '='.repeat(length);
    const sizeDisplay = `8${shaft}D`;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# Size Measurement`)
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**${user.username}'s** size: ${sizeDisplay}`)
      );

    return await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
