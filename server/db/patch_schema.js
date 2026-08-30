const db = require('../src/db');

async function patch() {
  console.log('🔧 Updating orders table schema in PostgreSQL...');
  try {
    // 1. Alter table_number column to VARCHAR(255) so identifiers like "Table 4" or "Bar 1" work!
    await db.query(`
      ALTER TABLE orders 
      ALTER COLUMN table_number TYPE VARCHAR(255) USING table_number::text;
    `);

    // 2. Add notes column to orders table if not exists
    await db.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    console.log('✅ PostgreSQL schema updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Schema patch error:', err);
    process.exit(1);
  }
}

patch();
