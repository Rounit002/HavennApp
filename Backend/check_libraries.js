const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkLibraries() {
  try {
    const result = await pool.query('SELECT id, library_code, library_name FROM libraries LIMIT 5');
    console.log('Libraries in database:');
    if (result.rows.length === 0) {
      console.log('No libraries found in database');
    } else {
      result.rows.forEach(row => {
        console.log(`ID: ${row.id}, Code: ${row.library_code}, Name: ${row.library_name}`);
      });
    }
  } catch (error) {
    console.error('Error checking libraries:', error.message);
  } finally {
    await pool.end();
  }
}

checkLibraries();
