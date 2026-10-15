/* ---
   author : cashholy (carti)
   module : kick
   --- */

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
  name: 'kick',
  description: 'Kick users from the server',
  aliases: [],
  
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(message, 'Permission Denied', 'You need the **Kick Members** permission.');

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers))
      return modReply(message, 'Missing Permissions', 'I need the **Kick Members** permission.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'User Not Found', 'Please mention a user to kick.');

    if (await blockProtectedTarget(message, message.author, targetMember.id, 'kick')) return;

    if (targetMember.roles.highest.position >= message.member.roles.highest.position)
      return modReply(message, 'Cannot Kick User', 'They have an equal or higher role than you.');

    if (!targetMember.kickable)
      return modReply(message, 'Cannot Kick User', 'I cannot kick this user. They may have a higher role than me.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await targetMember.kick(reason);
      await message.reply({ components: buildModResult({ verb: 'kicked', target: targetMember.user, moderator: message.author, reason: reason }), ...modResultOptions });
    } catch (error) {
      const msg = error.code === 50013 ? 'I lack the permissions to kick this user.' : 'Failed to kick user.';
      await modReply(message, 'Error', msg);
    }
  },
};
