// @cashholy(carti) — warnings

const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  SeparatorSpacingSize, MessageFlags, PermissionFlagsBits,
} = require('discord.js');
const { buildModResult, modResultOptions } = require('../../../services/modCard');

function modReply(message, title, body) {
  const container = new ContainerBuilder().setAccentColor(0x2B2D31)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
  return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });
}

async function listWarnings(guildId, user) {
  const { Warn } = require('../../../database/schemas');
  const rows = await Warn.findAll({ where: { guildId, userId: user.id }, order: [['createdAt', 'DESC']], limit: 10 });
  const total = await Warn.count({ where: { guildId, userId: user.id } });
  const lines = rows.map(w =>
    `**#${w.id}** - <t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:R> by <@${w.moderatorId}>\n> ${w.reason || 'No reason provided'}`);
  return { total, text: lines.join('\n\n') };
}

module.exports = {
  name: 'warnings',
  description: 'View warnings for a user',
  aliases: ['warns'],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Permission Denied', 'You need the **Moderate Members** permission.');

    const user = message.mentions.users.first() || message.author;
    try {
      const { total, text } = await listWarnings(message.guild.id, user);
      if (!total) return modReply(message, 'Warnings', `${user} has no warnings.`);
      await modReply(message, `Warnings for ${user.username} (${total})`, text + (total > 10 ? '\n\n-# Showing the 10 most recent' : ''));
    } catch (error) {
      console.error('warnings error:', error);
      await modReply(message, 'Error', 'Failed to fetch warnings.');
    }
  },
};
