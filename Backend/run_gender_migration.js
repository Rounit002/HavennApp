const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('Running gender migration...');
    
    // Read migration files
    const migration1 = fs.readFileSync('./migrations/008_add_gender_to_students.sql', 'utf8');
    const migration2 = fs.readFileSync('./migrations/009_add_gender_to_membership_history.sql', 'utf8');
    
    await client.query('BEGIN');
    
    // Run first migration
    console.log('Adding gender column to students table...');
    await client.query(migration1);
    
    // Run second migration
    console.log('Adding gender column to membership history table...');
    await client.query(migration2);
    
    await client.query('COMMIT');
    console.log('✅ Gender migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
