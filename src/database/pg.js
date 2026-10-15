// [dev] cashholy (carti) :: database/pg.js

const { Pool } = require('pg');
const config = require('../settings/index.js');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || config.DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: false
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected error on idle client:', err.message);
});

const query = async (text, params) => {
    const res = await pool.query(text, params);
    return res;
};

const getOne = async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows[0] || null;
};

const getAll = async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows;
};

const run = async (text, params) => {
    const res = await pool.query(text, params);
    return { changes: res.rowCount };
};

module.exports = { pool, query, getOne, getAll, run };
