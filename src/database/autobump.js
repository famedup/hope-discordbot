/**
 * ┌ cashholy (carti)
 * └ database/autobump.js
 */

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS autobump (
            "guildId" TEXT PRIMARY KEY,
            "channelId" TEXT NOT NULL,
            message TEXT NOT NULL,
            "intervalMs" BIGINT NOT NULL DEFAULT 3600000,
            enabled INTEGER NOT NULL DEFAULT 0,
            "deleteAfterMs" BIGINT NOT NULL DEFAULT 60000,
            "lastBumpAt" BIGINT DEFAULT 0
        )
    `);
}

const getConfig = (guildId) =>
    getOne('SELECT * FROM autobump WHERE "guildId" = $1', [guildId]);

const setConfig = (data) =>
    run(
        `INSERT INTO autobump ("guildId", "channelId", message, "intervalMs", enabled, "deleteAfterMs", "lastBumpAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT ("guildId") DO UPDATE SET
             "channelId" = $2, message = $3, "intervalMs" = $4, enabled = $5, "deleteAfterMs" = $6, "lastBumpAt" = $7`,
        [data.guildId, data.channelId, data.message, data.intervalMs, data.enabled, data.deleteAfterMs, data.lastBumpAt]
    );

const updateEnabled = (enabled, guildId) =>
    run('UPDATE autobump SET enabled = $1 WHERE "guildId" = $2', [enabled, guildId]);

const updateLastBump = (lastBumpAt, guildId) =>
    run('UPDATE autobump SET "lastBumpAt" = $1 WHERE "guildId" = $2', [lastBumpAt, guildId]);

const deleteConfig = (guildId) =>
    run('DELETE FROM autobump WHERE "guildId" = $1', [guildId]);

const getAllEnabled = () =>
    getAll('SELECT * FROM autobump WHERE enabled = 1');

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    getConfig,
    setConfig,
    updateEnabled,
    updateLastBump,
    deleteConfig,
    getAllEnabled
};
