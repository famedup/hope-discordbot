// ▛▀ cashholy (carti) ▀▜

const { pool, getOne, getAll, run } = require('./pg');
const { GuildConfig } = require('./schemas');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_channels (
            id SERIAL PRIMARY KEY,
            "guildId" TEXT NOT NULL,
            "channelId" TEXT NOT NULL,
            "enabledBy" TEXT NOT NULL,
            "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
            UNIQUE("guildId", "channelId")
        );
    `);
}

const aiChannelCache = new Map();
const AI_CHANNEL_CACHE_TTL = 30000;

function getCachedAiChannel(guildId, channelId) {
    const key = `${guildId}:${channelId}`;
    const e = aiChannelCache.get(key);
    if (e && Date.now() - e.ts < AI_CHANNEL_CACHE_TTL) return e.val;
    return undefined;
}
function setCachedAiChannel(guildId, channelId, val) {
    aiChannelCache.set(`${guildId}:${channelId}`, { val, ts: Date.now() });
}

const enableAiChannel = async (guildId, channelId, enabledBy) => {
    const result = await run(`INSERT INTO ai_channels ("guildId", "channelId", "enabledBy")
         VALUES ($1, $2, $3)
         ON CONFLICT("guildId", "channelId") DO UPDATE SET "enabledBy" = $3`, [guildId, channelId, enabledBy]);
    setCachedAiChannel(guildId, channelId, true);
    return result;
};

const disableAiChannel = async (guildId, channelId) => {
    const result = await run('DELETE FROM ai_channels WHERE "guildId" = $1 AND "channelId" = $2', [guildId, channelId]);
    setCachedAiChannel(guildId, channelId, false);
    return result;
};

const getAiChannel = (guildId, channelId) =>
    getOne('SELECT 1 FROM ai_channels WHERE "guildId" = $1 AND "channelId" = $2', [guildId, channelId]);

const getAllAiChannels = (guildId) =>
    getAll('SELECT * FROM ai_channels WHERE "guildId" = $1', [guildId]);

const isAiChannel = async (guildId, channelId) => {
    const cached = getCachedAiChannel(guildId, channelId);
    if (cached !== undefined) return cached;

    const row = await getAiChannel(guildId, channelId);
    if (row) {
        setCachedAiChannel(guildId, channelId, true);
        return true;
    }

    try {
        const guildConfig = await GuildConfig.findOne({ where: { guildId } });
        if (guildConfig && Array.isArray(guildConfig.aiChannelIds)) {
            const result = guildConfig.aiChannelIds.includes(channelId);
            setCachedAiChannel(guildId, channelId, result);
            return result;
        }
    } catch (err) {
        console.error('[AI_CHANNEL] Error checking GuildConfig:', err.message);
    }

    setCachedAiChannel(guildId, channelId, false);
    return false;
};

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    enableAiChannel,
    disableAiChannel,
    getAiChannel,
    getAllAiChannels,
    isAiChannel
};
