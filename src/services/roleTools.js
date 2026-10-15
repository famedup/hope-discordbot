/*
 * Developed by cashholy (carti)
 * File: services/roleTools.js
 */

// hope — shared helpers for the role commands (buttonrole, massrole, roleicon)
//
// Every message these commands send uses NO_PING so a role (or user) mention
// inside a container is displayed but never notifies anyone.

const ui = require('./ui');

const NO_PING = Object.freeze({ parse: [], roles: [], users: [], repliedUser: false });
const EXTRA = Object.freeze({ allowedMentions: NO_PING });

/** Send a V2 container to a message/interaction without pinging. */
const send = (target, components, opts = {}) =>
  ui.send(target, components, { ...opts, extra: { allowedMentions: NO_PING, ...(opts.extra || {}) } });

const ok   = (t, m, o) => send(t, ui.success(m), o);
const bad  = (t, m, o) => send(t, ui.fail(m), o);
const warn = (t, m, o) => send(t, ui.warn(m), o);

/** `<@&id>` | raw id | exact / partial role name → Role (or null). */
function findRole(guild, input) {
  if (!input) return null;
  const m = String(input).match(/^<@&(\d+)>$/) || String(input).match(/^(\d{15,22})$/);
  if (m) return guild.roles.cache.get(m[1]) || null;
  const q = String(input).toLowerCase().replace(/^@/, '');
  return guild.roles.cache.find(r => r.name.toLowerCase() === q)
      || guild.roles.cache.find(r => r.name.toLowerCase().includes(q))
      || null;
}

/** `<#id>` | raw id → channel (or null). */
function findChannel(guild, input) {
  const m = String(input || '').match(/^<#(\d+)>$/) || String(input || '').match(/^(\d{15,22})$/);
  return m ? guild.channels.cache.get(m[1]) || null : null;
}

/**
 * Why `member` (a moderator) and the bot can't hand out `role`.
 * Returns an error string, or null when fine.
 */
function roleBlocked(guild, member, role) {
  if (!role) return 'Role not found';
  if (role.id === guild.id) return 'Can\'t use @everyone';
  if (role.managed) return 'That role is managed by an integration';
  const me = guild.members.me;
  if (!me?.permissions.has('ManageRoles')) return 'I\'m missing **Manage Roles**';
  if (role.position >= me.roles.highest.position) return 'That role is above my highest role';
  if (member && guild.ownerId !== member.id && role.position >= member.roles.highest.position)
    return 'That role is above your highest role';
  return null;
}

/** Emoji token → { unicode } | { custom: {id,name,animated,url} } | null. */
function parseEmojiToken(token) {
  if (!token) return null;
  const c = String(token).match(/^<(a?):(\w+):(\d+)>$/);
  if (c) {
    return { custom: { id: c[3], name: c[2], animated: !!c[1], url: `https://cdn.discordapp.com/emojis/${c[3]}.${c[1] ? 'gif' : 'png'}?size=128` } };
  }
  if (/\p{Extended_Pictographic}|\p{Regional_Indicator}|^[0-9#*]️?⃣$/u.test(token)) return { unicode: token };
  return null;
}

/**
 * `https://discord.com/channels/<guild>/<channel>/<message>` or a bare message id
 * (looked up in `fallbackChannel`) → Message, or null.
 */
async function resolveMessage(guild, token, fallbackChannel) {
  const link = String(token || '').match(/channels\/(\d+)\/(\d+)\/(\d+)/);
  try {
    if (link) {
      if (link[1] !== guild.id) return null;
      const ch = guild.channels.cache.get(link[2]);
      return ch?.isTextBased() ? await ch.messages.fetch(link[3]) : null;
    }
    if (/^\d{15,22}$/.test(String(token || ''))) return await fallbackChannel.messages.fetch(token);
  } catch (_) { /* unknown message */ }
  return null;
}

module.exports = { resolveMessage, NO_PING, EXTRA, send, ok, bad, warn, findRole, findChannel, roleBlocked, parseEmojiToken };
