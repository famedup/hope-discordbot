/* ---
   module : giveawayUI
   shared embed / button builders for every giveaway surface
   --- */

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const emojis = require('../media/emojis.json');

// One colour for every giveaway embed - change it here and it changes everywhere.
const COLOR = 0xE4DFF1;
const MAX_WINNERS = 20;

// Emoji on the entry button. Set "giveawayreaction" in media/emojis.json
// (custom server emoji like <:name:id> / <a:name:id>, or plain unicode).
const ENTRY_EMOJI = emojis.giveawayreaction || '🎉';
const UNITS = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };

/** "1m", "2h", "1d12h", "90s" -> seconds (0 when invalid) */
function parseDuration(input) {
  if (!input) return 0;
  const str = String(input).trim().toLowerCase().replace(/\s+/g, '');
  if (!/^(\d+[smhdw])+$/.test(str)) return 0;
  let total = 0;
  for (const [, n, u] of str.matchAll(/(\d+)([smhdw])/g)) {
    total += parseInt(n, 10) * UNITS[u];
  }
  return total;
}

function truncate(text, max) {
  text = String(text ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function guildIcon(guild) {
  return guild?.iconURL?.({ size: 256 }) || null;
}

function mentions(ids) {
  return ids.map((id) => `<@${id}>`).join(', ');
}

/** The giveaway card (active or ended). Guild icon is always the thumbnail. */
function buildGiveawayEmbed(giveaway, guild, { ended = false, winnerIds = [] } = {}) {
  const lines = [`**Host:** <@${giveaway.hostId}>`];

  if (ended) {
    lines.push('**Ends:** Ended', '');
    lines.push(`**Winners:** ${winnerIds.length ? mentions(winnerIds) : 'No valid entries'}`);
  } else {
    const winners = Number(giveaway.winners);
    lines.push(`**Ends:** <t:${Number(giveaway.endTime)}:R>`);
    lines.push(`${winners} winner${winners === 1 ? '' : 's'}`);
  }

  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(truncate(giveaway.prize, 256))
    .setDescription(lines.join('\n'));

  const icon = guildIcon(guild);
  if (icon) embed.setThumbnail(icon);

  return embed;
}

/** [emoji count] [Participants] - the entry button doubles as the live counter. */
function buildGiveawayRow(giveaway, count = 0, ended = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`giveaway_enter_${giveaway.id}`)
      .setEmoji(ENTRY_EMOJI)
      .setLabel(String(count))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(ended),
    new ButtonBuilder()
      .setCustomId(`giveaway_participants_${giveaway.id}`)
      .setLabel('Participants')
      .setStyle(ButtonStyle.Secondary)
  );
}

/** Small one-off message: errors, confirmations. */
function notice(title, text) {
  return new EmbedBuilder().setColor(COLOR).setDescription(`**${title}**\n${text}`);
}

/** Reply to a slash interaction (optionally ephemeral) or a prefix message. */
function respond(ctx, embed, { ephemeral = false } = {}) {
  const payload = { embeds: [embed] };
  const isInteraction = typeof ctx.isCommand === 'function' || typeof ctx.isButton === 'function';

  if (isInteraction) {
    if (ephemeral) payload.flags = MessageFlags.Ephemeral;
  } else {
    payload.allowedMentions = { repliedUser: false };
  }
  return ctx.reply(payload);
}

/** "Congrats, @user you have won **prize**, hosted by @host" + Giveaway Link button */
function buildAnnouncement(giveaway, winnerIds, url, { reroll = false } = {}) {
  const payload = {
    content:
      `${reroll ? 'Reroll! ' : ''}Congrats, ${mentions(winnerIds)} you have won ` +
      `**${giveaway.prize}**, hosted by <@${giveaway.hostId}>`,
    allowedMentions: { users: winnerIds },
  };

  if (url) {
    payload.components = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Giveaway Link').setStyle(ButtonStyle.Link).setURL(url)
      ),
    ];
  }
  return payload;
}

function buildWinnerDM(giveaway, guild, url) {
  const embed = new EmbedBuilder()
    .setColor(COLOR)
    .setDescription(`You won **${giveaway.prize}** in **${guild.name}**`);

  const icon = guildIcon(guild);
  if (icon) embed.setThumbnail(icon);

  const payload = { embeds: [embed] };
  if (url) {
    payload.components = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Winning Message').setStyle(ButtonStyle.Link).setURL(url)
      ),
    ];
  }
  return payload;
}

module.exports = {
  COLOR,
  MAX_WINNERS,
  ENTRY_EMOJI,
  parseDuration,
  buildGiveawayEmbed,
  buildGiveawayRow,
  notice,
  respond,
  buildAnnouncement,
  buildWinnerDM,
};
