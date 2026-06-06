const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkAndFixSchema() {
  try {
    console.log('Checking admission_requests table schema...');
    
    // Check if the table exists and get its columns
    const checkTableQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'admission_requests' 
      ORDER BY ordinal_position;
    `;
    
    const result = await pool.query(checkTableQuery);
    
    if (result.rows.length === 0) {
      console.log('Table does not exist. Creating admission_requests table...');
      
      // Create the table with the correct schema
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS admission_requests (
          id SERIAL PRIMARY KEY,
          library_id INTEGER NOT NULL,
          
          -- Student Information (matching students table structure)
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(15) NOT NULL,
          address TEXT,
          registration_number VARCHAR(50),
          father_name VARCHAR(255),
          aadhar_number VARCHAR(20),
          
          -- Membership Details
          branch_id INTEGER,
          membership_start DATE,
          membership_end DATE,
          total_fee NUMERIC DEFAULT 0,
          amount_paid NUMERIC DEFAULT 0,
          due_amount NUMERIC DEFAULT 0,
          cash NUMERIC DEFAULT 0,
          online NUMERIC DEFAULT 0,
          security_money NUMERIC DEFAULT 0,
          discount NUMERIC DEFAULT 0,
          
          -- Additional Fields
          remark TEXT,
          profile_image_url TEXT,
          aadhaar_front_url TEXT,
          aadhaar_back_url TEXT,
          
          -- Seat and Shift (stored as JSON for flexibility)
          shift_ids TEXT, -- JSON array of shift IDs
          seat_id INTEGER,
          locker_id INTEGER,
          
          -- Request Status and Metadata
          status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
          created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP WITHOUT TIME ZONE,
          processed_by INTEGER, -- user_id who processed the request
          rejection_reason TEXT,
          
          -- Foreign Key Constraints
          CONSTRAINT fk_admission_requests_library FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE,
          CONSTRAINT fk_admission_requests_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE SET NULL,
          CONSTRAINT fk_admission_requests_locker FOREIGN KEY (locker_id) REFERENCES locker(id) ON DELETE SET NULL,
          CONSTRAINT fk_admission_requests_processed_by FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
          
          -- Indexes for better performance
          CONSTRAINT idx_admission_requests_library_status UNIQUE (library_id, phone, status)
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_admission_requests_library_id ON admission_requests(library_id);
        CREATE INDEX IF NOT EXISTS idx_admission_requests_status ON admission_requests(status);
        CREATE INDEX IF NOT EXISTS idx_admission_requests_created_at ON admission_requests(created_at);
        CREATE INDEX IF NOT EXISTS idx_admission_requests_phone ON admission_requests(phone);
      `;
      
      await pool.query(createTableQuery);
      console.log('✅ admission_requests table created successfully!');
      
    } else {
      console.log('Table exists. Current columns:');
      result.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Define all required columns and their types
      const requiredColumns = {
        'branch_id': 'INTEGER',
        'seat_id': 'INTEGER',
        'locker_id': 'INTEGER',
        'shift_ids': 'TEXT',
        'membership_start': 'DATE',
        'membership_end': 'DATE',
        'total_fee': 'NUMERIC DEFAULT 0',
        'amount_paid': 'NUMERIC DEFAULT 0',
        'due_amount': 'NUMERIC DEFAULT 0',
        'cash': 'NUMERIC DEFAULT 0',
        'online': 'NUMERIC DEFAULT 0',
        'security_money': 'NUMERIC DEFAULT 0',
        'discount': 'NUMERIC DEFAULT 0',
        'registration_number': 'VARCHAR(50)',
        'processed_at': 'TIMESTAMP WITHOUT TIME ZONE',
        'processed_by': 'INTEGER',
        'rejection_reason': 'TEXT'
      };
      
      const existingColumns = result.rows.map(row => row.column_name);
      
      // Add missing columns
      for (const [columnName, columnType] of Object.entries(requiredColumns)) {
        if (!existingColumns.includes(columnName)) {
          console.log(`Adding missing ${columnName} column...`);
          try {
            await pool.query(`ALTER TABLE admission_requests ADD COLUMN ${columnName} ${columnType};`);
            console.log(`✅ ${columnName} column added successfully!`);
          } catch (error) {
            console.error(`❌ Error adding ${columnName} column:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ Schema check and fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error checking/fixing schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the schema check and fix
checkAndFixSchema()
  .then(() => {
    console.log('Schema fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Schema fix failed:', error);
    process.exit(1);
  });
