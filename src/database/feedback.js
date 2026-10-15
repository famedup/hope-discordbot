/** @author cashholy (carti) */

const { pool, getOne, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS feedback_config (
            guild_id TEXT PRIMARY KEY,
            review_channel_id TEXT,
            log_channel_id TEXT
        );
    `);
}

const getConfig = (guildId) =>
    getOne('SELECT * FROM feedback_config WHERE guild_id = $1', [guildId]);

const setConfig = (guildId, reviewChannelId, logChannelId) =>
    run(
        'INSERT INTO feedback_config (guild_id, review_channel_id, log_channel_id) VALUES ($1, $2, $3) ON CONFLICT (guild_id) DO UPDATE SET review_channel_id = $2, log_channel_id = $3',
        [guildId, reviewChannelId, logChannelId]
    );

const deleteConfig = (guildId) =>
    run('DELETE FROM feedback_config WHERE guild_id = $1', [guildId]);

const dbReady = initializeDatabase();

module.exports = { dbReady, getConfig, setConfig, deleteConfig };
