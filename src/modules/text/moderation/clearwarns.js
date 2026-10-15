// ▛▀ cashholy (carti) ▀▜

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

module.exports = {
  name: 'clearwarns',
  description: 'Clear all warnings for a user',
  aliases: ['clearwarnings'],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Permission Denied', 'You need the **Moderate Members** permission.');

    const user = message.mentions.users.first();
    if (!user) return modReply(message, 'User Not Found', 'Please mention a user to clear warnings for.');

    try {
      const { Warn } = require('../../../database/schemas');
      const removed = await Warn.destroy({ where: { guildId: message.guild.id, userId: user.id } });
      await modReply(message, 'Warnings Cleared', `Removed **${removed}** warning(s) from ${user}.`);
    } catch (error) {
      console.error('clearwarns error:', error);
      await modReply(message, 'Error', 'Failed to clear warnings.');
    }
  },
};
