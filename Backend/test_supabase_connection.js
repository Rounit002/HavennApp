const { Pool } = require('pg');

// Test Supabase connection specifically
const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  console.log('Host:', process.env.DB_HOST);
  console.log('Port:', process.env.DB_PORT);
  console.log('Database:', process.env.DB_NAME);
  console.log('User:', process.env.DB_USER);
  
  const config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 10000
  };

  const pool = new Pool(config);
  
  try {
    console.log('Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connected to Supabase!');
    
    const result = await client.query('SELECT version(), NOW()');
    console.log('Database version:', result.rows[0].version);
    console.log('Current time:', result.rows[0].now);
    
    // Test a simple table query
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 5
    `);
    console.log('Available tables:', tables.rows.map(r => r.table_name));
    
    client.release();
    await pool.end();
    console.log('✅ Connection test successful');
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Hint:', error.hint);
    
    if (error.code === 'ETIMEDOUT') {
      console.error('\n🔧 Timeout troubleshooting:');
      console.error('1. Check if Supabase project is active');
      console.error('2. Verify connection string in Supabase dashboard');
      console.error('3. Check network connectivity');
      console.error('4. Try using connection pooling URL');
    }
    
    await pool.end();
  }
};

testSupabaseConnection();
