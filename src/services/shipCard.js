//
//  Made with care by cashholy (carti)
//

// hope — ship card. A soft pink canvas: two avatars, a dotted thread to a
// glowing compatibility ring in the middle, names below. Same pair = same
// percentage, so a ship never changes its mind.

/* global AbortSignal */
const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const FONTS = path.join(__dirname, '..', 'media', 'fonts');
let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  fontsReady = true;
  try {
    GlobalFonts.registerFromPath(path.join(FONTS, 'Montserrat-Bold.ttf'), 'Ship Bold');
    GlobalFonts.registerFromPath(path.join(FONTS, 'Montserrat-Regular.ttf'), 'Ship Regular');
  } catch (_) { /* falls back to the system sans */ }
}

const W = 1200;
const H = 480;
const CY = 215;

/** Stable 0-100 for a pair, whatever the order. */
function compatibility(idA, idB) {
  if (idA === idB) return 100;
  const key = [idA, idB].sort().join(':');
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 101;
}

const VERDICTS = [
  [10, 'worlds apart'],
  [25, 'a long shot'],
  [45, 'could become something'],
  [65, 'there is a spark'],
  [85, 'better than most'],
  [95, 'written in the stars'],
  [101, 'inseparable'],
];
const verdictFor = (p) => VERDICTS.find(([max]) => p < max)[1] ?? '';

/** Soft pink palette only: no neon, no pure white, same on every score. */
const PINK = { pale: '#efafd8', blush: '#f1bcd4', bright: '#ffa0ce', rose: '#f295be', deep: '#e36aa5' };
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

async function fetchImage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch (_) {
    return null;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawAvatar(ctx, img, name, cx, cy, r, c1, c2) {
  // soft halo
  const halo = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.7);
  halo.addColorStop(0, 'rgba(241,188,212,0.07)');
  halo.addColorStop(1, 'rgba(241,188,212,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, Math.PI * 2); ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = '#3a2332'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = '#f1bcd4'; ctx.font = '120px "Ship Bold"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText((name[0] || '?').toUpperCase(), cx, cy + 6);
  }
  ctx.restore();

  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, c1); ring.addColorStop(1, c2);
  ctx.lineWidth = 6; ctx.strokeStyle = ring;
  ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.stroke();
}

function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function heart(ctx, cx, cy, s, fill) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 0.9);
  ctx.bezierCurveTo(-1.5, -0.1, -1, -1.1, 0, -0.45);
  ctx.bezierCurveTo(1, -1.1, 1.5, -0.1, 0, 0.9);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

/**
 * @param {{name:string, avatar:string}} a
 * @param {{name:string, avatar:string}} b
 * @returns {Promise<{buffer:Buffer, percent:number}>}
 */
async function renderShip(a, b, idA, idB) {
  ensureFonts();
  const percent = compatibility(idA, idB);
  const [imgA, imgB] = await Promise.all([fetchImage(a.avatar), fetchImage(b.avatar)]);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // card
  roundRect(ctx, 0, 0, W, H, 40); ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1f1319'); bg.addColorStop(1, '#2a1824');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // very soft washes behind the avatars and ring
  for (const [x, hex, size] of [[230, PINK.pale, 300], [970, PINK.rose, 300], [600, PINK.deep, 240]]) {
    const g = ctx.createRadialGradient(x, CY, 0, x, CY, size);
    g.addColorStop(0, rgba(hex, 0.10)); g.addColorStop(1, rgba(hex, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // tiny hearts scattered through the background (fixed layout, so cards stay consistent)
  const tints = [PINK.pale, PINK.blush, PINK.rose, PINK.bright];
  for (let i = 0; i < 46; i++) {
    const x = (i * 197 + 53) % W;
    const y = (i * 131 + 29) % H;
    const nearCentre = Math.abs(x - 600) < 150 && Math.abs(y - CY) < 150;
    if (nearCentre) continue;
    heart(ctx, x, y, 4 + (i % 4) * 2, rgba(tints[i % 4], 0.11 + (i % 3) * 0.035));
  }

  // dotted threads: avatar → ring; they light up with the score
  const lit = Math.round((percent / 100) * 9);
  for (const side of [-1, 1]) {
    const from = 600 + side * 372;
    const to = 600 + side * 118;
    for (let i = 0; i < 9; i++) {
      const x = from + (to - from) * (i / 8);
      ctx.fillStyle = i < lit ? `rgba(242,149,190,${0.95 - i * 0.05})` : 'rgba(241,188,212,0.16)';
      ctx.beginPath(); ctx.arc(x, CY, i < lit ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  drawAvatar(ctx, imgA, a.name, 230, CY, 112, PINK.pale, PINK.rose);
  drawAvatar(ctx, imgB, b.name, 970, CY, 112, PINK.blush, PINK.deep);

  // ring
  const R = 92;
  ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(241,188,212,0.12)';
  ctx.beginPath(); ctx.arc(600, CY, R, 0, Math.PI * 2); ctx.stroke();
  if (percent > 0) {
    const grad = ctx.createLinearGradient(600 - R, CY - R, 600 + R, CY + R);
    grad.addColorStop(0, PINK.rose); grad.addColorStop(1, PINK.deep);
    ctx.strokeStyle = grad;
    ctx.shadowColor = rgba(PINK.deep, 0.35); ctx.shadowBlur = 12;
    const end = -Math.PI / 2 + (percent / 100) * Math.PI * 2;
    ctx.beginPath(); ctx.arc(600, CY, R, -Math.PI / 2, end); ctx.stroke();
    ctx.shadowBlur = 0;
  }

  heart(ctx, 600, CY - 46, 15, PINK.rose);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f7dbe9'; ctx.font = '64px "Ship Bold"';
  ctx.fillText(`${percent}%`, 600, CY + 28);
  ctx.fillStyle = 'rgba(241,188,212,0.5)'; ctx.font = '15px "Ship Regular"';
  ctx.letterSpacing = '4px';
  ctx.fillText('MATCH', 600, CY + 56);

  // verdict
  ctx.fillStyle = 'rgba(241,188,212,0.75)'; ctx.font = '23px "Ship Regular"'; ctx.letterSpacing = '2px';
  ctx.fillText(verdictFor(percent), 600, 372);
  ctx.letterSpacing = '0px';

  // names
  ctx.fillStyle = '#f7dbe9'; ctx.font = '30px "Ship Bold"';
  ctx.fillText(fitText(ctx, a.name, 330), 230, 420);
  ctx.fillText(fitText(ctx, b.name, 330), 970, 420);

  // hairline border
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(241,188,212,0.10)';
  roundRect(ctx, 1, 1, W - 2, H - 2, 39); ctx.stroke();

  return { buffer: canvas.toBuffer('image/png'), percent };
}

module.exports = { renderShip, compatibility, verdictFor };
