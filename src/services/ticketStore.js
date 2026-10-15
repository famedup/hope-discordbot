// dev: cashholy (carti) | module: ticketStore

// hope — tickets: settings, variables and small helpers shared by the setup UI,
// the interaction handler, the runtime and the automation sweeper.

const { TicketPanel, Ticket } = require('../database/schemas');

/* ── settings ───────────────────────────────────────────────────────── */

const DEFAULTS = Object.freeze({
  // access
  supportRoleIds: [], allowedRoleIds: [], blockedRoleIds: [],
  // channels
  logChannelId: null, categoryId: null, closedCategoryId: null,
  // behaviour
  maxOpen: 1, deleteDelayMs: 0, autoPin: false, claims: true, pingStaff: true,
  // appearance
  embedName: null,
  title: 'Support', description: 'Need help? Open a ticket and our team will get back to you.',
  color: '5865F2', image: null, thumbnail: null,
  placeholder: 'Choose a ticket type…', buttonLabel: 'Open ticket', buttonEmoji: null, buttonStyle: 'primary',
  layout: 'auto', nameFormat: 'ticket-{ticket.id}',
  // automation
  inactivityWarnMs: 0, autoCloseMs: 0, autoDeleteMs: 0, askRating: false, cooldownMs: 0, autoAssign: 'off',
  // messages
  greeting: null, closeMessage: null, limitMessage: null,
  // ticket types, [{ id, name, emoji, description, categoryId }]
  options: [],
  // unsaved picks on the basics card: { panelChannelId, supportRoleIds, categoryId }
  draft: null,
});

const MAX_OPTIONS = 10;
const settingsOf = (panel) => ({ ...DEFAULTS, ...(panel.data || {}) });

async function savePanel(panel, patch = {}, columns = {}) {
  panel.data = { ...(panel.data || {}), ...patch };
  panel.changed('data', true);
  Object.assign(panel, columns);
  await panel.save();
  return panel;
}

/* ── panels ─────────────────────────────────────────────────────────── */

const listPanels = (guildId) => TicketPanel.findAll({ where: { guildId }, order: [['id', 'ASC']] });
const getPanel = (id) => TicketPanel.findByPk(id);
const findPanelByName = (guildId, name) => TicketPanel.findOne({ where: { guildId, name: String(name).toLowerCase() } });

const cleanName = (input) => String(input || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);

async function createPanel(guildId, name) {
  return TicketPanel.create({ guildId, name: cleanName(name) || 'support', data: {} });
}

async function nextCase(panel) {
  await TicketPanel.increment({ caseCounter: 1 }, { where: { id: panel.id } });
  await panel.reload();
  return panel.caseCounter;
}

/* ── durations ──────────────────────────────────────────────────────── */

const UNIT = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
const MAX_DURATION = 30 * UNIT.d;

/** "30m", "2d", "1h30m", "off" → ms (0 = off). Returns null when the text isn't a duration. */
function parseDuration(input) {
  const text = String(input ?? '').trim().toLowerCase();
  if (!text || ['off', 'none', 'disable', 'disabled', 'no', '0'].includes(text)) return 0;
  const parts = [...text.matchAll(/(\d+)\s*([smhdw])/g)];
  if (!parts.length || parts.map(p => p[0]).join('').replace(/\s+/g, '') !== text.replace(/\s+/g, '')) return null;
  const total = parts.reduce((sum, [, n, u]) => sum + Number(n) * UNIT[u], 0);
  return total > MAX_DURATION ? null : total;
}

function formatDuration(ms, zero = 'Off') {
  if (!ms) return zero;
  const out = [];
  let left = Math.floor(ms / 1000);
  for (const [label, size] of [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]]) {
    const n = Math.floor(left / size);
    if (n) { out.push(`${n}${label}`); left -= n * size; }
  }
  return out.join(' ');
}

/* ── variables ──────────────────────────────────────────────────────── */

const pad = (n) => String(n ?? 0).padStart(4, '0');
const ts = (d) => `<t:${Math.floor(new Date(d).getTime() / 1000)}:R>`;

/** Ticket-specific {tags}. They work anywhere the embed variables do, plus {embed:name} messages. */
function ticketVars({ ticket, panel, user, staff, channel, open, max, reason } = {}) {
  const v = {};
  if (panel) v.panel = panel.name;
  if (ticket) {
    const number = ticket.caseNumber ?? ticket.id;
    Object.assign(v, {
      'ticket.id': pad(number), 'ticket.number': String(number),
      'ticket.option': ticket.categoryName, 'ticket.category': ticket.categoryName,
      'ticket.opener': `<@${ticket.userId}>`,
      'ticket.claimed': ticket.claimedBy ? `<@${ticket.claimedBy}>` : 'Unclaimed',
      'ticket.reason': reason ?? ticket.reason ?? 'No reason given',
      'ticket.created': ts(ticket.createdAt),
      'ticket.closed': ticket.closedAt ? ts(ticket.closedAt) : 'Not closed',
    });
  }
  if (channel) v.ticket = `<#${channel.id}>`;
  if (staff) v.staff = `<@${staff.id ?? staff}>`;
  if (open != null) v.open = String(open);
  if (max != null) v.max = String(max);
  if (user) v['user.name'] = user.username;
  return v;
}

const TICKET_VARIABLES = [
  ['{ticket}', 'Mention of the ticket channel'],
  ['{ticket.id}', 'Case number, padded (0042)'],
  ['{ticket.number}', 'Case number (42)'],
  ['{ticket.option}', 'Ticket type the member picked'],
  ['{ticket.opener}', 'Mention of whoever opened it'],
  ['{ticket.claimed}', 'Who claimed it, or Unclaimed'],
  ['{ticket.reason}', 'Close reason'],
  ['{ticket.created}', 'When it was opened'],
  ['{ticket.closed}', 'When it was closed'],
  ['{staff}', 'Staff member who did the action'],
  ['{panel}', 'Panel name'],
  ['{open}', 'Tickets the member has open'],
  ['{max}', 'Most tickets a member may have open'],
];

/** Context for applyVars / renderEmbed: the usual {user} {server} … plus the ticket tags. */
const varCtx = (base, extra) => ({ ...base, vars: ticketVars(extra) });

/** Turn a name format into a valid channel name. */
function channelName(format, vars) {
  const text = String(format || DEFAULTS.nameFormat).replace(/\{([a-z.]+)\}/gi, (m, k) => vars[k.toLowerCase()] ?? '');
  const name = text.toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
  return name || 'ticket';
}

const NAME_PRESETS = [
  { value: 'ticket-{ticket.id}', label: 'Case number', sample: 'ticket-0001' },
  { value: '{user.name}-ticket', label: 'Who opened it', sample: 'someone-ticket' },
  { value: '{ticket.option}-{ticket.id}', label: 'Option and case number', sample: 'support-0001' },
];

/* ── people & permissions ───────────────────────────────────────────── */

const isStaff = (member, s) =>
  Boolean(member?.permissions?.has('Administrator') || s.supportRoleIds.some(id => member?.roles?.cache?.has(id)));

/** Who may open a ticket here? Returns { ok: true } or { ok: false, why }. */
function canOpen(member, s) {
  if (s.blockedRoleIds.some(id => member.roles.cache.has(id))) return { ok: false, why: 'blocked' };
  if (s.allowedRoleIds.length && !s.allowedRoleIds.some(id => member.roles.cache.has(id))) return { ok: false, why: 'notAllowed' };
  return { ok: true };
}

const openCount = (guildId, userId, panelId) =>
  Ticket.count({ where: { guildId, userId, status: 'open', ...(panelId ? { panelId } : {}) } });

/** Snowflake → ms timestamp (for channel.lastMessageId). */
const snowflakeTime = (id) => (/^\d{5,}$/.test(String(id ?? '')) ? Number((BigInt(id) >> 22n) + 1420070400000n) : 0);

const hexToInt = (hex, fallback = 0x5865F2) => {
  const n = parseInt(String(hex || '').replace(/^#/, ''), 16);
  return Number.isFinite(n) && n >= 0 && n <= 0xFFFFFF ? n : fallback;
};
const validHex = (hex) => /^#?[0-9a-f]{6}$/i.test(String(hex || '').trim());
const validUrl = (u) => /^https?:\/\/\S+$/i.test(String(u || '').trim());
const newOptionId = () => Math.random().toString(36).slice(2, 8);

module.exports = {
  DEFAULTS, MAX_OPTIONS, settingsOf, savePanel,
  listPanels, getPanel, findPanelByName, createPanel, cleanName, nextCase,
  parseDuration, formatDuration,
  ticketVars, varCtx, TICKET_VARIABLES, channelName, NAME_PRESETS, pad,
  isStaff, canOpen, openCount, snowflakeTime,
  hexToInt, validHex, validUrl, newOptionId,
};
