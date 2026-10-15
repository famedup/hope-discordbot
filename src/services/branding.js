/**
 * ┌ cashholy (carti)
 * └ services/branding.js
 */

// hope — per-server accent colour.
//
// Every container/embed in the bot uses the neutral grey 0x2B2D31 as its
// "no colour" accent. A server can pick its own accent; this module swaps the
// grey for that colour at build time, using the server of the interaction /
// message currently being handled (AsyncLocalStorage), so no command needs to
// know about it. Event colours (success / warning / error) are never touched.

const { AsyncLocalStorage } = require('async_hooks');
const { ContainerBuilder, EmbedBuilder, TextDisplayBuilder } = require('discord.js');

const BASE = 0x2B2D31;
const als = new AsyncLocalStorage();
const accents = new Map(); // guildId → integer colour

const current = () => {
  const store = als.getStore();
  return store ? accents.get(store.guildId) : undefined;
};

let patched = false;
function patchBuilders() {
  if (patched) return;
  patched = true;

  const setAccent = ContainerBuilder.prototype.setAccentColor;
  ContainerBuilder.prototype.setAccentColor = function (color) {
    if (color === BASE) {
      const custom = current();
      if (custom !== undefined) color = custom;
    }
    return setAccent.call(this, color);
  };

  // House style for every container in the bot, including commands that were
  // never rewritten: a top-level "# Title" becomes the lighter "## Title".
  const setContent = TextDisplayBuilder.prototype.setContent;
  TextDisplayBuilder.prototype.setContent = function (content) {
    if (typeof content === 'string' && /^# \S/.test(content)) content = `#${content}`;
    return setContent.call(this, content);
  };

  const setColor = EmbedBuilder.prototype.setColor;
  EmbedBuilder.prototype.setColor = function (color) {
    if (color === BASE) {
      const custom = current();
      if (custom !== undefined) color = custom;
    }
    return setColor.call(this, color);
  };
}

const guildIdOf = (x) => x?.guildId ?? x?.guild?.id ?? x?.message?.guildId ?? null;

/** Run `fn` as if handling an event of `guildId` (accent applies inside). */
const withGuild = (guildId, fn) => (guildId && accents.has(guildId) ? als.run({ guildId }, fn) : fn());

/** Call once, right after the client is created. */
function attach(client) {
  patchBuilders();
  const emit = client.emit;
  client.emit = function (event, ...args) {
    const id = guildIdOf(args[0]);
    if (id && accents.has(id)) return als.run({ guildId: id }, () => emit.call(this, event, ...args));
    return emit.call(this, event, ...args);
  };
}

/** Load saved accents (call after the database is ready). */
async function load() {
  try {
    const { BotCustomization } = require('../database/schemas');
    for (const [guildId, color] of await BotCustomization.allAccents()) accents.set(guildId, color);
  } catch (err) {
    console.error('[branding] could not load accents:', err.message);
  }
}

function setAccent(guildId, color) {
  if (color === null || color === undefined || color === BASE) accents.delete(guildId);
  else accents.set(guildId, color);
}

const getAccent = (guildId) => accents.get(guildId) ?? null;

module.exports = { BASE, attach, load, setAccent, getAccent, withGuild };
