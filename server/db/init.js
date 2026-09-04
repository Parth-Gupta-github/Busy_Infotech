const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function initDatabase() {
  try {
    console.log('Connecting to PostgreSQL database and applying schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await db.query(sql);
    console.log('✅ Database schema initialized successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err);
    process.exit(1);
  } finally {
    try {
      if (db.pool) await db.pool.end();
    } catch (e) {
      // Ignore pool closing error on exit
    }
  }
}

initDatabase();
