/*
 * Developed by cashholy (carti)
 * File: database/serverStats.js
 */

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS stats_messages_daily (
            id SERIAL PRIMARY KEY,
            "guildId" TEXT NOT NULL,
            "channelId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            date DATE NOT NULL,
            count INTEGER DEFAULT 0,
            UNIQUE ("guildId", "channelId", "userId", date)
        );
        CREATE INDEX IF NOT EXISTS idx_stats_messages_guild_date ON stats_messages_daily ("guildId", date);

        CREATE TABLE IF NOT EXISTS stats_reactions_daily (
            id SERIAL PRIMARY KEY,
            "guildId" TEXT NOT NULL,
            date DATE NOT NULL,
            count INTEGER DEFAULT 0,
            UNIQUE ("guildId", date)
        );

        CREATE TABLE IF NOT EXISTS stats_voice_daily (
            id SERIAL PRIMARY KEY,
            "guildId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            date DATE NOT NULL,
            seconds INTEGER DEFAULT 0,
            UNIQUE ("guildId", "userId", date)
        );
        CREATE INDEX IF NOT EXISTS idx_stats_voice_guild_date ON stats_voice_daily ("guildId", date);

        CREATE TABLE IF NOT EXISTS stats_membership_daily (
            id SERIAL PRIMARY KEY,
            "guildId" TEXT NOT NULL,
            date DATE NOT NULL,
            joins INTEGER DEFAULT 0,
            leaves INTEGER DEFAULT 0,
            UNIQUE ("guildId", date)
        );
    `);
}

// YYYY-MM-DD for "today", used as the bucket key everywhere below.
function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function daysAgoKey(days) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
}

// ---- writers (called from gateway trackers, usually batched) ----

const bumpMessage = (guildId, channelId, userId, count, date = todayKey()) =>
    run(
        `INSERT INTO stats_messages_daily ("guildId", "channelId", "userId", date, count)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("guildId", "channelId", "userId", date)
         DO UPDATE SET count = stats_messages_daily.count + $5`,
        [guildId, channelId, userId, date, count]
    );

const bumpReactions = (guildId, count, date = todayKey()) =>
    run(
        `INSERT INTO stats_reactions_daily ("guildId", date, count)
         VALUES ($1, $2, $3)
         ON CONFLICT ("guildId", date)
         DO UPDATE SET count = stats_reactions_daily.count + $3`,
        [guildId, date, count]
    );

const bumpVoiceSeconds = (guildId, userId, seconds, date = todayKey()) =>
    run(
        `INSERT INTO stats_voice_daily ("guildId", "userId", date, seconds)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("guildId", "userId", date)
         DO UPDATE SET seconds = stats_voice_daily.seconds + $4`,
        [guildId, userId, date, seconds]
    );

const bumpJoin = (guildId, date = todayKey()) =>
    run(
        `INSERT INTO stats_membership_daily ("guildId", date, joins, leaves)
         VALUES ($1, $2, 1, 0)
         ON CONFLICT ("guildId", date)
         DO UPDATE SET joins = stats_membership_daily.joins + 1`,
        [guildId, date]
    );

const bumpLeave = (guildId, date = todayKey()) =>
    run(
        `INSERT INTO stats_membership_daily ("guildId", date, joins, leaves)
         VALUES ($1, $2, 0, 1)
         ON CONFLICT ("guildId", date)
         DO UPDATE SET leaves = stats_membership_daily.leaves + 1`,
        [guildId, date]
    );

// ---- readers (used by the stats command) ----

// `exclude` = channel ids that must not count (hidden / staff channels).
const getMessageSum = async (guildId, days, exclude = []) => {
    const row = await getOne(
        'SELECT COALESCE(SUM(count), 0)::bigint AS total FROM stats_messages_daily WHERE "guildId" = $1 AND date >= $2 AND "channelId" <> ALL($3::text[])',
        [guildId, daysAgoKey(days), exclude]
    );
    return Number(row?.total ?? 0);
};

const getReactionSum = async (guildId, days) => {
    const row = await getOne(
        'SELECT COALESCE(SUM(count), 0)::bigint AS total FROM stats_reactions_daily WHERE "guildId" = $1 AND date >= $2',
        [guildId, daysAgoKey(days)]
    );
    return Number(row?.total ?? 0);
};

const getVoiceSecondsSum = async (guildId, days) => {
    const row = await getOne(
        'SELECT COALESCE(SUM(seconds), 0)::bigint AS total FROM stats_voice_daily WHERE "guildId" = $1 AND date >= $2',
        [guildId, daysAgoKey(days)]
    );
    return Number(row?.total ?? 0);
};

const getJoinsLeavesSum = async (guildId, days) => {
    const row = await getOne(
        'SELECT COALESCE(SUM(joins), 0)::bigint AS joins, COALESCE(SUM(leaves), 0)::bigint AS leaves FROM stats_membership_daily WHERE "guildId" = $1 AND date >= $2',
        [guildId, daysAgoKey(days)]
    );
    return { joins: Number(row?.joins ?? 0), leaves: Number(row?.leaves ?? 0) };
};

const getTopChannels = (guildId, days, limit = 3, exclude = []) =>
    getAll(
        `SELECT "channelId", SUM(count)::bigint AS total
         FROM stats_messages_daily
         WHERE "guildId" = $1 AND date >= $2 AND "channelId" <> ALL($4::text[])
         GROUP BY "channelId"
         ORDER BY total DESC
         LIMIT $3`,
        [guildId, daysAgoKey(days), limit, exclude]
    );

const getTopMembers = (guildId, days, limit = 3, exclude = []) =>
    getAll(
        `SELECT "userId", SUM(count)::bigint AS total
         FROM stats_messages_daily
         WHERE "guildId" = $1 AND date >= $2 AND "channelId" <> ALL($4::text[])
         GROUP BY "userId"
         ORDER BY total DESC
         LIMIT $3`,
        [guildId, daysAgoKey(days), limit, exclude]
    );

// One row per day for the last `days` days (oldest first), zero-filled for
// days with no activity so charts don't have gaps.
async function getDailySeries(guildId, days, exclude = []) {
    const [messages, reactions, voice, membership] = await Promise.all([
        getAll('SELECT date, SUM(count)::bigint AS count FROM stats_messages_daily WHERE "guildId" = $1 AND date >= $2 AND "channelId" <> ALL($3::text[]) GROUP BY date', [guildId, daysAgoKey(days), exclude]),
        getAll('SELECT date, count FROM stats_reactions_daily WHERE "guildId" = $1 AND date >= $2', [guildId, daysAgoKey(days)]),
        getAll('SELECT date, SUM(seconds)::bigint AS seconds FROM stats_voice_daily WHERE "guildId" = $1 AND date >= $2 GROUP BY date', [guildId, daysAgoKey(days)]),
        getAll('SELECT date, joins, leaves FROM stats_membership_daily WHERE "guildId" = $1 AND date >= $2', [guildId, daysAgoKey(days)]),
    ]);

    const toKey = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
    const msgMap = new Map(messages.map(r => [toKey(r.date), Number(r.count)]));
    const reactMap = new Map(reactions.map(r => [toKey(r.date), Number(r.count)]));
    const voiceMap = new Map(voice.map(r => [toKey(r.date), Number(r.seconds)]));
    const joinMap = new Map(membership.map(r => [toKey(r.date), Number(r.joins)]));
    const leaveMap = new Map(membership.map(r => [toKey(r.date), Number(r.leaves)]));

    const series = [];
    for (let i = days - 1; i >= 0; i--) {
        const key = daysAgoKey(i);
        series.push({
            date: key,
            messages: msgMap.get(key) || 0,
            reactions: reactMap.get(key) || 0,
            voiceSeconds: voiceMap.get(key) || 0,
            joins: joinMap.get(key) || 0,
            leaves: leaveMap.get(key) || 0,
        });
    }
    return series;
}

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    todayKey,
    daysAgoKey,
    bumpMessage,
    bumpReactions,
    bumpVoiceSeconds,
    bumpJoin,
    bumpLeave,
    getMessageSum,
    getReactionSum,
    getVoiceSecondsSum,
    getJoinsLeavesSum,
    getTopChannels,
    getTopMembers,
    getDailySeries,
};
