const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool using Supabase/Postgres connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  /**
   * Execute a SQL query with parameter values
   * @param {string} text - SQL query string
   * @param {Array} params - Parameter array
   */
  query: (text, params) => pool.query(text, params),

  /**
   * Get a client from pool for multi-query transaction
   */
  getClient: () => pool.connect(),

  pool
};
