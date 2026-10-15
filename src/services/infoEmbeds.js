// ▛▀ cashholy (carti) ▀▜

// hope — user / server info embeds. The accent colour is taken from the
// avatar (or server icon), so every card gets its own tint.

/* global AbortSignal */
const { EmbedBuilder, ChannelType } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const ui = require('./ui');

/* ── dominant colour ───────────────────────────────────────────────── */

const colourCache = new Map();
const FALLBACK = 0x2B2D31;

function hsv(r, g, b) {
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max / 255];
}

/** Most characteristic colour of an image: favours saturated, mid-bright pixels. */
async function dominantColour(url) {
  if (!url) return FALLBACK;
  if (colourCache.has(url)) return colourCache.get(url);
  let out = FALLBACK;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const img = await loadImage(Buffer.from(await res.arrayBuffer()));
      const c = createCanvas(32, 32); const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 32, 32);
      const { data } = ctx.getImageData(0, 0, 32, 32);
      const bins = new Map(); let sr = 0; let sg = 0; let sb = 0; let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        sr += r; sg += g; sb += b; n++;
        const [h, s, v] = hsv(r, g, b);
        if (s < 0.22 || v < 0.22 || v > 0.97) continue;
        const key = Math.floor(h / 20);
        const bin = bins.get(key) || { w: 0, r: 0, g: 0, b: 0 };
        const w = s * (1 - Math.abs(v - 0.65));
        bin.w += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
        bins.set(key, bin);
      }
      let best = null;
      for (const bin of bins.values()) if (!best || bin.w > best.w) best = bin;
      let rgb = best && best.w > 0.5
        ? [best.r / best.w, best.g / best.w, best.b / best.w]
        : (n ? [sr / n, sg / n, sb / n] : null);
      if (rgb) {
        // keep it readable: lift very dark colours, soften very bright ones
        const [h, s, v] = hsv(...rgb);
        const v2 = Math.min(Math.max(v, 0.5), 0.85); const s2 = Math.min(s, 0.8);
        const f = (k) => { const a = (k + h / 60) % 6; return v2 - v2 * s2 * Math.max(0, Math.min(a, 4 - a, 1)); };
        rgb = [f(5), f(3), f(1)].map(x => Math.round(x * 255));
        out = (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
      }
    }
  } catch (_) { /* keep the fallback */ }
  if (colourCache.size > 500) colourCache.clear();
  colourCache.set(url, out);
  return out;
}

/* ── helpers ───────────────────────────────────────────────────────── */

const ts = (ms) => Math.floor(ms / 1000);
const stamp = (ms) => `<t:${ts(ms)}:D> (<t:${ts(ms)}:R>)`;
const quote = (lines) => lines.map(l => `> ${l}`).join('\n');

const membersFetched = new Map(); // guildId → last full fetch
async function ensureMembers(guild) {
  if (guild.members.cache.size >= guild.memberCount) return;
  if (guild.memberCount > 5000) return;
  if (Date.now() - (membersFetched.get(guild.id) || 0) < 6e5) return;
  membersFetched.set(guild.id, Date.now());
  await guild.members.fetch({ time: 8000 }).catch(() => null);
}

/* ── user ──────────────────────────────────────────────────────────── */

async function userInfo(guild, user, tr = require('../localization').translatorFor('en')) {
  const member = guild ? await guild.members.fetch(user.id).catch(() => null) : null;
  const avatar = user.displayAvatarURL({ extension: 'png', size: 512 });
  const lines = [`### ${tr('info.created')}`, quote([stamp(user.createdTimestamp)])];
  let position = null;

  if (member?.joinedTimestamp) {
    lines.push(`### ${tr('info.joined')}`, quote([stamp(member.joinedTimestamp)]));
    await ensureMembers(guild);
    const sorted = [...guild.members.cache.values()].filter(m => m.joinedTimestamp).sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const at = sorted.findIndex(m => m.id === member.id);
    if (at >= 0) position = at + 1;
  }
  if (member) {
    const roles = [...member.roles.cache.values()].filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position);
    if (roles.length) {
      const shown = roles.slice(0, 20).map(r => `<@&${r.id}>`).join(', ');
      lines.push(`### ${tr('info.roles', { count: roles.length })}`, shown + (roles.length > 20 ? ` ${tr('info.moreRoles', { count: roles.length - 20 })}` : ''));
    }
  }

  const embed = new EmbedBuilder()
    .setColor(await dominantColour(avatar))
    .setAuthor({ name: `${member?.displayName ?? user.displayName ?? user.username} (@${user.username})`, iconURL: avatar })
    .setThumbnail(avatar)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `${tr('info.id')}: ${user.id}${position ? ` • ${tr('info.joinPosition')}: ${position}` : ''}` });

  const links = [ui.link(tr('info.avatar'), user.displayAvatarURL({ extension: 'png', size: 1024 }))];
  const full = await user.fetch().catch(() => null);
  if (full?.banner) links.push(ui.link(tr('info.banner'), full.bannerURL({ extension: 'png', size: 1024 })));
  return { embed, rows: [ui.row(...links)] };
}

/* ── server ────────────────────────────────────────────────────────── */

async function serverInfo(guild, tr = require('../localization').translatorFor('en')) {
  await ensureMembers(guild);
  const owner = await guild.fetchOwner().catch(() => null);
  const icon = guild.iconURL({ extension: 'png', size: 512 });
  const count = (type) => guild.channels.cache.filter(c => c.type === type).size;
  const members = guild.members.cache;
  const bots = members.filter(m => m.user.bot).size;
  const humans = Math.max(0, guild.memberCount - bots);
  const stickers = guild.stickers.cache.size; const emojis = guild.emojis.cache.size; const roles = guild.roles.cache.size;
  const verification = tr(`info.verif.${['none', 'low', 'medium', 'high', 'veryHigh'][guild.verificationLevel] ?? 'unknown'}`);
  const joined = guild.members.me?.joinedTimestamp;
  const channelsTotal = guild.channels.cache.filter(c => !c.isThread()).size;

  const lines = [
    tr('info.createdOn', { date: stamp(guild.createdTimestamp) }),
    ...(joined ? [tr('info.joinedOn', { date: stamp(joined) })] : []),
    '',
    `### ${tr('info.counts', { count: stickers + emojis + roles })}`, quote([`**${tr('info.stickers')}:** ${stickers}`, `**${tr('info.emojis')}:** ${emojis}`, `**${tr('info.rolesLabel')}:** ${roles}`]),
    `### ${tr('info.members', { count: guild.memberCount })}`, quote([`**${tr('info.total')}:** ${guild.memberCount}`, `**${tr('info.humans')}:** ${humans}`, `**${tr('info.bots')}:** ${bots}`]),
    `### ${tr('info.boosts', { count: guild.premiumSubscriptionCount ?? 0 })}`, quote([`**${tr('info.level')}:** ${guild.premiumTier}`, `**${tr('info.boostsLabel')}:** ${guild.premiumSubscriptionCount ?? 0}`, `**${tr('info.boosters')}:** ${members.filter(m => m.premiumSinceTimestamp).size}`]),
    `### ${tr('info.channels', { count: channelsTotal })}`, quote([`**${tr('info.categories')}:** ${count(ChannelType.GuildCategory)}`, `**${tr('info.text')}:** ${count(ChannelType.GuildText) + count(ChannelType.GuildAnnouncement)}`, `**${tr('info.voice')}:** ${count(ChannelType.GuildVoice) + count(ChannelType.GuildStageVoice)}`]),
    `### ${tr('info.system')}`, quote([`**${tr('info.verification')}:** ${verification}`, `**${tr('info.mfa')}:** ${guild.mfaLevel ? tr('common.enabled') : tr('common.disabled')}`, `**${tr('info.vanity')}:** ${guild.vanityURLCode ?? tr('common.none')}`]),
    `### ${tr('info.discovery')}`, guild.features.includes('DISCOVERABLE') ? tr('info.listed') : tr('info.notListed'),
  ];

  const embed = new EmbedBuilder()
    .setColor(await dominantColour(icon))
    .setTitle(guild.name)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `${tr('info.guildId')}: ${guild.id} • ${tr('info.region')}: ${guild.preferredLocale} • ${tr('info.partnered')}: ${guild.partnered ? tr('common.yes') : tr('common.no')}` });
  if (icon) embed.setThumbnail(icon);
  if (owner) embed.setAuthor({ name: tr('info.ownedBy', { name: owner.user.username, id: owner.id }), iconURL: owner.user.displayAvatarURL({ extension: 'png', size: 128 }) });

  const links = [];
  if (icon) links.push(ui.link(tr('info.serverIcon'), guild.iconURL({ extension: 'png', size: 1024 })));
  if (guild.banner) links.push(ui.link(tr('info.serverBanner'), guild.bannerURL({ extension: 'png', size: 1024 })));
  return { embed, rows: links.length ? [ui.row(...links)] : [] };
}

const send = (ctx, { embed, rows }) => ui.sendEmbed(ctx, embed, { rows, extra: { allowedMentions: { parse: [] } } });

module.exports = { userInfo, serverInfo, dominantColour, send };
