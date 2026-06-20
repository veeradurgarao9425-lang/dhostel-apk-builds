import axios from 'axios';

async function test() {
  try {
    console.log('Testing local login...');
    const resLocal = await axios.post('http://127.0.0.1:5000/api/auth/login', { identifier: 'durgarao@d.com', password: 'password123' }); // I don't know the password
    console.log('Local login success', resLocal.status);
  } catch (e: any) {
    console.log('Local login error:', e.response?.status, e.response?.data);
  }

  try {
    console.log('Testing render login...');
    const resRender = await axios.post('https://mhostel-backend.onrender.com/api/auth/login', { identifier: 'durgarao@d.com', password: 'password123' }); // I don't know the password
    console.log('Render login success', resRender.status);
  } catch (e: any) {
    console.log('Render login error:', e.response?.status, e.response?.data);
  }
}

test();
