// [dev] cashholy (carti) :: tools/check-i18n.js

// npm run check:i18n — every locale must have exactly the keys of en.json,
// the same {placeholders}, and slash descriptions must fit Discord's 100-char limit.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'localization', 'locales');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

const en = load('en.json');
const enKeys = Object.keys(en);
let problems = 0;
const bad = (file, msg) => { problems++; console.error(`  ✖ ${file}: ${msg}`); };

for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
  let data;
  try { data = load(file); } catch (e) { bad(file, `invalid JSON (${e.message})`); continue; }
  if (file === 'en.json') continue;

  for (const k of enKeys) {
    if (!(k in data)) { bad(file, `missing key ${k}`); continue; }
    if (typeof data[k] !== 'string' || !data[k].trim()) bad(file, `empty value for ${k}`);
    else if (vars(data[k]) !== vars(en[k])) bad(file, `placeholders differ for ${k}: {${vars(data[k])}} vs {${vars(en[k])}}`);
  }
  for (const k of Object.keys(data)) if (!(k in en)) bad(file, `unknown key ${k}`);
  for (const k of enKeys.filter(k => k.startsWith('slash.'))) {
    if (data[k] && data[k].length > 100) bad(file, `${k} is longer than 100 characters`);
  }
}

const { LANGUAGES } = require('../src/localization');
for (const l of LANGUAGES) if (!fs.existsSync(path.join(dir, `${l.code}.json`))) bad(`${l.code}.json`, 'file missing');

if (problems) { console.error(`\n${problems} problem(s) found`); process.exit(1); }
console.log(`i18n OK — ${LANGUAGES.length} languages, ${enKeys.length} keys each`);
