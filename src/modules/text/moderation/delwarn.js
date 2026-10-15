// @cashholy(carti) — delwarn

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
  name: 'delwarn',
  description: 'Delete a warning by ID',
  aliases: ['removewarn'],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return modReply(message, 'Permission Denied', 'You need the **Moderate Members** permission.');

    const id = parseInt(args[0], 10);
    if (!id) return modReply(message, 'Missing Warning ID', 'Usage: `delwarn <warning id>` (see the IDs in `warnings @user`).');

    try {
      const { Warn } = require('../../../database/schemas');
      const removed = await Warn.destroy({ where: { id, guildId: message.guild.id } });
      if (!removed) return modReply(message, 'Not Found', `No warning with ID **#${id}** in this server.`);
      await modReply(message, 'Warning Deleted', `Warning **#${id}** has been removed.`);
    } catch (error) {
      console.error('delwarn error:', error);
      await modReply(message, 'Error', 'Failed to delete the warning.');
    }
  },
};
