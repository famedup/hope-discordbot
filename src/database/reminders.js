/**
 * @file reminders.js
 * @developer cashholy (carti)
 */

const { pool, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS reminders (
            id SERIAL PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "channelId" TEXT NOT NULL,
            "guildId" TEXT,
            message TEXT NOT NULL,
            "triggerAt" BIGINT NOT NULL,
            "createdAt" BIGINT NOT NULL
        )
    `);
}

const addReminder = (userId, channelId, guildId, message, triggerAt) =>
    pool.query(
        `INSERT INTO reminders ("userId", "channelId", "guildId", message, "triggerAt", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [userId, channelId, guildId || null, message, triggerAt, Date.now()]
    );

const deleteReminder = (id) =>
    run('DELETE FROM reminders WHERE id = $1', [id]);

const getPendingReminders = (now) =>
    getAll('SELECT * FROM reminders WHERE "triggerAt" <= $1', [now]);

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    addReminder,
    deleteReminder,
    getPendingReminders,
};
