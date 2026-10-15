/**
 * ┌ cashholy (carti)
 * └ services/presence.js
 */

// hope — rotating presence (listening / watching / custom).
//
// Edit `STATUS.activities` in src/settings/index.js. Tokens:
//   {prefix} {servers} {users} {commands} {name}

const { ActivityType } = require('discord.js');
const config = require('../settings');

const TYPES = {
  listening: ActivityType.Listening,
  watching:  ActivityType.Watching,
  custom:    ActivityType.Custom,
  playing:   ActivityType.Playing,
  competing: ActivityType.Competing,
};

const FALLBACK = [
  { type: 'listening', text: '{prefix}help' },
  { type: 'watching',  text: '{servers} servers' },
  { type: 'custom',    text: 'at your service' },
];

function fill(template, client) {
  const users = client.guilds.cache.reduce((n, g) => n + (g.memberCount || 0), 0);
  return String(template)
    .replace(/\{prefix\}/g, config.PREFIX)
    .replace(/\{servers\}/g, client.guilds.cache.size.toLocaleString('en-US'))
    .replace(/\{users\}/g, users.toLocaleString('en-US'))
    .replace(/\{commands\}/g, String((client.commands?.size ?? 0) + (client.prefixCommands?.size ?? 0)))
    .replace(/\{name\}/g, client.user.username)
    .slice(0, 128);
}

function build(entry, client) {
  const type = TYPES[String(entry.type).toLowerCase()] ?? ActivityType.Listening;
  const text = fill(entry.text, client);
  // Custom statuses carry their text in `state`; `name` is just a label.
  return type === ActivityType.Custom
    ? { type, name: 'Custom Status', state: text }
    : { type, name: text };
}

function startPresence(client) {
  const cfg = config.STATUS || {};
  const list = Array.isArray(cfg.activities) && cfg.activities.length ? cfg.activities : FALLBACK;
  const every = Math.max(15, Number(cfg.rotateSeconds) || 30) * 1000;
  let i = 0;

  const tick = () => {
    try {
      client.user.setPresence({
        status: cfg.status || 'online',
        activities: [build(list[i % list.length], client)],
      });
      i++;
    } catch (_) { /* gateway not ready — next tick */ }
  };

  tick();
  return setInterval(tick, every);
}

module.exports = { startPresence, fill };
