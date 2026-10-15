/*! © 2026 cashholy (carti) !*/

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral });
}

module.exports = {
  name: 'unmute',
  description: 'Unmute muted users',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(interaction, 'Permission Denied', 'You need the **Moderate Members** permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(interaction, 'Missing Permissions', 'I need the **Moderate Members** permission.', true);

    if (!targetMember)
      return modReply(interaction, 'User Not Found', 'User is not in this server.', true);

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Cannot Unmute User', 'They have an equal or higher role than you.', true);

    if (!targetMember.isCommunicationDisabled())
      return modReply(interaction, 'User Not Muted', 'This user is not currently timed out.', true);

    if (!targetMember.moderatable)
      return modReply(interaction, 'Cannot Unmute User', 'I cannot unmute this user. They may have a higher role than me.', true);

    try {
      await targetMember.timeout(null);
      await modReply(interaction, 'User Unmuted',
        `**User:** ${targetUser}\n**Unmuted by:** ${interaction.user.tag}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to unmute this user.' : 'Failed to unmute user.';
      await modReply(interaction, 'Error', msg, true);
    }
  },
};
