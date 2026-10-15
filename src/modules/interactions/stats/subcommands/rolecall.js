/*! © 2026 cashholy (carti) !*/

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'rolecall',
  
  async execute(interaction) {
    await interaction.deferReply();

    const role = interaction.options.getRole('role');
    const memberCount = role.members.size;

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Role Call for ${role.name}**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**Role:** ${role.name}`,
      `**Members:** ${memberCount}`,
      `**Percentage:** ${((memberCount / interaction.guild.memberCount) * 100).toFixed(2)}%`,
      `**Color:** ${role.hexColor}`,
      `**Position:** ${role.position}`,
    ].join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(info)
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
