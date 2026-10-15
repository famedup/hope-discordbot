/** @author cashholy (carti) */

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
  name: 'unban',
  description: 'Unban a previously banned user',

  async execute(interaction) {
    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Permission Denied', 'You need the **Ban Members** permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Missing Permissions', 'I need the **Ban Members** permission.', true);

    try {
      const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!bannedUser)
        return modReply(interaction, 'User Not Banned', 'This user is not banned from the server.', true);

      await interaction.guild.members.unban(userId, reason);
      await modReply(interaction, 'User Unbanned',
        `**User:** ${bannedUser.user.tag}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to unban this user.' : 'Failed to unban user. Check the user ID.';
      await modReply(interaction, 'Error', msg, true);
    }
  },
};
