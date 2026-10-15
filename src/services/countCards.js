// »» engineered by cashholy (carti) ««

// hope — minimal count cards (membercount / boostcount).
//
// One big number, one caption, one line of detail. Shared by the prefix
// commands (mc, bc) and the slash subcommands so they always look the same.

const ui = require('./ui');

/** Make sure the member cache is complete; fall back to whatever is cached if Discord is slow. */
async function ensureMembers(guild) {
  if (guild.members.cache.size >= guild.memberCount) return;
  try { await guild.members.fetch(); } catch (_) { /* use the cache we have */ }
}

/**
 *   ## 1,234
 *   -# Total Members · My Server
 *   **1,100** Humans · **134** Bots
 */
async function memberCard(guild, tr) {
  await ensureMembers(guild);
  const bots = guild.members.cache.filter(m => m.user.bot).size;
  const humans = Math.max(0, guild.memberCount - bots);

  return ui.box().addTextDisplayComponents(ui.text([
    `## ${tr.num(guild.memberCount)}`,
    ui.sub(`${tr('membercount.total')} · ${guild.name}`),
    `**${tr.num(humans)}** ${tr('membercount.humans')} · **${tr.num(bots)}** ${tr('membercount.bots')}`,
  ].join('\n')));
}

/**
 *   ## 14
 *   -# Boosts · My Server
 *   Level 2 · **6** Boosters
 */
async function boostCard(guild, tr) {
  await ensureMembers(guild);
  const boosts = guild.premiumSubscriptionCount ?? 0;
  const boosters = guild.members.cache.filter(m => m.premiumSinceTimestamp).size;

  return ui.box().addTextDisplayComponents(ui.text([
    `## ${tr.num(boosts)}`,
    ui.sub(`${tr('info.boostsLabel')} · ${guild.name}`),
    `${tr('info.level')} ${guild.premiumTier} · **${tr.num(boosters)}** ${tr('info.boosters')}`,
  ].join('\n')));
}

module.exports = { memberCard, boostCard };
