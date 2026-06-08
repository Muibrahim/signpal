/**
 * Database connection pool.
 * This module is the ONLY place that may construct `new Pool()`.
 * All database access goes through named functions in entity files.
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

module.exports = pool;