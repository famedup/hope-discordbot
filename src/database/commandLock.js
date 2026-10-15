/* ⌁ crafted by cashholy (carti) ⌁ */

const { pool, getOne, getAll, run } = require('./pg');

async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS locked_commands (
            command_name TEXT PRIMARY KEY,
            locked_at BIGINT NOT NULL,
            locked_by TEXT NOT NULL
        )
    `);
}

const lockCache = new Map();
const LOCK_CACHE_TTL = 10000;

function getCachedLock(commandName) {
    const entry = lockCache.get(commandName);
    if (entry && Date.now() - entry.ts < LOCK_CACHE_TTL) return entry.val;
    return undefined;
}
function setCachedLock(commandName, val) {
    lockCache.set(commandName, { val, ts: Date.now() });
}

async function lock(commandName, userId) {
    const name = commandName.toLowerCase();
    const result = await run(
        'INSERT INTO locked_commands (command_name, locked_at, locked_by) VALUES ($1, $2, $3) ON CONFLICT (command_name) DO UPDATE SET locked_at = $2, locked_by = $3',
        [name, Date.now(), userId]
    );
    setCachedLock(name, true);
    return result.changes > 0;
}

async function unlock(commandName) {
    const name = commandName.toLowerCase();
    const result = await run('DELETE FROM locked_commands WHERE command_name = $1', [name]);
    setCachedLock(name, false);
    return result.changes > 0;
}

async function isLocked(commandName) {
    const name = commandName.toLowerCase();
    const cached = getCachedLock(name);
    if (cached !== undefined) return cached;
    const row = await getOne('SELECT command_name FROM locked_commands WHERE command_name = $1', [name]);
    const val = row !== null;
    setCachedLock(name, val);
    return val;
}

async function getLockedInfo(commandName) {
    return getOne('SELECT * FROM locked_commands WHERE command_name = $1', [commandName.toLowerCase()]);
}

async function getAllLocked() {
    return getAll('SELECT * FROM locked_commands ORDER BY locked_at DESC');
}

const dbReady = initializeDatabase();

module.exports = {
    dbReady,
    lock,
    unlock,
    isLocked,
    getLockedInfo,
    getAllLocked
};
