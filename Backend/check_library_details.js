// Check library owner details
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.query('SELECT id, library_code, library_name, owner_phone FROM libraries', (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Library Owner Details:');
    res.rows.forEach(row => {
      console.log(`ID: ${row.id}, Code: ${row.library_code}, Name: ${row.library_name}, Phone: ${row.owner_phone}`);
    });
  }
  pool.end();
});
