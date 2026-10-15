/**
 * @file roleinfo.js
 * @developer cashholy (carti)
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'roleinfo',
  
  async execute(interaction) {
    await interaction.deferReply();

    const role = interaction.options.getRole('role');

    const container = new ContainerBuilder().setAccentColor(0x2B2D31);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Role Information**`)
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
    );

    const info = [
      `**Name:** ${role.name}`,
      `**ID:** ${role.id}`,
      `**Color:** ${role.hexColor}`,
      `**Members:** ${role.members.size}`,
      `**Position:** ${role.position}`,
      `**Hoisted:** ${role.hoist ? 'Yes' : 'No'}`,
      `**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}`,
      `**Managed:** ${role.managed ? 'Yes' : 'No'}`,
      `**Created:** <t:${Math.floor(role.createdTimestamp / 1000)}:F>`,
      `**Permissions:** ${role.permissions.toArray().length} permissions`,
    ].join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(info)
    );

    if (role.iconURL()) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Icon URL:** [View Icon](${role.iconURL()})`)
      );
    }

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  }
};
