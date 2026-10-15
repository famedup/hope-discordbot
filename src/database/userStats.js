// [dev] cashholy (carti) :: database/userStats.js

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_messages (
            id SERIAL PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "guildId" TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            UNIQUE("userId", "guildId")
        );
        CREATE TABLE IF NOT EXISTS user_invites (
            id SERIAL PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "guildId" TEXT NOT NULL,
            "inviteCode" TEXT NOT NULL,
            uses INTEGER DEFAULT 0,
            UNIQUE("userId", "guildId", "inviteCode")
        );
        CREATE INDEX IF NOT EXISTS idx_user_messages_guild_count
            ON user_messages ("guildId", count DESC);
    `);
}

const incrementUserMessage = (userId, guildId) =>
    run(
        `INSERT INTO user_messages ("userId", "guildId", count) VALUES ($1, $2, 1)
         ON CONFLICT("userId", "guildId") DO UPDATE SET count = user_messages.count + 1`,
        [userId, guildId]
    );

const getUserMessageCount = (userId, guildId) =>
    getOne('SELECT count FROM user_messages WHERE "userId" = $1 AND "guildId" = $2', [userId, guildId]);

const getMessageLeaderboard = (guildId, limit, offset) =>
    getAll('SELECT "userId", count FROM user_messages WHERE "guildId" = $1 ORDER BY count DESC LIMIT $2 OFFSET $3', [guildId, limit, offset]);

const getTotalMessageUsers = async (guildId) => {
    const result = await getOne('SELECT COUNT(*) as total FROM user_messages WHERE "guildId" = $1', [guildId]);
    return { total: parseInt(result?.total || 0) };
};

const addInviteUse = (userId, guildId, inviteCode) =>
    run(
        `INSERT INTO user_invites ("userId", "guildId", "inviteCode", uses) VALUES ($1, $2, $3, 1)
         ON CONFLICT("userId", "guildId", "inviteCode") DO UPDATE SET uses = user_invites.uses + 1`,
        [userId, guildId, inviteCode]
    );

const getInviteLeaderboard = (guildId, limit, offset) =>
    getAll(
        `SELECT "userId", SUM(uses) as "totalUses"
         FROM user_invites WHERE "guildId" = $1
         GROUP BY "userId"
         ORDER BY "totalUses" DESC LIMIT $2 OFFSET $3`,
        [guildId, limit, offset]
    );

const getTotalInviteUsers = async (guildId) => {
    const result = await getOne('SELECT COUNT(DISTINCT "userId") as total FROM user_invites WHERE "guildId" = $1', [guildId]);
    return { total: parseInt(result?.total || 0) };
};

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    incrementUserMessage,
    getUserMessageCount,
    getMessageLeaderboard,
    getTotalMessageUsers,
    addInviteUse,
    getInviteLeaderboard,
    getTotalInviteUsers
};
