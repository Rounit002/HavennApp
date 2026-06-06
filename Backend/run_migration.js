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
    console.log('Running subscription fields migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_add_subscription_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration SQL:', migrationSQL);
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('Subscription fields added to libraries table.');
    
    // Verify the fields were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'libraries' 
      AND column_name IN ('subscription_plan', 'subscription_start_date', 'subscription_end_date', 'is_trial', 'is_subscription_active')
      ORDER BY column_name;
    `);
    
    console.log('\nVerification - Added fields:');
    result.rows.forEach(row => {
      console.log(`✅ ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
