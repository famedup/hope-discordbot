// @cashholy(carti) — afkTools

// hope — AFK helpers shared by the commands and the message listener.

const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

/** Lookup caches used by events/messageCreate.js; entries are { val, ts }. */
const afkMentionCache = new Map();
const afkAuthorCache = new Map();
const bust = (guildId, userId) => {
  afkMentionCache.delete(`${guildId}:${userId}`);
  afkAuthorCache.delete(`${guildId}:${userId}`);
};

const DEFAULT_REASON = 'AFK';
const NOTICE_TTL = 8000; // "welcome back" disappears after this long

/** No accent colour, a single line. */
const line = (content) => new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
const body = (container) => ({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { parse: [] } });

const setMessage = (userId, reason) => line(`<@${userId}>: You're now AFK with the status: **${reason}**`);
const updatedMessage = (userId, reason) => line(`<@${userId}>: Your AFK status is now: **${reason}**`);
const welcomeBack = (userId) => line(`Welcome back <@${userId}>, your AFK has been removed.`);

/** Reason is optional; links to invites are not allowed. Returns { ok, reason|error }. */
function cleanReason(raw) {
  const reason = String(raw ?? '').trim().slice(0, 200) || DEFAULT_REASON;
  if (/discord\.gg\/|discord(app)?\.com\/invite/i.test(reason)) return { ok: false, error: 'No invite links in an AFK status' };
  return { ok: true, reason };
}

/** Create or update the AFK row. Returns { updated }. */
async function setAfk({ guildId, userId, reason, dm = false }) {
  const { AFK } = require('../database/schemas');
  const row = await AFK.findOne({ where: { guildId, userId } });
  bust(guildId, userId);
  if (row) { await row.update({ reason, dm }); return { updated: true }; }
  await AFK.create({ guildId, userId, reason, time: Date.now(), dm });
  return { updated: false };
}

module.exports = { afkMentionCache, afkAuthorCache, bust, NOTICE_TTL, DEFAULT_REASON, line, body, setMessage, updatedMessage, welcomeBack, cleanReason, setAfk };
