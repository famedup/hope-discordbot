// @cashholy(carti) — ui

// hope — shared UI kit
//
// One place for the look of every reply: a single neutral grey accent, three
// event colours (success / warning / error), and small builders so commands
// stay short. Keep replies minimal: a title or one line, optional controls.

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SectionBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const emojis = require('../media/emojis.json');

/** Neutral grey = "no colour" (matches Discord's dark surface). */
const COLOR = Object.freeze({
  base:    0x2B2D31,
  success: 0x57F287,
  warning: 0xFEE75C,
  error:   0xED4245,
});

const ICON = Object.freeze({
  success: emojis.success,
  warning: emojis.warning,
  error:   emojis.error,
  base:    '',
});

// Custom delete icon: set "delete" in emojis.json to your server emoji (<:name:id>).
const DELETE_EMOJI = (emojis.delete && !/:0>$/.test(emojis.delete)) ? emojis.delete : '🗑️';

function parseEmoji(str) {
  if (!str || typeof str !== 'string') return undefined;
  const m = str.match(/^<(a?):(\w+):(\d+)>$/);
  if (m) return { animated: m[1] === 'a', name: m[2], id: m[3] };
  return str; // plain unicode
}

/* ── layout primitives ─────────────────────────────────────────────── */

const box = (kind = 'base') => new ContainerBuilder().setAccentColor(COLOR[kind] ?? COLOR.base);
const text = (content) => new TextDisplayBuilder().setContent(String(content));
const sep = (divider = true, large = false) =>
  new SeparatorBuilder()
    .setDivider(divider)
    .setSpacing(large ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small);
const sub = (content) => `-# ${content}`;

/** Text + thumbnail side by side. */
function section(content, thumbnailURL) {
  const s = new SectionBuilder().addTextDisplayComponents(text(content));
  if (thumbnailURL) s.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailURL));
  return s;
}

/* ── controls ──────────────────────────────────────────────────────── */

function btn(id, label, { style = 'secondary', emoji, disabled = false } = {}) {
  const styles = {
    primary: ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success: ButtonStyle.Success,
    danger: ButtonStyle.Danger,
  };
  const b = new ButtonBuilder().setCustomId(id).setStyle(styles[style] ?? ButtonStyle.Secondary).setDisabled(disabled);
  if (label) b.setLabel(label);
  const e = parseEmoji(emoji);
  if (e) b.setEmoji(e);
  return b;
}

function link(label, url, emoji) {
  const b = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url);
  if (label) b.setLabel(label);
  const e = parseEmoji(emoji);
  if (e) b.setEmoji(e);
  return b;
}

const deleteBtn = (id = 'ui_delete') => btn(id, null, { style: 'danger', emoji: DELETE_EMOJI });

const row = (...components) => new ActionRowBuilder().addComponents(...components.flat());

/**
 * options: [{ label, value, description?, emoji?, default? }]
 */
function select(id, placeholder, options, { min, max, disabled = false } = {}) {
  const s = new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).setDisabled(disabled);
  if (min !== undefined) s.setMinValues(min);
  if (max !== undefined) s.setMaxValues(max);
  s.addOptions(options.map(o => {
    const opt = { label: String(o.label).slice(0, 100), value: String(o.value) };
    if (o.description) opt.description = String(o.description).slice(0, 100);
    const e = parseEmoji(o.emoji);
    if (e) opt.emoji = e;
    if (o.default) opt.default = true;
    return opt;
  }));
  return s;
}

/* ── ready-made replies ────────────────────────────────────────────── */

/**
 * One-line status reply. kind: success | warning | error | base
 *   notice('success', 'Saved')  →  green card, "✔ Saved"
 */
function notice(kind, message, { footer } = {}) {
  const icon = ICON[kind] ?? '';
  const c = box(kind).addTextDisplayComponents(text(`${icon ? icon + ' ' : ''}${message}`));
  if (footer) c.addTextDisplayComponents(text(sub(footer)));
  return c;
}
const success = (m, o) => notice('success', m, o);
const warn    = (m, o) => notice('warning', m, o);
const fail    = (m, o) => notice('error', m, o);
const info    = (m, o) => notice('base', m, o);

/**
 * Titled card.
 *   card({ title, lines, footer, kind, rows, thumbnail })
 * `lines` may be a string or an array (joined with newlines).
 */
function card({ title, lines, footer, kind = 'base', rows = [], thumbnail } = {}) {
  const c = box(kind);
  const body = Array.isArray(lines) ? lines.filter(Boolean).join('\n') : lines;
  const head = title ? `### ${title}` : null;
  if (thumbnail) {
    c.addSectionComponents(section([head, body].filter(Boolean).join('\n'), thumbnail));
  } else {
    if (head) c.addTextDisplayComponents(text(head));
    if (body) c.addTextDisplayComponents(text(body));
  }
  for (const r of rows) c.addActionRowComponents(r);
  if (footer) c.addTextDisplayComponents(text(sub(footer)));
  return c;
}

/**
 * Embed for places that need a real author line / footer
 * (logs, user lookups, snipes …). Grey unless an event kind is given.
 */
function embed({ kind = 'base', title, description, author, footer, thumbnail, image, fields, timestamp, url } = {}) {
  const e = new EmbedBuilder().setColor(COLOR[kind] ?? COLOR.base);
  if (title) e.setTitle(String(title).slice(0, 256));
  if (url) e.setURL(url);
  if (description) e.setDescription(String(description).slice(0, 4096));
  if (author) e.setAuthor(typeof author === 'string' ? { name: author } : author);
  if (footer) e.setFooter(typeof footer === 'string' ? { text: footer } : footer);
  if (thumbnail) e.setThumbnail(thumbnail);
  if (image) e.setImage(image);
  if (fields?.length) e.addFields(fields);
  if (timestamp) e.setTimestamp(timestamp === true ? new Date() : timestamp);
  return e;
}

/* ── sending ───────────────────────────────────────────────────────── */

const isInteraction = (t) => typeof t?.isRepliable === 'function' || typeof t?.deferReply === 'function';

/**
 * Send a components-v2 reply to a message OR an interaction.
 * Returns the sent Message.  `ephemeral` only applies to interactions.
 */
async function send(target, components, { ephemeral = false, extra = {} } = {}) {
  const list = Array.isArray(components) ? components : [components];
  let flags = MessageFlags.IsComponentsV2;
  if (isInteraction(target)) {
    if (ephemeral) flags |= MessageFlags.Ephemeral;
    const body = { components: list, flags, ...extra };
    if (target.deferred && !target.replied) return target.editReply({ components: list, ...extra, flags: MessageFlags.IsComponentsV2 });
    if (target.replied) return target.followUp(body);
    const res = await target.reply({ ...body, withResponse: true });
    return res?.resource?.message ?? target.fetchReply();
  }
  return target.reply({ components: list, flags, ...extra });
}

/** Reply with an embed (+ optional classic action rows). */
async function sendEmbed(target, embeds, { rows = [], ephemeral = false, extra = {} } = {}) {
  const list = Array.isArray(embeds) ? embeds : [embeds];
  const body = { embeds: list, components: rows, ...extra };
  if (isInteraction(target)) {
    if (ephemeral) body.flags = MessageFlags.Ephemeral;
    if (target.deferred && !target.replied) return target.editReply(body);
    if (target.replied) return target.followUp(body);
    const res = await target.reply({ ...body, withResponse: true });
    return res?.resource?.message ?? target.fetchReply();
  }
  return target.reply(body);
}

/** Quick event replies: ui.say.error(ctx, 'Missing permission') */
const say = {
  success: (t, m, o = {}) => send(t, success(m), o),
  warning: (t, m, o = {}) => send(t, warn(m), o),
  error:   (t, m, o = {}) => send(t, fail(m), { ephemeral: true, ...o }),
  info:    (t, m, o = {}) => send(t, info(m), o),
};

/* ── interaction helpers ───────────────────────────────────────────── */

/** Collector filter that lets only `userId` through; others get a private note. */
function onlyUser(userId) {
  return async (i) => {
    if (i.user.id === userId) return true;
    try { await i.reply({ components: [fail('Not your menu')], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral }); } catch (_) {}
    return false;
  };
}

/** Confirm / cancel buttons (ids `${id}_yes` / `${id}_no`). */
const confirmRow = (id, { yes = 'Confirm', no = 'Cancel', danger = false } = {}) =>
  row(btn(`${id}_yes`, yes, { style: danger ? 'danger' : 'success' }), btn(`${id}_no`, no));

module.exports = {
  COLOR, ICON, DELETE_EMOJI, emojis,
  parseEmoji,
  box, text, sep, sub, section,
  btn, link, deleteBtn, row, select, confirmRow,
  notice, success, warn, fail, info, card, embed,
  send, sendEmbed, say, onlyUser,
};
