// Test subscription flow with actual library owner credentials
const axios = require('axios');

// Use one of the existing libraries from the database
// You can replace these with actual owner credentials from your database
const OWNER_CREDENTIALS = {
  phone: '9876543210',  // From check_library_details.js output
  password: 'testpassword123'  // From reset_owner_password.js output
};

const API_BASE_URL = 'http://localhost:3000/api';

async function testSubscriptionFlow() {
  console.log('Testing subscription flow with actual library owner credentials...\n');
  
  // Create a client that maintains cookies/sessions
  const client = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
  });
  
  // Add cookie handling
  let cookies = [];
  client.interceptors.response.use(response => {
    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'];
    }
    return response;
  });
  
  client.interceptors.request.use(config => {
    if (cookies.length > 0) {
      config.headers['Cookie'] = cookies.join('; ');
    }
    return config;
  });

  try {
    // 1. Login as library owner
    console.log('1. Testing login as library owner...');
    const loginResponse = await client.post('/owner-auth/login', OWNER_CREDENTIALS);
    console.log('✅ Login successful');
    console.log('   Library ID:', loginResponse.data.owner.id);
    console.log('   Library Name:', loginResponse.data.owner.libraryName);
    
    // 2. Test subscription status endpoint
    console.log('\n2. Testing subscription status endpoint...');
    const statusResponse = await client.get('/subscriptions/status');
    console.log('✅ Subscription status retrieved successfully');
    console.log('   Plan:', statusResponse.data.subscription.plan);
    console.log('   Is Active:', statusResponse.data.subscription.isActive);
    console.log('   Is Trial:', statusResponse.data.subscription.isTrial);
    console.log('   Days Left:', statusResponse.data.subscription.daysLeft);
    
    // 3. Test create order endpoint
    console.log('\n3. Testing create order endpoint...');
    const orderResponse = await client.post('/subscriptions/create-order', {
      planId: '1_month',
      amount: 29900  // Amount in paise (₹299)
    });
    
    console.log('✅ Order created successfully');
    console.log('   Order ID:', orderResponse.data.id);
    console.log('   Amount:', orderResponse.data.amount);
    console.log('   Currency:', orderResponse.data.currency);
    
  } catch (error) {
    console.log('❌ Error occurred:', error.message);
    
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❗ Backend server may not be running. Please start it with `node server.js`');
    }
  }
}

testSubscriptionFlow();
