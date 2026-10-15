// @cashholy(carti) — ignoreDb

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ignored_commands (
            guild_id TEXT NOT NULL,
            command_name TEXT NOT NULL,
            PRIMARY KEY (guild_id, command_name)
        );
        CREATE TABLE IF NOT EXISTS ignored_channels (
            guild_id TEXT NOT NULL,
            channel_id TEXT NOT NULL,
            PRIMARY KEY (guild_id, channel_id)
        );
        CREATE TABLE IF NOT EXISTS ignored_users (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            PRIMARY KEY (guild_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS bypassed_users (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            PRIMARY KEY (guild_id, user_id)
        );
    `);
}

const CACHE_TTL = 30000;
const ignoredCommandCache = new Map();
const ignoredChannelCache = new Map();
const ignoredUserCache = new Map();
const bypassUserCache = new Map();

function getCached(cache, key) {
    const e = cache.get(key);
    if (e && Date.now() - e.ts < CACHE_TTL) return e.val;
    return undefined;
}
function setCache(cache, key, val) {
    cache.set(key, { val, ts: Date.now() });
}

const addIgnoredCommand = async (guildId, commandName) => {
    const result = await run('INSERT INTO ignored_commands (guild_id, command_name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guildId, commandName]);
    setCache(ignoredCommandCache, `${guildId}:${commandName}`, { 1: 1 });
    return result;
};
const removeIgnoredCommand = async (guildId, commandName) => {
    const result = await run('DELETE FROM ignored_commands WHERE guild_id = $1 AND command_name = $2', [guildId, commandName]);
    ignoredCommandCache.delete(`${guildId}:${commandName}`);
    return result;
};
const getIgnoredCommand = async (guildId, commandName) => {
    const key = `${guildId}:${commandName}`;
    const cached = getCached(ignoredCommandCache, key);
    if (cached !== undefined) return cached;
    const val = await getOne('SELECT 1 FROM ignored_commands WHERE guild_id = $1 AND command_name = $2', [guildId, commandName]);
    setCache(ignoredCommandCache, key, val);
    return val;
};
const getAllIgnoredCommands = (guildId) =>
    getAll('SELECT command_name FROM ignored_commands WHERE guild_id = $1', [guildId]);
const getIgnoredCommandsCount = async (guildId) => {
    const result = await getOne('SELECT COUNT(*) as count FROM ignored_commands WHERE guild_id = $1', [guildId]);
    return parseInt(result?.count || 0);
};

const addIgnoredChannel = async (guildId, channelId) => {
    const result = await run('INSERT INTO ignored_channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guildId, channelId]);
    setCache(ignoredChannelCache, `${guildId}:${channelId}`, { 1: 1 });
    return result;
};
const removeIgnoredChannel = async (guildId, channelId) => {
    const result = await run('DELETE FROM ignored_channels WHERE guild_id = $1 AND channel_id = $2', [guildId, channelId]);
    ignoredChannelCache.delete(`${guildId}:${channelId}`);
    return result;
};
const getIgnoredChannel = async (guildId, channelId) => {
    const key = `${guildId}:${channelId}`;
    const cached = getCached(ignoredChannelCache, key);
    if (cached !== undefined) return cached;
    const val = await getOne('SELECT 1 FROM ignored_channels WHERE guild_id = $1 AND channel_id = $2', [guildId, channelId]);
    setCache(ignoredChannelCache, key, val);
    return val;
};
const getAllIgnoredChannels = (guildId) =>
    getAll('SELECT channel_id FROM ignored_channels WHERE guild_id = $1', [guildId]);
const getIgnoredChannelsCount = async (guildId) => {
    const result = await getOne('SELECT COUNT(*) as count FROM ignored_channels WHERE guild_id = $1', [guildId]);
    return parseInt(result?.count || 0);
};

const addIgnoredUser = async (guildId, userId) => {
    const result = await run('INSERT INTO ignored_users (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guildId, userId]);
    setCache(ignoredUserCache, `${guildId}:${userId}`, { 1: 1 });
    return result;
};
const removeIgnoredUser = async (guildId, userId) => {
    const result = await run('DELETE FROM ignored_users WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    ignoredUserCache.delete(`${guildId}:${userId}`);
    return result;
};
const getIgnoredUser = async (guildId, userId) => {
    const key = `${guildId}:${userId}`;
    const cached = getCached(ignoredUserCache, key);
    if (cached !== undefined) return cached;
    const val = await getOne('SELECT 1 FROM ignored_users WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    setCache(ignoredUserCache, key, val);
    return val;
};
const getAllIgnoredUsers = (guildId) =>
    getAll('SELECT user_id FROM ignored_users WHERE guild_id = $1', [guildId]);
const getIgnoredUsersCount = async (guildId) => {
    const result = await getOne('SELECT COUNT(*) as count FROM ignored_users WHERE guild_id = $1', [guildId]);
    return parseInt(result?.count || 0);
};

const addBypassUser = async (guildId, userId) => {
    const result = await run('INSERT INTO bypassed_users (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guildId, userId]);
    setCache(bypassUserCache, `${guildId}:${userId}`, { 1: 1 });
    return result;
};
const removeBypassUser = async (guildId, userId) => {
    const result = await run('DELETE FROM bypassed_users WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    bypassUserCache.delete(`${guildId}:${userId}`);
    return result;
};
const getBypassUser = async (guildId, userId) => {
    const key = `${guildId}:${userId}`;
    const cached = getCached(bypassUserCache, key);
    if (cached !== undefined) return cached;
    const val = await getOne('SELECT 1 FROM bypassed_users WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
    setCache(bypassUserCache, key, val);
    return val;
};
const getAllBypassUsers = (guildId) =>
    getAll('SELECT user_id FROM bypassed_users WHERE guild_id = $1', [guildId]);
const getBypassUsersCount = async (guildId) => {
    const result = await getOne('SELECT COUNT(*) as count FROM bypassed_users WHERE guild_id = $1', [guildId]);
    return parseInt(result?.count || 0);
};

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    addIgnoredCommand,
    removeIgnoredCommand,
    getIgnoredCommand,
    getAllIgnoredCommands,
    getIgnoredCommandsCount,
    addIgnoredChannel,
    removeIgnoredChannel,
    getIgnoredChannel,
    getAllIgnoredChannels,
    getIgnoredChannelsCount,
    addIgnoredUser,
    removeIgnoredUser,
    getIgnoredUser,
    getAllIgnoredUsers,
    getIgnoredUsersCount,
    addBypassUser,
    removeBypassUser,
    getBypassUser,
    getAllBypassUsers,
    getBypassUsersCount,
};
