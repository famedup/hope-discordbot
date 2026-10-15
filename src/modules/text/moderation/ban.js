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
  name: 'ban',
  description: 'Ban users from the server',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Permission Denied', 'You need the **Ban Members** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Missing Permissions', 'I need the **Ban Members** permission.');

    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();
    
    if (!targetUser)
      return modReply(message, 'User Not Found', 'Please mention a user to ban.');

    if (await blockProtectedTarget(message, message.author, targetUser.id, 'ban')) return;

    if (targetMember && targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Ban User', 'They have an equal or higher role than you.');

    if (targetMember && !targetMember.bannable)
      return modReply(message, 'Cannot Ban User', 'I cannot ban this user. They may have a higher role than me.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await message.guild.members.ban(targetUser, { deleteMessageDays: 1, reason });
      await message.reply({ components: buildModResult({ verb: 'banned', target: targetUser, moderator: message.author, reason: reason, duration: 'Permanent' }), ...modResultOptions });
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to ban this user.' : 'Failed to ban user.';
      await modReply(message, 'Error', msg);
    }
  },
};
