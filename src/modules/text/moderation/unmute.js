// ▛▀ cashholy (carti) ▀▜

const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');

const { blockProtectedTarget } = require('../../../services/modGuard');
const { buildModResult, modResultOptions } = require('../../../services/modCard');

function modReply(message, title, body) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'unmute',
  description: 'Unmute muted users',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Permission Denied', 'You need the **Moderate Members** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Missing Permissions', 'I need the **Moderate Members** permission.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'User Not Found', 'Please mention a user to unmute.');

    if (await blockProtectedTarget(message, message.author, targetMember.id, 'unmute')) return;

    if (targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Unmute User', 'They have an equal or higher role than you.');

    if (!targetMember.isCommunicationDisabled())
      return modReply(message, 'User Not Muted', 'This user is not currently timed out.');

    if (!targetMember.moderatable)
      return modReply(message, 'Cannot Unmute User', 'I cannot unmute this user. They may have a higher role than me.');

    try {
      await targetMember.timeout(null);
      await message.reply({ components: buildModResult({ verb: 'unmuted', target: targetMember.user, moderator: message.author, reason: 'No reason provided' }), ...modResultOptions });
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to unmute this user.' : 'Failed to unmute user.';
      await modReply(message, 'Error', msg);
    }
  },
};
