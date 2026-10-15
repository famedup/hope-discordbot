// »» engineered by cashholy (carti) ««

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
  name: 'ban',
  description: 'Ban users from the server',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteMessageDays = interaction.options.getInteger('delete_messages') || 0;

    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Permission Denied', 'You need the **Ban Members** permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(interaction, 'Missing Permissions', 'I need the **Ban Members** permission.', true);

    if (targetMember && targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Cannot Ban User', 'They have an equal or higher role than you.', true);

    if (targetMember && !targetMember.bannable)
      return modReply(interaction, 'Cannot Ban User', 'I cannot ban this user. They may have a higher role than me.', true);

    try {
      await interaction.guild.members.ban(targetUser, { deleteMessageDays, reason });

      await modReply(interaction, 'User Banned',
        `**User:** ${targetUser.tag}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}` +
        (deleteMessageDays > 0 ? `\n**Messages Deleted:** Last ${deleteMessageDays} day(s)` : ''));
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to ban this user.' : 'Failed to ban user.';
      await modReply(interaction, 'Error', msg, true);
    }
  },
};
