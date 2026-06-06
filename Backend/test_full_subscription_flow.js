const axios = require('axios');

// Use environment variable or default to production URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://havenn.onrender.com/api'
  : 'https://havenn.onrender.com/api';

async function testFullSubscriptionFlow() {
  try {
    console.log('Testing full subscription flow...');
    
    // 1. Login
    console.log('\n1. Testing login:');
    let loginResponse;
    try {
      loginResponse = await axios.post(`${API_BASE_URL}/owner/login`, {
        library_code: 'TEST01',
        password: 'test123'
      }, { withCredentials: true });
      console.log('✅ Login successful');
    } catch (error) {
      console.log('❌ Login failed:', error.response?.status, error.response?.data?.message || error.message);
      return;
    }
    
    // 2. Create order
    console.log('\n2. Testing create-order endpoint:');
    try {
      const orderResponse = await axios.post(`${API_BASE_URL}/subscriptions/create-order`, {
        planId: '1_month',
        amount: 10000
      }, { withCredentials: true });
      console.log('✅ Order creation successful:', orderResponse.data);
    } catch (error) {
      console.log('❌ Order creation failed:', error.response?.status, error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFullSubscriptionFlow();
