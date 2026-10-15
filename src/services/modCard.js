// ─── cashholy (carti) · developer ───

const {
  ContainerBuilder, TextDisplayBuilder, SectionBuilder, ThumbnailBuilder, MessageFlags,
} = require('discord.js');

const ACCENT = 0x2B2D31;

/**
 * Builds the moderation result layout:
 *   <@target> has been <verb>.
 *   [ container: moderator name / Reason / Duration ........ target avatar ]
 */
function buildModResult({ verb, target, moderator, reason, duration }) {
  const lines = [
    `**${moderator.username}**`,
    '',
    '**Reason:**',
    `> ${String(reason || 'No reason provided').replace(/\n/g, '\n> ')}`,
  ];
  if (duration) lines.push('', '**Duration:**', `> ${duration}`);

  const section = new SectionBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
    .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.displayAvatarURL({ size: 256 })));

  const container = new ContainerBuilder().setAccentColor(ACCENT).addSectionComponents(section);

  return [
    new TextDisplayBuilder().setContent(`<@${target.id}> has been ${verb}.`),
    container,
  ];
}

const opts = { flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } };

module.exports = { buildModResult, modResultOptions: opts };
