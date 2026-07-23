const axios = require('axios');

async function testApi() {
  const baseURL = 'https://dhostel-backend.onrender.com/api';
  console.log('Testing connection to:', baseURL);

  try {
    const health = await axios.get('https://dhostel-backend.onrender.com/');
    console.log('Health root response:', health.data);
  } catch (e) {
    console.error('Health root error:', e.message);
  }
}

testApi();
