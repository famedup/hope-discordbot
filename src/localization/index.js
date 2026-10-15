// ─── cashholy (carti) · developer ───

// hope — i18n engine.
//
//   const i18n = require('.');
//   const tr = i18n.translator(ctx);          // ctx = message OR interaction
//   tr('ping.latency', { value: '42ms' });    // → "Latency is **42ms**" / "विलंबता **42ms** है"
//
// How a language is chosen (per USER, never per server):
//   1. the user's saved choice (/language)            — follows them everywhere
//   2. the Discord client language, auto-detected     — saved the first time we
//      see an interaction from them (slash command, button, menu …)
//   3. English
//
// Nothing here is shared between users: every call builds/gets a translator for
// the one user it was asked about, so two people in the same server can use
// different languages at the same time without conflict.

const fs = require('fs');
const path = require('path');
const { isLocalized } = require('./scope');

const DEFAULT = 'en';

/** Languages the bot speaks. `intl` is the BCP-47 tag used for number formatting. */
const LANGUAGES = [
  { code: 'en',    native: 'English',             name: 'English',              flag: '🇬🇧', intl: 'en' },
  { code: 'hi',    native: 'हिन्दी',                name: 'Hindi',                flag: '🇮🇳', intl: 'hi' },
  { code: 'es',    native: 'Español',             name: 'Spanish',              flag: '🇪🇸', intl: 'es' },
  { code: 'fr',    native: 'Français',            name: 'French',               flag: '🇫🇷', intl: 'fr' },
  { code: 'de',    native: 'Deutsch',             name: 'German',               flag: '🇩🇪', intl: 'de' },
  { code: 'pt-BR', native: 'Português (Brasil)',  name: 'Portuguese (Brazil)',  flag: '🇧🇷', intl: 'pt-BR' },
  { code: 'ru',    native: 'Русский',             name: 'Russian',              flag: '🇷🇺', intl: 'ru' },
  { code: 'tr',    native: 'Türkçe',              name: 'Turkish',              flag: '🇹🇷', intl: 'tr' },
  { code: 'id',    native: 'Bahasa Indonesia',    name: 'Indonesian',           flag: '🇮🇩', intl: 'id' },
  { code: 'ja',    native: '日本語',                name: 'Japanese',             flag: '🇯🇵', intl: 'ja' },
  { code: 'ko',    native: '한국어',                name: 'Korean',               flag: '🇰🇷', intl: 'ko' },
  { code: 'zh-CN', native: '简体中文',              name: 'Chinese (Simplified)', flag: '🇨🇳', intl: 'zh-CN' },
  { code: 'ar',    native: 'العربية',             name: 'Arabic',               flag: '🇸🇦', intl: 'ar' },
];
const byCode = new Map(LANGUAGES.map(l => [l.code, l]));

/** Discord client locale → our language code. (Discord has no Arabic locale, so Arabic is manual-only.) */
const FROM_DISCORD = {
  'en-US': 'en', 'en-GB': 'en',
  hi: 'hi',
  'es-ES': 'es', 'es-419': 'es',
  fr: 'fr', de: 'de', 'pt-BR': 'pt-BR', ru: 'ru', tr: 'tr', id: 'id', ja: 'ja', ko: 'ko',
  'zh-CN': 'zh-CN', 'zh-TW': 'zh-CN',
};

/** Our language code → Discord locales (used to localize slash-command descriptions). */
const TO_DISCORD = {
  hi: ['hi'], es: ['es-ES', 'es-419'], fr: ['fr'], de: ['de'], 'pt-BR': ['pt-BR'], ru: ['ru'],
  tr: ['tr'], id: ['id'], ja: ['ja'], ko: ['ko'], 'zh-CN': ['zh-CN', 'zh-TW'],
};

const fromDiscordLocale = (locale) => FROM_DISCORD[locale] ?? DEFAULT;
const isSupported = (code) => byCode.has(code);

/** Case-insensitive lookup: "PT-br", "hindi", "Deutsch" → language code (or null). */
function resolveCode(input) {
  const q = String(input ?? '').trim().toLowerCase();
  if (!q) return null;
  for (const l of LANGUAGES) {
    if (l.code.toLowerCase() === q || l.name.toLowerCase() === q || l.native.toLowerCase() === q) return l.code;
  }
  const short = q.split(/[-_]/)[0];
  const hit = LANGUAGES.find(l => l.code.toLowerCase() === short);
  return hit ? hit.code : null;
}

/* ── locale files ──────────────────────────────────────────────────── */

const bundles = new Map(); // code → { key: string }
const LOCALE_DIR = path.join(__dirname, 'locales');

for (const { code } of LANGUAGES) {
  const file = path.join(LOCALE_DIR, `${code}.json`);
  try {
    bundles.set(code, JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (err) {
    console.error(`[i18n] could not read ${code}.json: ${err.message}`);
    bundles.set(code, {});
  }
}
const base = bundles.get(DEFAULT);

const format = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;

/* ── translators ───────────────────────────────────────────────────── */

const cache = new Map();

/** A translator bound to one language. Stateless, so it is safe to share. */
function translatorFor(code) {
  const lang = byCode.has(code) ? code : DEFAULT;
  if (cache.has(lang)) return cache.get(lang);

  const meta = byCode.get(lang);
  const own = bundles.get(lang) ?? {};
  let nf;
  try { nf = new Intl.NumberFormat(meta.intl, { numberingSystem: 'latn' }); } catch (_) { nf = new Intl.NumberFormat('en'); }

  const tr = (key, vars) => format(own[key] ?? base[key] ?? key, vars);
  tr.lang = lang;
  tr.meta = meta;
  /** true when `key` exists in THIS language (lets callers keep their English fallback). */
  tr.has = (key) => Object.prototype.hasOwnProperty.call(own, key);
  tr.num = (n) => nf.format(n);
  /** 93784000 ms → "1d 2h 3m 4s". compact drops empty leading units. */
  tr.duration = (ms, { compact = false } = {}) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400), h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60), s = total % 60;
    const u = (k, n) => tr(`unit.${k}`, { n: nf.format(n) });
    if (!compact) return [u('d', d), u('h', h), u('m', m), u('s', s)].join(' ');
    const parts = [];
    if (d > 0) parts.push(u('d', d));
    if (h > 0 || d > 0) parts.push(u('h', h));
    if (m > 0 || h > 0 || d > 0) parts.push(u('m', m));
    parts.push(u('s', s));
    return parts.join(' ');
  };

  cache.set(lang, tr);
  return tr;
}

/* ── per-user store ────────────────────────────────────────────────── */

// userId → { lang, source }. Loaded once at startup and kept in sync on every
// write, so looking a user up is synchronous (no database hit per command).
const users = new Map();

async function load() {
  try {
    const { UserLanguage } = require('../database/schemas');
    for (const [id, lang, source] of await UserLanguage.allRows()) {
      users.set(id, { lang: byCode.has(lang) ? lang : DEFAULT, source: source === 'manual' ? 'manual' : 'auto' });
    }
  } catch (err) {
    console.error('[i18n] could not load saved languages:', err.message);
  }
}

function persist(userId, lang, source) {
  try {
    const { UserLanguage } = require('../database/schemas');
    UserLanguage.save(userId, lang, source).catch(err => console.error('[i18n] save failed:', err.message));
  } catch (err) {
    console.error('[i18n] save failed:', err.message);
  }
}

const languageOf = (userId) => users.get(userId)?.lang ?? DEFAULT;
const sourceOf = (userId) => users.get(userId)?.source ?? null;

/**
 * Call for EVERY interaction (see events/interactionCreate.js).
 * Interactions carry the user's Discord language, which is how a brand-new user
 * gets their language set automatically. A user who picked a language by hand
 * is never overwritten; an "auto" user follows their Discord language if it changes.
 */
function observe(interaction) {
  try {
    const id = interaction?.user?.id;
    if (!id || !interaction.locale) return;
    const detected = fromDiscordLocale(interaction.locale);
    const cur = users.get(id);
    if (!cur || (cur.source === 'auto' && cur.lang !== detected)) {
      users.set(id, { lang: detected, source: 'auto' });
      persist(id, detected, 'auto');
    }
  } catch (err) {
    console.error('[i18n] observe failed:', err.message);
  }
}

/**
 * Save a user's language. source 'manual' pins `code`; source 'auto' re-detects
 * from `interaction.locale` and goes back to following the Discord language.
 * Returns the language that was stored.
 */
function setLanguage(userId, code, { source = 'manual', interaction } = {}) {
  let lang = source === 'auto' ? fromDiscordLocale(interaction?.locale) : code;
  if (!byCode.has(lang)) lang = DEFAULT;
  users.set(userId, { lang, source });
  persist(userId, lang, source);
  return lang;
}

/* ── scope-aware translator for a command context ─────────────────── */

function commandNameOf(ctx) {
  if (!ctx) return null;
  if (ctx.commandName) return ctx.commandName;                 // slash command
  if (ctx.invokedAs) {                                         // prefix command (set by messageCreate)
    const cmd = ctx.client?.prefixCommands?.get(ctx.invokedAs);
    return cmd?.name ?? ctx.invokedAs;
  }
  return null;
}

/**
 * Translator for whoever triggered `ctx`.
 * Commands outside scope.js always get English. Pass `command` to override the
 * command name (the help menu does this so it stays localized when another
 * module opens it).
 */
function translator(ctx, command) {
  if (!isLocalized(command ?? commandNameOf(ctx))) return translatorFor(DEFAULT);
  const userId = (ctx?.user ?? ctx?.author)?.id;
  const rec = userId ? users.get(userId) : null;
  if (rec) return translatorFor(rec.lang);
  if (ctx?.locale) return translatorFor(fromDiscordLocale(ctx.locale)); // first interaction, not saved yet
  return translatorFor(DEFAULT);
}

/** { 'es-ES': '…', fr: '…' } for SlashCommandBuilder#setDescriptionLocalizations. */
function descriptionLocalizations(key) {
  const out = {};
  for (const [code, locales] of Object.entries(TO_DISCORD)) {
    const text = bundles.get(code)?.[key];
    if (!text) continue;
    for (const locale of locales) out[locale] = text.slice(0, 100);
  }
  return out;
}

module.exports = {
  DEFAULT, LANGUAGES, byCode, bundles,
  fromDiscordLocale, resolveCode, isSupported,
  translator, translatorFor, descriptionLocalizations,
  load, observe, setLanguage, languageOf, sourceOf,
};
