const axios = require('axios');

const endpoints = [
  'http://13.201.6.206:8081/api',
  'https://dhostel-backend.onrender.com/api',
  'https://mhostel-backend.onrender.com/api'
];

const credentials = [
  { identifier: 'admin@d.com', password: 'password123' },
  { identifier: 'admin@hostelapp.com', password: 'password123' },
  { identifier: 'mahendra@gmail.com', password: 'password123' }
];

async function run() {
  for (const url of endpoints) {
    console.log(`\n===========================================`);
    console.log(`Testing API URL: ${url}`);
    console.log(`===========================================`);
    
    try {
      const healthUrl = url.replace(/\/api$/, '') + '/health';
      const health = await axios.get(healthUrl, { timeout: 8000 });
      console.log(`Health check succeeded on ${healthUrl}:`, health.data);
    } catch (e) {
      console.log(`Health check failed on ${url}:`, e.message);
      try {
        const rootHealth = await axios.get(url.replace(/\/api$/, ''), { timeout: 8000 });
        console.log(`Root health check succeeded:`, rootHealth.data);
      } catch (err) {
        console.log(`Root health check failed:`, err.message);
      }
    }

    for (const cred of credentials) {
      try {
        console.log(`Trying login as ${cred.identifier}...`);
        const loginRes = await axios.post(`${url}/auth/login`, cred, { timeout: 8000 });
        if (loginRes.data?.success) {
          const token = loginRes.data.data.token;
          const user = loginRes.data.data.user;
          console.log(`Login SUCCESS on ${url} for ${cred.identifier}! Role: ${user?.role || 'unknown'}`);
          
          try {
            const hostelsRes = await axios.get(`${url}/hostels`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000
            });
            console.log('Hostels Response:', JSON.stringify(hostelsRes.data, null, 2));
          } catch (e) {
            console.error('Error fetching hostels:', e.response?.data || e.message);
          }

          try {
            const ownersRes = await axios.get(`${url}/users/owners`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000
            });
            console.log('Owners Response:', JSON.stringify(ownersRes.data, null, 2));
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        console.log(`Login failed for ${cred.identifier}:`, err.response?.data || err.message);
      }
    }
  }
}

run();
