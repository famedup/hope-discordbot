// »» engineered by cashholy (carti) ««

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_history (
            id SERIAL PRIMARY KEY,
            "guildId" TEXT NOT NULL,
            "channelId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
            day TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_user_channel ON ai_history("userId", "channelId", "guildId");
        CREATE INDEX IF NOT EXISTS idx_timestamp ON ai_history(timestamp);
    `);
}

const saveMessage = async (guildId, channelId, userId, role, content) => {
    const timestamp = Date.now();
    const day = new Date().toISOString().split('T')[0];
    await run(
        'INSERT INTO ai_history ("guildId", "channelId", "userId", role, content, timestamp, day) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [guildId, channelId, userId, role, content, timestamp, day]
    );
};

const getHistory = async (userId, channelId = null, guildId = null) => {
    let rows;
    if (channelId && guildId) {
        rows = await getAll(
            'SELECT role, content, timestamp FROM ai_history WHERE "userId" = $1 AND "channelId" = $2 AND "guildId" = $3 ORDER BY timestamp DESC LIMIT 20',
            [userId, channelId, guildId]
        );
    } else {
        rows = await getAll(
            'SELECT role, content, timestamp FROM ai_history WHERE "userId" = $1 ORDER BY timestamp DESC LIMIT 20',
            [userId]
        );
    }
    return rows.reverse();
};

const clearUserHistory = (userId) =>
    run('DELETE FROM ai_history WHERE "userId" = $1', [userId]);

const clearChannelHistory = (guildId, channelId) =>
    run('DELETE FROM ai_history WHERE "guildId" = $1 AND "channelId" = $2', [guildId, channelId]);

const cleanupOldHistory = async () => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const result = await run('DELETE FROM ai_history WHERE timestamp < $1', [thirtyDaysAgo]);
    if (result.changes > 0) {
        console.log(`[AI History] Cleaned up ${result.changes} old messages`);
    }
    return result.changes;
};

setInterval(() => {
    cleanupOldHistory().catch(err => console.error('[AI History] Cleanup error:', err.message));
}, 24 * 60 * 60 * 1000);

const dbReady = initializeDatabase().then(() => cleanupOldHistory()).catch(err => console.error('[AI History] Init error:', err.message));

module.exports = {
    dbReady,
    saveMessage,
    getHistory,
    clearUserHistory: (userId) => clearUserHistory(userId),
    clearChannelHistory: (guildId, channelId) => clearChannelHistory(guildId, channelId),
    cleanupOldHistory
};
