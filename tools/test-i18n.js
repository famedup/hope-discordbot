/**
 * @file test-i18n.js
 * @developer cashholy (carti)
 */

// npm run test:i18n — checks the language engine without a database or Discord connection.
const assert = require('assert');
const path = require('path');
const Module = require('module');

// fake database layer so persistence calls are recorded instead of hitting Postgres
const saved = [];
const modelsPath = path.join(__dirname, '..', 'src', 'database', 'schemas', 'index.js');
require.cache[modelsPath] = {
  id: modelsPath, filename: modelsPath, loaded: true,
  exports: { UserLanguage: { save: async (u, l, s) => { saved.push([u, l, s]); }, allRows: async () => [['9', 'ja', 'manual']] } },
};
void Module;

const i18n = require('../src/localization');
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ✔', name); };

(async () => {
  await i18n.load();

  ok('saved rows are loaded at startup', () => assert.strictEqual(i18n.languageOf('9'), 'ja'));

  ok('interaction auto-detects the Discord language and saves it', () => {
    i18n.observe({ user: { id: '1' }, locale: 'hi' });
    assert.strictEqual(i18n.languageOf('1'), 'hi');
    assert.deepStrictEqual(saved.at(-1), ['1', 'hi', 'auto']);
  });

  ok('two users in the same server get different languages', () => {
    i18n.observe({ user: { id: '2' }, locale: 'es-ES' });
    const a = i18n.translator({ user: { id: '1' }, commandName: 'ping' });
    const b = i18n.translator({ user: { id: '2' }, commandName: 'ping' });
    assert.strictEqual(a.lang, 'hi');
    assert.strictEqual(b.lang, 'es');
    assert.notStrictEqual(a('ping.latency', { value: '5ms' }), b('ping.latency', { value: '5ms' }));
  });

  ok('a manual choice is never overwritten by the Discord locale', () => {
    i18n.setLanguage('1', 'de', { source: 'manual' });
    i18n.observe({ user: { id: '1' }, locale: 'hi' });
    assert.strictEqual(i18n.languageOf('1'), 'de');
    assert.strictEqual(i18n.sourceOf('1'), 'manual');
  });

  ok('"Automatic" goes back to following the Discord language', () => {
    i18n.setLanguage('1', null, { source: 'auto', interaction: { locale: 'fr' } });
    assert.strictEqual(i18n.languageOf('1'), 'fr');
    i18n.observe({ user: { id: '1' }, locale: 'ru' });           // auto users follow changes
    assert.strictEqual(i18n.languageOf('1'), 'ru');
  });

  ok('the choice is per user, not per guild (same id, different guilds)', () => {
    const inA = i18n.translator({ user: { id: '2' }, guildId: 'A', commandName: 'help' });
    const inB = i18n.translator({ user: { id: '2' }, guildId: 'B', commandName: 'help' });
    assert.strictEqual(inA.lang, inB.lang);
  });

  ok('unsupported Discord locales fall back to English', () => {
    i18n.observe({ user: { id: '3' }, locale: 'vi' });
    assert.strictEqual(i18n.languageOf('3'), 'en');
  });

  ok('prefix users with no saved language get English', () => {
    assert.strictEqual(i18n.translator({ author: { id: '404' }, invokedAs: 'ping', client: { prefixCommands: new Map([['ping', { name: 'ping' }]]) } }).lang, 'en');
  });

  ok('commands outside the scope always answer in English', () => {
    for (const cmd of ['ban', 'antinuke', 'automod', 'ticket', 'welcome', 'giveaway']) {
      assert.strictEqual(i18n.translator({ user: { id: '2' }, commandName: cmd }).lang, 'en', cmd);
    }
  });

  ok('prefix aliases resolve to the real command (h → help)', () => {
    const help = { name: 'help' };
    const client = { prefixCommands: new Map([['help', help], ['h', help]]) };
    assert.strictEqual(i18n.translator({ author: { id: '2' }, invokedAs: 'h', client }).lang, 'es');
  });

  ok('help always follows the viewer, even when opened by another module', () => {
    assert.strictEqual(i18n.translator({ user: { id: '2' }, commandName: 'antinuke' }, 'help').lang, 'es');
  });

  ok('missing keys fall back to English, unknown keys return the key', () => {
    assert.strictEqual(i18n.translatorFor('hi')('no.such.key'), 'no.such.key');
  });

  ok('numbers use Latin digits and durations are localized', () => {
    const ar = i18n.translatorFor('ar');
    assert.ok(/^[0-9,.\s]+$/.test(ar.num(1234567)));
    assert.strictEqual(i18n.translatorFor('en').duration(93784000), '1d 2h 3m 4s');
    assert.ok(i18n.translatorFor('hi').duration(93784000).includes('दि'));
  });

  ok('language names resolve from code, English name or native name', () => {
    assert.strictEqual(i18n.resolveCode('hindi'), 'hi');
    assert.strictEqual(i18n.resolveCode('हिन्दी'), 'hi');
    assert.strictEqual(i18n.resolveCode('PT-br'), 'pt-BR');
    assert.strictEqual(i18n.resolveCode('klingon'), null);
  });

  ok('slash descriptions are localized for Discord', () => {
    const d = i18n.descriptionLocalizations('slash.language');
    assert.ok(d.hi && d['es-ES'] && d['es-419'] && d['zh-TW']);
    assert.ok(Object.values(d).every(t => t.length <= 100));
  });

  console.log(`\n${n} checks passed`);
})().catch(e => { console.error('\n✖', e.message); process.exit(1); });
