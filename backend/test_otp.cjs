const axios = require('axios');
axios.post('http://localhost:5001/api/auth/tenant/send-otp', {
  identifier: 'hello.hostix@gmail.com',
  hostel_id: 1
}).then(res => console.log(res.data)).catch(err => console.log(err.response?.data || err.message));
