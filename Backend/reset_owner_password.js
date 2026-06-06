// Reset password for a library owner
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Set the phone number of the owner you want to reset password for
const OWNER_PHONE = '9876543210';  // From check_library_details.js output

// Set the new password you want to use
const NEW_PASSWORD = 'testpassword123';

async function resetOwnerPassword() {
  try {
    // Check if owner exists
    const ownerCheck = await pool.query(
      'SELECT id, library_name FROM libraries WHERE owner_phone = $1',
      [OWNER_PHONE]
    );
    
    if (ownerCheck.rows.length === 0) {
      console.log('❌ Owner with phone number not found');
      return;
    }
    
    const owner = ownerCheck.rows[0];
    console.log(`✅ Found owner: ${owner.library_name} (ID: ${owner.id})`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
    console.log('✅ Password hashed successfully');
    
    // Update the password in the database
    await pool.query(
      'UPDATE libraries SET password = $1 WHERE owner_phone = $2',
      [hashedPassword, OWNER_PHONE]
    );
    
    console.log(`✅ Password reset successfully for owner with phone: ${OWNER_PHONE}`);
    console.log(`   New password: ${NEW_PASSWORD}`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    pool.end();
  }
}

resetOwnerPassword();
