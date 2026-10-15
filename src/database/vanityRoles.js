/*
 * Developed by cashholy (carti)
 * File: database/vanityRoles.js
 */

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vanity_role_config (
            id SERIAL PRIMARY KEY,
            "guildId" TEXT NOT NULL UNIQUE,
            "roleId" TEXT NOT NULL,
            "vanityCode" TEXT NOT NULL,
            "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()))
        );
        CREATE TABLE IF NOT EXISTS vanity_role_users (
            id SERIAL PRIMARY KEY,
            "guildId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "grantedAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())),
            UNIQUE("guildId", "userId")
        );
    `);
}

const insertOrUpdateConfig = (guildId, roleId, vanityCode) =>
    run(
        `INSERT INTO vanity_role_config ("guildId", "roleId", "vanityCode") VALUES ($1, $2, $3)
         ON CONFLICT("guildId") DO UPDATE SET "roleId" = $2, "vanityCode" = $3`,
        [guildId, roleId, vanityCode]
    );

const getConfig = (guildId) =>
    getOne('SELECT * FROM vanity_role_config WHERE "guildId" = $1', [guildId]);

const deleteConfig = (guildId) =>
    run('DELETE FROM vanity_role_config WHERE "guildId" = $1', [guildId]);

const deleteGuildData = (guildId) =>
    run('DELETE FROM vanity_role_users WHERE "guildId" = $1', [guildId]);

const addVanityUser = (guildId, userId) =>
    run('INSERT INTO vanity_role_users ("guildId", "userId") VALUES ($1, $2) ON CONFLICT DO NOTHING', [guildId, userId]);

const hasVanityRole = (guildId, userId) =>
    getOne('SELECT 1 FROM vanity_role_users WHERE "guildId" = $1 AND "userId" = $2', [guildId, userId]);

const getVanityUsers = async (guildId) => {
    const result = await getOne('SELECT COUNT(*) as total FROM vanity_role_users WHERE "guildId" = $1', [guildId]);
    return { total: parseInt(result?.total || 0) };
};

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    insertOrUpdateConfig,
    getConfig,
    deleteConfig,
    deleteGuildData,
    addVanityUser,
    hasVanityRole,
    getVanityUsers
};
