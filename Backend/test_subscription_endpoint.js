const axios = require('axios');

// Use environment variable or default to production URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://havenn.onrender.com/api';

async function testSubscriptionEndpoint() {
  try {
    console.log('Testing subscription status endpoint...');
    
    // First, let's test without authentication to see the error
    console.log('\n1. Testing without authentication:');
    try {
      const response = await axios.get(`${API_BASE_URL}/subscriptions/status`);
      console.log('✅ Response:', response.data);
    } catch (error) {
      console.log('❌ Expected error (no auth):', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test with a mock session - we need to check how authentication works
    console.log('\n2. Checking authentication requirements...');
    console.log('The endpoint requires owner authentication via session.');
    console.log('To test properly, we need to login as a library owner first.');
    
    // Let's check if there's a login endpoint we can use
    console.log('\n3. Testing login endpoint availability:');
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/owner/login`, {
        library_code: 'TEST01',
        password: 'test123' // This might not be the correct password
      });
      console.log('✅ Login successful:', loginResponse.data);
    } catch (error) {
      console.log('❌ Login failed:', error.response?.status, error.response?.data?.message || error.message);
      console.log('This is expected if credentials are wrong.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSubscriptionEndpoint();
