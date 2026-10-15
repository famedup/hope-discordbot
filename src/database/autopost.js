// ─── cashholy (carti) · developer ───

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS autopost (
            "guildId" TEXT NOT NULL,
            category TEXT NOT NULL,
            "channelId" TEXT NOT NULL,
            PRIMARY KEY ("guildId", category)
        )
    `);
}

const getConfig = (guildId, category) =>
    getOne('SELECT * FROM autopost WHERE "guildId" = $1 AND category = $2', [guildId, category]);

const getAllForGuild = (guildId) =>
    getAll('SELECT * FROM autopost WHERE "guildId" = $1', [guildId]);

const getAllConfigs = () =>
    getAll('SELECT * FROM autopost', []);

const setConfig = (data) =>
    run(
        `INSERT INTO autopost ("guildId", category, "channelId")
         VALUES ($1, $2, $3)
         ON CONFLICT ("guildId", category) DO UPDATE SET "channelId" = $3`,
        [data.guildId, data.category, data.channelId]
    );

const deleteConfig = (guildId, category) =>
    run('DELETE FROM autopost WHERE "guildId" = $1 AND category = $2', [guildId, category]);

const deleteAllForGuild = (guildId) =>
    run('DELETE FROM autopost WHERE "guildId" = $1', [guildId]);

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    getConfig,
    getAllForGuild,
    getAllConfigs,
    setConfig,
    deleteConfig,
    deleteAllForGuild
};
