// dev: cashholy (carti) | module: tempban

const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');

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
  name: 'tempban',
  description: 'Temporarily ban users',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Permission Denied', 'You need the **Ban Members** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return modReply(message, 'Missing Permissions', 'I need the **Ban Members** permission.');

    const targetUser = message.mentions.users.first();
    const targetMember = message.mentions.members.first();
    
    if (!targetUser)
      return modReply(message, 'User Not Found', 'Please mention a user to tempban.');

    const duration = args[1];
    if (!duration)
      return modReply(message, 'Missing Duration', 'Please provide a duration (e.g., 1h, 30m, 1d).');

    const time = ms(duration);
    if (!time || time < 1000 || time > 315360000000)
      return modReply(message, 'Invalid Duration', 'Provide a valid duration (e.g., 1h, 30m, 1d, 7d).');

    if (await blockProtectedTarget(message, message.author, targetUser.id, 'tempban')) return;

    if (targetMember && targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Ban User', 'They have an equal or higher role than you.');

    if (targetMember && !targetMember.bannable)
      return modReply(message, 'Cannot Ban User', 'I cannot ban this user. They may have a higher role than me.');

    const reason = args.slice(2).join(' ') || 'No reason provided';

    try {
      await message.guild.members.ban(targetUser, {
        deleteMessageDays: 1,
        reason: `[TEMPBAN ${ms(time, { long: true })}] ${reason}`
      });

      setTimeout(async () => {
        try { await message.guild.members.unban(targetUser, 'Tempban expired'); } catch {}
      }, time);

      await message.reply({ components: buildModResult({ verb: 'temporarily banned', target: targetUser, moderator: message.author, reason: reason, duration: ms(time, { long: true }) }), ...modResultOptions });
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to ban this user.' : 'Failed to temporarily ban user.';
      await modReply(message, 'Error', msg);
    }
  },
};
