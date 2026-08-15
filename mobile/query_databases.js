const axios = require('axios');

const endpoints = [
  'http://143.244.131.69:8081/api',
  'https://mhostel-backend.onrender.com/api'
];

const credentials = [
  { identifier: 'admin@d.com', password: 'password123' },
  { identifier: 'admin@hostelapp.com', password: 'password123' },
  { identifier: 'mahendra@gmail.com', password: 'password123' },
  { identifier: 'admin', password: 'password123' }
];

async function run() {
  for (const url of endpoints) {
    console.log(`\n===========================================`);
    console.log(`Connecting to: ${url} (timeout 60s)`);
    console.log(`===========================================`);

    for (const cred of credentials) {
      try {
        console.log(`Trying login as ${cred.identifier}...`);
        const loginRes = await axios.post(`${url}/auth/login`, cred, { timeout: 60000 });
        if (loginRes.data?.success) {
          const token = loginRes.data.data.token;
          const user = loginRes.data.data.user;
          console.log(`🎉 Login SUCCESS on ${url} for ${cred.identifier}! Role: ${user?.role || 'unknown'}`);
          
          try {
            const hostelsRes = await axios.get(`${url}/hostels`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 30000
            });
            console.log('Hostels Response:', JSON.stringify(hostelsRes.data, null, 2));
          } catch (e) {
            console.error('Error fetching hostels:', e.response?.data || e.message);
          }

          try {
            const usersRes = await axios.get(`${url}/users`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 30000
            });
            console.log('Users Response:', JSON.stringify(usersRes.data, null, 2));
          } catch (e) {
            // ignore
          }
          return;
        }
      } catch (err) {
        console.log(`Login failed for ${cred.identifier}:`, err.response?.data || err.message);
      }
    }
  }
  console.log('\nCould not log in to any live Render server with default credentials.');
}

run();
