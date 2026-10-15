/**
 * ┌ cashholy (carti)
 * └ services/consoleLogger.js
 */

// hope — startup console. Truecolor gradients, a shaded wordmark, aligned log
// lines with a running clock, and a closing "online" panel. Everything also
// goes to logs/bot.log as plain text. Colour switches off by itself when the
// output is piped or NO_COLOR is set (FORCE_COLOR turns it back on).

const fs     = require('fs');
const path   = require('path');
const os     = require('os');
const config = require('../settings');

const COLOR = process.env.FORCE_COLOR ? process.env.FORCE_COLOR !== '0'
  : !process.env.NO_COLOR && !!process.stdout.isTTY;
const RESET = COLOR ? '\x1b[0m' : '';
const BOOT  = Date.now();

/* ── colour helpers ────────────────────────────────────────────────── */

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const fg  = ([r, g, b]) => (COLOR ? `\x1b[38;2;${r};${g};${b}m` : '');
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const shade = (c, k) => c.map(v => Math.round(v * k));

/** Sample a list of stops at t in [0, 1]. */
function sample(stops, t) {
  const x = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(x), stops.length - 2);
  return mix(stops[i], stops[i + 1], x - i);
}

const ROSE   = hex('#f295be');
const PINK   = hex('#ffa0ce');
const LILAC  = hex('#b39bff');
const SKY    = hex('#6db6ff');
const MINT   = hex('#7fe3b5');
const AMBER  = hex('#f5c26b');
const CORAL  = hex('#ff7a8a');
const BRAND  = [PINK, ROSE, LILAC, SKY];

const TEXT  = hex('#d9dbe8');
const MUTED = hex('#8a8fa8');
const DIM   = hex('#555a73');

const paint = (c, s) => `${fg(c)}${s}${RESET}`;

/** Horizontal gradient across a string. */
function gradient(text, stops = BRAND) {
  const chars = [...text];
  if (!COLOR) return text;
  return chars.map((ch, i) => (ch === ' ' ? ch : paint(sample(stops, chars.length > 1 ? i / (chars.length - 1) : 0), ch))).join('');
}

const visible = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

/* ── file log (plain) ──────────────────────────────────────────────── */

const LOG_DIR  = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bot.log');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function writeLog(level, message) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.appendFileSync(LOG_FILE, `[${ts}] [${level.trim()}] ${visible(message)}\n`, 'utf8');
}

/* ── log lines ─────────────────────────────────────────────────────── */
//   22:41:07  +0.8s  ◌ loading  Event handlers

const LEVELS = {
  LOAD: { icon: '◌', word: 'loading', stops: [SKY, LILAC] },
  OK:   { icon: '●', word: 'ready',   stops: [MINT, hex('#4fc9a0')] },
  ERR:  { icon: '✕', word: 'error',   stops: [CORAL, hex('#e0526b')] },
  INFO: { icon: '◆', word: 'info',    stops: [LILAC, PINK] },
  WARN: { icon: '▲', word: 'warning', stops: [AMBER, hex('#e89a4b')] },
};

const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
const since = () => {
  const s = (Date.now() - BOOT) / 1000;
  return `+${s < 10 ? s.toFixed(1) : Math.round(s)}s`.padStart(6);
};

/** Pull numbers forward so counts stand out; leaves pre-coloured text alone. */
function accent(msg, lvl) {
  if (!COLOR || msg.includes('\x1b')) return paint(lvl === 'ERR' ? CORAL : TEXT, msg);
  const base = lvl === 'ERR' ? CORAL : TEXT;
  return msg.split(/(\b\d[\d,.]*\b)/).map((part, i) => (i % 2 ? paint(PINK, part) : paint(base, part))).join('');
}

function emit(level, message) {
  const lv = LEVELS[level];
  writeLog(level, message);
  const word = gradient(lv.word.padEnd(8), lv.stops);
  const icon = paint(lv.stops[0], lv.icon);
  process.stdout.write(`  ${paint(DIM, clock())} ${paint(DIM, since())}  ${icon} ${word} ${accent(message, level)}\n`);
}

/* ── header ────────────────────────────────────────────────────────── */

const WORDMARK = [
  '██╗  ██╗ ██████╗ ██████╗ ███████╗',
  '██║  ██║██╔═══██╗██╔══██╗██╔════╝',
  '███████║██║   ██║██████╔╝█████╗  ',
  '██╔══██║██║   ██║██╔═══╝ ██╔══╝  ',
  '██║  ██║╚██████╔╝██║     ███████╗',
  '╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝',
];

function rule(width, from = DIM, to = DIM, char = '─') {
  return gradient(char.repeat(width), [from, to]);
}

function printHeader() {
  const w = WORDMARK[0].length;
  const out = ['\n'];

  WORDMARK.forEach((row, y) => {
    const line = [...row].map((ch, x) => {
      if (ch === ' ') return ' ';
      const t = (x + y * 2.2) / (w + WORDMARK.length * 2.2);
      const c = sample(BRAND, t);
      // solid blocks carry the colour, the outline characters are the same hue in shadow
      return paint(ch === '█' ? c : shade(c, 0.5), ch);
    }).join('');
    out.push(`   ${line}\n`);
  });

  const tagline = 'multipurpose discord bot';
  out.push('\n');
  out.push(`   ${gradient([...tagline].join(' '), [LILAC, SKY])}\n`);
  out.push(`   ${rule(w + 4, PINK, SKY, '━')}\n`);
  out.push(`   ${paint(MUTED, `node ${process.version}`)} ${paint(DIM, '·')} ${paint(MUTED, `${os.platform()} ${os.arch()}`)} ${paint(DIM, '·')} ${paint(MUTED, `pid ${process.pid}`)}\n`);
  out.push(`   ${paint(DIM, 'crafted by cashholy (carti)')}\n\n`);
  process.stdout.write(out.join(''));
}

/* ── closing panel ─────────────────────────────────────────────────── */

function box(lines, innerWidth) {
  const stops = [PINK, LILAC, SKY];
  const edge = (l, fill, r) => gradient(l + fill.repeat(innerWidth + 2) + r, stops);
  const side = (t) => paint(sample(stops, t), '│');
  const out = [`  ${edge('╭', '─', '╮')}`];
  for (const ln of lines) {
    const pad = innerWidth - visible(ln).length;
    out.push(`  ${side(0)} ${ln}${' '.repeat(Math.max(0, pad))} ${side(1)}`);
  }
  out.push(`  ${edge('╰', '─', '╯')}`);
  return out.join('\n');
}

/** stats (optional): { tag, guilds, commands } */
function printSystemReady(stats = {}) {
  const boot = ((Date.now() - BOOT) / 1000).toFixed(1);
  const mem = Math.round(process.memoryUsage().rss / 1048576);
  const name = config.BOT_NAME || 'hope';
  const facts = [
    stats.tag ? paint(TEXT, stats.tag) : null,
    stats.guilds !== undefined ? `${paint(PINK, String(stats.guilds))} ${paint(MUTED, 'servers')}` : null,
    stats.commands !== undefined ? `${paint(PINK, String(stats.commands))} ${paint(MUTED, 'commands')}` : null,
    `${paint(PINK, String(mem))}${paint(MUTED, ' MB')}`,
  ].filter(Boolean).join(paint(DIM, '  ·  '));

  const lines = [
    `${paint(PINK, '✦')}  ${gradient(`${name} is online`, [PINK, LILAC, SKY])}${paint(DIM, '   booted in ')}${paint(TEXT, `${boot}s`)}`,
    facts,
  ];
  const width = Math.max(...lines.map(l => visible(l).length), 44);
  process.stdout.write(`\n${box(lines, width)}\n\n`);
  writeLog('OK', `${name} online (boot ${boot}s)`);
}

/* ── public API (unchanged) ────────────────────────────────────────── */

const printLoading = (m) => emit('LOAD', m);
const printSuccess = (m) => emit('OK', m);
const printError   = (m) => emit('ERR', m);
const printInfo    = (m) => emit('INFO', m);
const printWarn    = (m) => emit('WARN', m);

const colors = {
  PURPLE: COLOR ? fg(LILAC) : '',
  YELLOW: COLOR ? fg(AMBER) : '',
  RESET,
};

module.exports = {
  colors,
  printHeader,
  printLoading,
  printSuccess,
  printError,
  printInfo,
  printWarn,
  printSystemReady,
};
