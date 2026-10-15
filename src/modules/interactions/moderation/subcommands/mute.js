//
//  Made with care by cashholy (carti)
//

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');

function modReply(interaction, title, body, ephemeral = false) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2, ephemeral });
}

module.exports = {
  name: 'mute',
  description: 'Mute users for a duration',

  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetMember = interaction.options.getMember('user');
    const duration = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(interaction, 'Permission Denied', 'You need the **Moderate Members** permission.', true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(interaction, 'Missing Permissions', 'I need the **Moderate Members** permission.', true);

    if (!targetMember)
      return modReply(interaction, 'User Not Found', 'User is not in this server.', true);

    const time = ms(duration);
    if (!time || time < 1000 || time > 2419200000)
      return modReply(interaction, 'Invalid Duration', 'Provide a valid duration (e.g., 1h, 30m, 1d). Maximum is 28 days.', true);

    if (targetMember.roles.highest.position >= interaction.member.roles.highest.position)
      return modReply(interaction, 'Cannot Mute User', 'They have an equal or higher role than you.', true);

    if (!targetMember.moderatable)
      return modReply(interaction, 'Cannot Mute User', 'I cannot mute this user. They may have a higher role than me.', true);

    try {
      await targetMember.timeout(time, reason);
      await modReply(interaction, 'User Muted',
        `**User:** ${targetUser}\n**Duration:** ${ms(time, { long: true })}\n**Moderator:** ${interaction.user.tag}\n**Reason:** ${reason}`);
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to mute this user.' : 'Failed to mute user.';
      await modReply(interaction, 'Error', msg, true);
    }
  },
};
