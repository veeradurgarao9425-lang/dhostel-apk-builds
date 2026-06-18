import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production backend on Render
// const BASE_URL = 'https://mhostel-backend.onrender.com/api';

// For local testing, uncomment the line below and replace with your local IP if testing on a physical device:
const BASE_URL = 'http://192.168.1.73:8081/api'; // or 'http://10.0.2.2:8081/api' for emulator

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 60000, // 60s — Render free-tier needs up to 50s on cold start
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auto-clear token on 401 (expired/invalid token from old session)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.log('[api] 401 received — clearing stored token');
            await AsyncStorage.multiRemove(['token', 'user']);
            delete api.defaults.headers.common['Authorization'];
        }
        return Promise.reject(error);
    }
);

export default api;
