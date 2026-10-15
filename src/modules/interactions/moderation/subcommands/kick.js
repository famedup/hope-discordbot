/*
 * Developed by cashholy (carti)
 * File: modules/interactions/moderation/subcommands/kick.js
 */

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
  name: 'kick',
  description: 'Kick users from the server',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(interaction, 'Permission Denied', 'You need the **Kick Members** permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(interaction, 'Missing Permissions', 'I need the **Kick Members** permission.', true);

    if (!targetMember)
      return modReply(interaction, 'User Not Found', 'User is not in this server.', true);

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Cannot Kick User', 'They have an equal or higher role than you.', true);

    if (!targetMember.kickable)
      return modReply(interaction, 'Cannot Kick User', 'I cannot kick this user. They may have a higher role than me.', true);

    try {
      await targetMember.kick(reason);
      await modReply(interaction, 'User Kicked',
        `**User:** ${targetUser.tag}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to kick this user.' : 'Failed to kick user.';
      await modReply(interaction, 'Error', msg, true);
    }
  },
};
