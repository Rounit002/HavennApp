const axios = require('axios');

// Use environment variable or default to production URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://havenn.onrender.com/api';

async function testSubscriptionPayment() {
  try {
    console.log('Testing subscription payment endpoint...');
    
    // Test the create-order endpoint
    console.log('\\n1. Testing create-order endpoint:');
    try {
      const response = await axios.post(`${API_BASE_URL}/subscriptions/create-order`, {
        planId: '1_month',
        amount: 10000 // 100 INR in paise
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true // This would be needed for session auth
      });
      console.log('✅ Response:', response.data);
    } catch (error) {
      console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
      if (error.response?.data?.code) {
        console.log('   Error Code:', error.response.data.code);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSubscriptionPayment();
