const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration from environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function runMigration() {
  try {
    console.log('Running migrations...');

    const migrations = [
      '002_add_subscription_fields.sql',
      '010_add_google_play_fields.sql',
    ];

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, 'migrations', migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      console.log(`Running migration: ${migrationFile}`);
      await pool.query(migrationSQL);
    }

    console.log('Migrations completed successfully!');
    console.log('Subscription and Google Play fields added to libraries table.');

    // Verify the fields were added
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'libraries'
      AND column_name IN (
        'subscription_plan',
        'subscription_start_date',
        'subscription_end_date',
        'is_trial',
        'is_subscription_active',
        'google_play_purchase_token',
        'google_play_product_id',
        'google_play_subscription_id'
      )
      ORDER BY column_name;
    `);

    console.log('\nVerification - Added fields:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
