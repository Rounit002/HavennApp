const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkSubscriptionFields() {
  try {
    // Check if subscription fields exist
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'libraries' 
      AND column_name IN ('subscription_plan', 'subscription_start_date', 'subscription_end_date', 'is_trial', 'is_subscription_active')
      ORDER BY column_name;
    `);
    
    console.log('Subscription fields in libraries table:');
    if (result.rows.length === 0) {
      console.log('❌ No subscription fields found! Migration needs to be run.');
    } else {
      result.rows.forEach(row => {
        console.log(`✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
      });
    }
    
    // Check sample library data
    console.log('\nSample library data:');
    const libraryResult = await pool.query(`
      SELECT id, library_code, library_name, subscription_plan, is_trial, is_subscription_active 
      FROM libraries 
      LIMIT 3
    `);
    
    if (libraryResult.rows.length === 0) {
      console.log('No libraries found in database');
    } else {
      libraryResult.rows.forEach(row => {
        console.log(`ID: ${row.id}, Code: ${row.library_code}, Plan: ${row.subscription_plan}, Trial: ${row.is_trial}, Active: ${row.is_subscription_active}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking subscription fields:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

checkSubscriptionFields();
