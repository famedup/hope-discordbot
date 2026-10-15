// »» engineered by cashholy (carti) ««

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
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
}

module.exports = {
  name: 'warn',
  description: 'Warn a user',
  aliases: [],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Permission Denied', 'You need the **Moderate Members** permission.');

    const targetMember = message.mentions.members.first();
    if (!targetMember)
      return modReply(message, 'User Not Found', 'Please mention a user to warn.');
    if (await blockProtectedTarget(message, message.author, targetMember.id, 'warn')) return;

    if (targetMember.user.bot)
      return modReply(message, 'Cannot Warn User', 'You cannot warn a bot.');
    if (targetMember.id === message.author.id)
      return modReply(message, 'Cannot Warn User', 'You cannot warn yourself.');
    if (targetMember.roles.highest.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id)
      return modReply(message, 'Cannot Warn User', 'They have an equal or higher role than you.');

    const reason = args.slice(1).join(' ').slice(0, 1000) || 'No reason provided';

    try {
      const { Warn } = require('../../../database/schemas');
      await Warn.create({ guildId: message.guild.id, userId: targetMember.id, moderatorId: message.author.id, reason });
      await message.reply({
        components: buildModResult({ verb: 'warned', target: targetMember.user, moderator: message.author, reason }),
        ...modResultOptions,
      });
    } catch (error) {
      console.error('warn error:', error);
      await modReply(message, 'Error', 'Failed to save the warning.');
    }
  },
};
