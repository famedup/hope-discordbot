/**
 * @file mediaDb.js
 * @developer cashholy (carti)
 */

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS media_channels (
            guild_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS media_bypass (
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            PRIMARY KEY (guild_id, user_id)
        );
    `);
}

const setMediaChannel = (guildId, channelId) =>
    run('INSERT INTO media_channels (guild_id, channel_id) VALUES ($1, $2) ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2', [guildId, channelId]);
const getMediaChannel = (guildId) =>
    getOne('SELECT channel_id FROM media_channels WHERE guild_id = $1', [guildId]);
const removeMediaChannel = (guildId) =>
    run('DELETE FROM media_channels WHERE guild_id = $1', [guildId]);

const addBypass = (guildId, userId) =>
    run('INSERT INTO media_bypass (guild_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [guildId, userId]);
const removeBypass = (guildId, userId) =>
    run('DELETE FROM media_bypass WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
const getBypass = (guildId, userId) =>
    getOne('SELECT 1 FROM media_bypass WHERE guild_id = $1 AND user_id = $2', [guildId, userId]);
const getAllBypasses = (guildId) =>
    getAll('SELECT user_id FROM media_bypass WHERE guild_id = $1', [guildId]);
const getBypassCount = async (guildId) => {
    const result = await getOne('SELECT COUNT(*) as count FROM media_bypass WHERE guild_id = $1', [guildId]);
    return parseInt(result?.count || 0);
};

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    setMediaChannel,
    getMediaChannel,
    removeMediaChannel,
    addBypass,
    removeBypass,
    getBypass,
    getAllBypasses,
    getBypassCount,
};
