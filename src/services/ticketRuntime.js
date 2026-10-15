// ─── cashholy (carti) · developer ───

// hope — ticket lifecycle. Used by the button handler, the /ticket commands and the
// automation sweeper, so closing from a button, a command or a timer all behave the same.

const { ChannelType, PermissionFlagsBits: P, MessageFlags } = require('discord.js');
const ui = require('./ui');
const emojis = require('../media/emojis.json');
const store = require('./ticketStore');
const { findEmbed, TAG_RE } = require('./embedSend');
const { renderEmbed } = require('./embedRender');
const { applyVars } = require('./embedVars');
const { logTicketEvent, generateAndSendTranscript } = require('./ticketUtils');
const { Ticket, TicketPanel, TicketConfig } = require('../database/schemas');

const V2 = MessageFlags.IsComponentsV2;
const EPHEMERAL = MessageFlags.Ephemeral;
const tid = (...p) => ['tk', 't', ...p].join(':');
const ratingId = (ticketId, n) => `tk:r:${ticketId}:${n}`;

/* ── lookups ────────────────────────────────────────────────────────── */

/** The panel a ticket belongs to. Tickets from before panels existed get a read-only stand-in. */
async function panelFor(ticket, guild) {
  if (ticket.panelId) {
    const panel = await TicketPanel.findByPk(ticket.panelId);
    if (panel) return panel;
  }
  const legacy = await TicketConfig.findOne({ where: { guildId: guild.id } }).catch(() => null);
  let extra = [];
  try { extra = JSON.parse(legacy?.additionalRoleIds || '[]'); } catch { /* ignore */ }
  return {
    id: null, name: 'support', guildId: guild.id, caseCounter: 0, legacy: true,
    data: { supportRoleIds: [legacy?.supportRoleId, ...extra].filter(Boolean), logChannelId: legacy?.logChannelId || null },
  };
}

async function ticketOf(channel) {
  const ticket = await Ticket.findOne({ where: { channelId: channel.id } });
  if (!ticket) return null;
  const panel = await panelFor(ticket, channel.guild);
  return { ticket, panel, s: store.settingsOf(panel) };
}

/* ── templates: text, {variables} and {embed:name} ──────────────────── */

async function ctxFor({ guild, ticket, panel, channel, user, staff, reason, open, max }) {
  const member = user ? await guild.members.fetch(user.id ?? user).catch(() => null) : null;
  const u = member?.user ?? (typeof user === 'object' ? user : null);
  return { guild, user: u, member, channel, vars: store.ticketVars({ ticket, panel, user: u, staff, channel, reason, open, max }) };
}

/**
 * Turn a message template into a send payload. `rows` are appended (the ticket
 * controls); `lead` is a line put first (e.g. the ping).
 */
async function renderTemplate(guild, text, ctx, { rows = [], lead = '' } = {}) {
  const tag = String(text || '').match(TAG_RE);
  const rest = applyVars(String(text || '').replace(TAG_RE, ''), ctx).trim();
  const content = [lead, rest].filter(Boolean).join('\n').slice(0, 2000);

  if (tag) {
    const saved = await findEmbed(guild.id, tag[1]);
    const rendered = saved ? renderEmbed(saved, ctx, { content }) : null;
    if (rendered) return { ...rendered, components: [...(rendered.components || []).slice(0, 5 - rows.length), ...rows] };
  }
  return { ...(content ? { content } : {}), components: rows };
}

/* ── cards in the ticket channel ────────────────────────────────────── */

const controlRow = (s, ticket) => ui.row(
  ui.btn(tid('close'), 'Close', { style: 'danger', emoji: emojis.j2c_lock }),
  ...(s.claims ? [ui.btn(tid('claim'), ticket.claimedBy ? 'Claimed' : 'Claim', { emoji: emojis.j2c_claim, disabled: Boolean(ticket.claimedBy) })] : []),
);

const closedRow = () => ui.row(
  ui.btn(tid('reopen'), 'Reopen', { style: 'success' }),
  ui.btn(tid('transcript'), 'Transcript'),
  ui.btn(tid('delete'), 'Delete', { style: 'danger' }),
);

function defaultGreeting({ ticket, panel, s, opener, lead }) {
  const number = store.pad(ticket.caseNumber ?? ticket.id);
  const c = ui.box();
  c.addTextDisplayComponents(ui.text([
    lead,
    `## Ticket ${number}${ticket.categoryName && ticket.categoryName !== panel.name ? ` · ${ticket.categoryName}` : ''}`,
    `Welcome <@${opener.id}>. Tell us what you need and the team will be with you shortly.`,
    ui.sub(`Opened <t:${Math.floor(new Date(ticket.createdAt || Date.now()).getTime() / 1000)}:R>${ticket.claimedBy ? ` · Assigned to <@${ticket.claimedBy}>` : ''}`),
  ].filter(Boolean).join('\n')));
  c.addSeparatorComponents(ui.sep(false));
  c.addActionRowComponents(controlRow(s, ticket));
  return { components: [c], flags: V2 };
}

function defaultClosed({ ticket, closer, reason, auto }) {
  const c = ui.box('error');
  c.addTextDisplayComponents(ui.text([
    '## Ticket closed',
    reason ? `**Reason** · ${reason}` : null,
    ui.sub(`${auto ? 'Closed automatically' : `Closed by <@${closer.id}>`} <t:${Math.floor(Date.now() / 1000)}:R>`),
  ].filter(Boolean).join('\n')));
  c.addSeparatorComponents(ui.sep(false));
  c.addActionRowComponents(closedRow());
  return { components: [c], flags: V2 };
}

const note = (text) => ({ components: [ui.info(text)], flags: V2, allowedMentions: { parse: [] } });

/* ── opening ────────────────────────────────────────────────────────── */

const reply = (i, container) => i.editReply({ components: [container], flags: V2 });

/** Staff to auto-assign, from the support roles that are cached. */
async function pickStaff(guild, s, mode) {
  const pool = new Map();
  for (const rid of s.supportRoleIds) for (const [mid, m] of guild.roles.cache.get(rid)?.members ?? []) if (!m.user.bot) pool.set(mid, m);
  const ids = [...pool.keys()];
  if (!ids.length) return null;
  if (mode === 'random') return ids[Math.floor(Math.random() * ids.length)];
  let best = null; let bestCount = Infinity;
  for (const mid of ids) {
    const n = await Ticket.count({ where: { guildId: guild.id, claimedBy: mid, status: 'open' } });
    if (n < bestCount) { best = mid; bestCount = n; }
  }
  return best;
}

async function openTicket(interaction, panel, optionId) {
  const { guild, user, member, client } = interaction;
  const s = store.settingsOf(panel);
  await interaction.deferReply({ flags: EPHEMERAL });

  if (!s.supportRoleIds.length || !panel.panelChannelId) return reply(interaction, ui.fail('This panel isn\'t finished yet. Ask an admin to complete the setup.'));

  const gate = store.canOpen(member, s);
  if (!gate.ok) return reply(interaction, ui.fail(gate.why === 'blocked' ? 'You can\'t open tickets here.' : 'You need a specific role to open tickets here.'));

  const option = s.options.find(o => o.id === optionId) ?? s.options[0] ?? null;
  const optionName = option?.name ?? panel.name;

  // cooldown
  if (s.cooldownMs) {
    const last = await Ticket.findOne({ where: { guildId: guild.id, userId: user.id, panelId: panel.id }, order: [['createdAt', 'DESC']] });
    const wait = last ? new Date(last.createdAt).getTime() + s.cooldownMs - Date.now() : 0;
    if (wait > 0) return reply(interaction, ui.warn(`Please wait **${store.formatDuration(Math.ceil(wait / 1000) * 1000)}** before opening another ticket.`));
  }

  // limit
  const open = await store.openCount(guild.id, user.id, panel.id);
  if (open >= s.maxOpen) {
    const mine = await Ticket.findAll({ where: { guildId: guild.id, userId: user.id, panelId: panel.id, status: 'open' }, limit: 5 });
    if (s.limitMessage) {
      const ctx = await ctxFor({ guild, panel, user, open, max: s.maxOpen });
      const payload = await renderTemplate(guild, s.limitMessage, ctx);
      return interaction.editReply({ ...payload, flags: payload.embeds || payload.content ? undefined : V2 });
    }
    return reply(interaction, ui.warn(`You already have **${open}/${s.maxOpen}** open ${open === 1 ? 'ticket' : 'tickets'}: ${mine.map(t => `<#${t.channelId}>`).join(' ')}`));
  }

  // create the channel
  const caseNumber = await store.nextCase(panel);
  const draftTicket = { caseNumber, categoryName: optionName, userId: user.id };
  const name = store.channelName(s.nameFormat, store.ticketVars({ ticket: draftTicket, user }));
  const parent = [option?.categoryId, s.categoryId].find(cid => cid && guild.channels.cache.has(cid)) ?? undefined;
  const allow = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];

  let channel;
  try {
    channel = await guild.channels.create({
      name, type: ChannelType.GuildText, parent, reason: `Ticket ${store.pad(caseNumber)} opened by ${user.tag}`,
      topic: `Ticket ${store.pad(caseNumber)} · ${optionName} · opened by ${user.tag}`,
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [P.ViewChannel] },
        { id: user.id, allow },
        ...s.supportRoleIds.filter(r => guild.roles.cache.has(r)).map(id => ({ id, allow: [...allow, P.ManageMessages] })),
        { id: client.user.id, allow: [...allow, P.ManageChannels, P.ManageMessages] },
      ],
    });
  } catch (err) {
    console.error('[tickets] create channel', err.message);
    return reply(interaction, ui.fail('I couldn\'t create the ticket channel. Ask an admin to check my Manage Channels permission.'));
  }

  const ticket = await Ticket.create({
    guildId: guild.id, channelId: channel.id, userId: user.id, categoryName: optionName,
    panelId: panel.id ?? null, caseNumber, lastActivityAt: new Date(), status: 'open',
  });

  // auto-assign
  if (s.autoAssign !== 'off' && s.claims) {
    const staffId = await pickStaff(guild, s, s.autoAssign).catch(() => null);
    if (staffId) { ticket.claimedBy = staffId; await ticket.save(); }
  }

  // greeting
  const pings = [`<@${user.id}>`, ...(s.pingStaff ? s.supportRoleIds.map(r => `<@&${r}>`) : []), ...(ticket.claimedBy ? [`<@${ticket.claimedBy}>`] : [])];
  const lead = [...new Set(pings)].join(' ');
  const allowedMentions = { users: [user.id, ...(ticket.claimedBy ? [ticket.claimedBy] : [])], roles: s.pingStaff ? s.supportRoleIds : [] };
  let payload;
  if (s.greeting) {
    const ctx = await ctxFor({ guild, ticket, panel, channel, user, open: open + 1, max: s.maxOpen });
    payload = await renderTemplate(guild, s.greeting, ctx, { rows: [controlRow(s, ticket)], lead });
  } else {
    payload = defaultGreeting({ ticket, panel, s, opener: user, lead });
  }
  try {
    const sent = await channel.send({ ...payload, allowedMentions });
    if (s.autoPin) await sent.pin().catch(() => {});
  } catch (err) {
    console.error('[tickets] greeting', err.message);
  }

  await logTicketEvent(guild, { logChannelId: s.logChannelId }, 'Ticket Opened',
    `**Ticket** ${channel} (${store.pad(caseNumber)})\n**Type** ${optionName}\n**Opened by** ${user}${ticket.claimedBy ? `\n**Assigned to** <@${ticket.claimedBy}>` : ''}`);

  return reply(interaction, ui.success(`Your ticket is ready: ${channel}`));
}

/* ── closing, reopening, deleting ───────────────────────────────────── */

async function closeTicket({ guild, channel, ticket, panel, s, closer, reason, auto = false }) {
  if (ticket.status !== 'open') return false;
  const now = new Date();
  ticket.status = 'closed';
  ticket.closedAt = now;
  ticket.reason = reason || null;
  ticket.deleteAt = s.autoDeleteMs ? new Date(now.getTime() + s.autoDeleteMs) : null;
  await ticket.save();

  await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => {});
  if (s.closedCategoryId && guild.channels.cache.has(s.closedCategoryId)) await channel.setParent(s.closedCategoryId, { lockPermissions: false }).catch(() => {});

  let payload;
  if (s.closeMessage) {
    const ctx = await ctxFor({ guild, ticket, panel, channel, user: ticket.userId, staff: closer, reason });
    payload = await renderTemplate(guild, s.closeMessage, ctx, { rows: [closedRow()] });
  } else {
    payload = defaultClosed({ ticket, closer: closer ?? { id: guild.client.user.id }, reason, auto });
  }
  await channel.send({ ...payload, allowedMentions: { parse: [] } }).catch(() => {});

  if (s.askRating) {
    const card = ui.box();
    card.addTextDisplayComponents(ui.text(`## How was your support?\n${ui.sub(`<@${ticket.userId}>, tap a star. It helps the team improve.`)}`));
    card.addActionRowComponents(ui.row([1, 2, 3, 4, 5].map(n => ui.btn(ratingId(ticket.id, n), String(n), { emoji: '⭐' }))));
    await channel.send({ components: [card], flags: V2, allowedMentions: { users: [ticket.userId] } }).catch(() => {});
  }

  if (s.autoDeleteMs) await channel.send(note(`This ticket will be deleted <t:${Math.floor(ticket.deleteAt.getTime() / 1000)}:R>.`)).catch(() => {});

  await generateAndSendTranscript(guild, { logChannelId: s.logChannelId }, ticket, guild.client);
  await logTicketEvent(guild, { logChannelId: s.logChannelId }, 'Ticket Closed',
    `**Ticket** ${channel} (${store.pad(ticket.caseNumber ?? ticket.id)})\n**Closed by** ${auto ? 'automation (inactivity)' : `<@${closer.id}>`}${reason ? `\n**Reason** ${reason}` : ''}`);
  return true;
}

async function reopenTicket({ guild, channel, ticket, panel, s, by }) {
  if (ticket.status !== 'closed') return false;
  ticket.status = 'open';
  ticket.closedAt = null; ticket.deleteAt = null; ticket.warnedAt = null; ticket.warnMessageId = null;
  ticket.lastActivityAt = new Date();
  await ticket.save();

  await channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: true, SendMessages: true }).catch(() => {});
  if (s.closedCategoryId && channel.parentId === s.closedCategoryId) {
    const option = s.options.find(o => o.name === ticket.categoryName);
    const parent = [option?.categoryId, s.categoryId].find(cid => cid && guild.channels.cache.has(cid)) ?? null;
    await channel.setParent(parent, { lockPermissions: false }).catch(() => {});
  }
  await channel.send(note(`Ticket reopened by <@${by.id}>.`)).catch(() => {});
  await logTicketEvent(guild, { logChannelId: s.logChannelId }, 'Ticket Reopened', `**Ticket** ${channel}\n**Reopened by** <@${by.id}>`);
  return true;
}

/** Delete now, or after the panel's delete delay. Returns 'deleted' | 'scheduled'. */
async function deleteTicket({ guild, channel, ticket, s, by, immediate = false }) {
  if (!immediate && s.deleteDelayMs > 0 && !ticket.deleteAt) {
    ticket.deleteAt = new Date(Date.now() + s.deleteDelayMs);
    await ticket.save();
    await channel.send(note(`This ticket will be deleted <t:${Math.floor(ticket.deleteAt.getTime() / 1000)}:R>${by ? ` (requested by <@${by.id}>)` : ''}.`)).catch(() => {});
    return 'scheduled';
  }
  if (ticket.status === 'open') await generateAndSendTranscript(guild, { logChannelId: s.logChannelId }, ticket, guild.client);
  ticket.status = 'deleted';
  await ticket.save();
  await logTicketEvent(guild, { logChannelId: s.logChannelId }, 'Ticket Deleted',
    `**Ticket** ${store.pad(ticket.caseNumber ?? ticket.id)} (${ticket.categoryName})${by ? `\n**Deleted by** <@${by.id}>` : '\n**Deleted by** automation'}`);
  await channel.delete(`Ticket deleted${by ? ` by ${by.tag}` : ' automatically'}`).catch(() => {});
  return 'deleted';
}

/* ── claims, transfers, ratings ─────────────────────────────────────── */

async function claimTicket({ channel, ticket, s, staff }) {
  if (!s.claims) return { ok: false, why: 'Claims are turned off for this panel.' };
  if (ticket.claimedBy) return { ok: false, why: ticket.claimedBy === staff.id ? 'You already claimed this ticket.' : `Already claimed by <@${ticket.claimedBy}>.` };
  ticket.claimedBy = staff.id;
  await ticket.save();
  await channel.send(note(`<@${staff.id}> claimed this ticket.`)).catch(() => {});
  return { ok: true };
}

async function unclaimTicket({ channel, ticket, staff }) {
  if (!ticket.claimedBy) return { ok: false, why: 'This ticket isn\'t claimed.' };
  ticket.claimedBy = null;
  await ticket.save();
  await channel.send(note(`<@${staff.id}> released this ticket.`)).catch(() => {});
  return { ok: true };
}

async function transferTicket({ channel, ticket, from, to }) {
  ticket.claimedBy = to.id;
  await ticket.save();
  await channel.send(note(`<@${from.id}> transferred this ticket to <@${to.id}>.`)).catch(() => {});
}

async function rateTicket(interaction, ticketId, stars) {
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) return interaction.reply({ components: [ui.fail('That ticket no longer exists.')], flags: V2 | EPHEMERAL });
  if (interaction.user.id !== ticket.userId) return interaction.reply({ components: [ui.info('Only the member who opened the ticket can rate it.')], flags: V2 | EPHEMERAL });
  if (ticket.rating) return interaction.reply({ components: [ui.info('You already rated this ticket. Thank you!')], flags: V2 | EPHEMERAL });

  ticket.rating = stars;
  await ticket.save();
  const card = ui.box('success').addTextDisplayComponents(ui.text(`## Thank you\n${'⭐'.repeat(stars)}\n${ui.sub(`You rated this ticket ${stars}/5.`)}`));
  await interaction.update({ components: [card], flags: V2 });

  const panel = await panelFor(ticket, interaction.guild);
  const s = store.settingsOf(panel);
  await logTicketEvent(interaction.guild, { logChannelId: s.logChannelId }, 'Ticket Rated',
    `**Ticket** <#${ticket.channelId}> (${store.pad(ticket.caseNumber ?? ticket.id)})\n**Rating** ${'⭐'.repeat(stars)} (${stars}/5)\n**Member** <@${ticket.userId}>${ticket.claimedBy ? `\n**Handled by** <@${ticket.claimedBy}>` : ''}`);
}

module.exports = {
  tid, ratingId, panelFor, ticketOf, renderTemplate, ctxFor, controlRow, defaultGreeting,
  openTicket, closeTicket, reopenTicket, deleteTicket,
  claimTicket, unclaimTicket, transferTicket, rateTicket,
  note,
};
