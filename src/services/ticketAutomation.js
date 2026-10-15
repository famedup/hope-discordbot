/* ⌁ crafted by cashholy (carti) ⌁ */

// hope — ticket automation: inactivity warnings, auto-close, auto-delete and
// scheduled deletes. One sweep a minute; it needs no message listener because a
// text channel already knows the time of its last message (channel.lastMessageId).

const { Op } = require('sequelize');
const ui = require('./ui');
const store = require('./ticketStore');
const runtime = require('./ticketRuntime');
const { Ticket } = require('../database/schemas');

const SWEEP_MS = 60 * 1000;
let timer = null;

const time = (d) => (d ? new Date(d).getTime() : 0);

async function sweepOpen(client, panels) {
  const open = await Ticket.findAll({ where: { status: 'open', panelId: { [Op.ne]: null } } });
  for (const ticket of open) {
    try {
      const guild = client.guilds.cache.get(ticket.guildId);
      if (!guild) continue;
      const channel = guild.channels.cache.get(ticket.channelId);
      if (!channel) { ticket.status = 'deleted'; await ticket.save(); continue; }

      if (!panels.has(ticket.panelId)) panels.set(ticket.panelId, await runtime.panelFor(ticket, guild));
      const panel = panels.get(ticket.panelId);
      const s = store.settingsOf(panel);
      if (!s.inactivityWarnMs && !s.autoCloseMs) continue;

      // when did anyone last speak? Our own warning does not count as activity.
      const base = time(ticket.lastActivityAt) || time(ticket.createdAt);
      const lastMsg = store.snowflakeTime(channel.lastMessageId);
      let activity = Math.max(base, lastMsg);
      if (ticket.warnMessageId && channel.lastMessageId === ticket.warnMessageId) activity = base;
      else if (ticket.warnedAt && lastMsg > time(ticket.warnedAt)) {
        // someone answered after the warning: start counting again
        ticket.warnedAt = null; ticket.warnMessageId = null; ticket.lastActivityAt = new Date(lastMsg);
        await ticket.save();
      }

      const idle = Date.now() - activity;

      if (s.autoCloseMs && idle >= s.autoCloseMs) {
        await runtime.closeTicket({ guild, channel, ticket, panel, s, closer: null, reason: 'No activity', auto: true });
        continue;
      }

      if (s.inactivityWarnMs && idle >= s.inactivityWarnMs && !ticket.warnedAt) {
        const closes = s.autoCloseMs ? ` It will close automatically in **${store.formatDuration(Math.max(60000, s.autoCloseMs - idle))}** if nobody replies.` : '';
        const card = ui.box('warning').addTextDisplayComponents(ui.text(
          `## Still there?\n<@${ticket.userId}>, this ticket has been quiet for **${store.formatDuration(Math.max(60000, Math.floor(idle / 60000) * 60000))}**.${closes}`));
        const sent = await channel.send({ components: [card], flags: require('discord.js').MessageFlags.IsComponentsV2, allowedMentions: { users: [ticket.userId] } }).catch(() => null);
        ticket.lastActivityAt = new Date(activity);
        ticket.warnedAt = new Date();
        ticket.warnMessageId = sent?.id ?? null;
        await ticket.save();
      }
    } catch (err) {
      console.error('[tickets] sweep (open)', err.message);
    }
  }
}

async function sweepDeletes(client, panels) {
  const due = await Ticket.findAll({ where: { status: { [Op.in]: ['open', 'closed'] }, deleteAt: { [Op.ne]: null, [Op.lte]: new Date() } } });
  for (const ticket of due) {
    try {
      const guild = client.guilds.cache.get(ticket.guildId);
      const channel = guild?.channels.cache.get(ticket.channelId);
      if (!guild || !channel) { ticket.status = 'deleted'; await ticket.save(); continue; }
      if (!panels.has(ticket.panelId ?? `l${ticket.guildId}`)) panels.set(ticket.panelId ?? `l${ticket.guildId}`, await runtime.panelFor(ticket, guild));
      const s = store.settingsOf(panels.get(ticket.panelId ?? `l${ticket.guildId}`));
      await runtime.deleteTicket({ guild, channel, ticket, s, by: null, immediate: true });
    } catch (err) {
      console.error('[tickets] sweep (delete)', err.message);
    }
  }
}

async function sweep(client) {
  const panels = new Map();
  await sweepOpen(client, panels);
  await sweepDeletes(client, panels);
}

function start(client) {
  if (timer) return;
  timer = setInterval(() => sweep(client).catch(err => console.error('[tickets] sweep', err.message)), SWEEP_MS);
  timer.unref?.();
}

module.exports = { start, sweep };
