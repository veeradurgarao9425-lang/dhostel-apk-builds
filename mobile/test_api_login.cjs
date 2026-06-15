const axios = require('axios');

async function run() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('https://mhostel-backend.onrender.com/api/auth/login', {
      identifier: 'admin@d.com',
      password: 'password123'
    });

    const token = loginRes.data.data.token;
    console.log('Login successful, token obtained!');

    console.log('Calling debug-db...');
    const debugRes = await axios.get('https://mhostel-backend.onrender.com/api/monthly-fees/debug-db', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('Response:');
    console.log(JSON.stringify(debugRes.data, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
