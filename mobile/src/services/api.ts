import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from '../navigation/navigationRef';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Priority: EXPO_PUBLIC_API_URL env var → production fallback
// For local dev: set EXPO_PUBLIC_API_URL in .env file
// e.g. EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api (Android emulator)
//      EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api (Physical device)
const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://dhostel-backend.onrender.com/api';

// ─── Axios Instance ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s — Render free-tier needs up to 50s on cold start
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — attach token ───────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // AsyncStorage read failed — proceed without token
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — auth guard + retry ────────────────────────────────
let isHandling401 = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;

    // 401 → clear session + redirect to Login (deduplicated)
    if (status === 401 && !isHandling401) {
      isHandling401 = true;
      try {
        await AsyncStorage.multiRemove(['token', 'user']);
        delete api.defaults.headers.common['Authorization'];
        navigate('Login');
      } finally {
        isHandling401 = false;
      }
    }

    // Auto-retry once on network failure (not on 4xx/5xx)
    const config = error.config as any;
    if (
      !error.response &&
      !config._retried &&
      config.method?.toLowerCase() === 'get'
    ) {
      config._retried = true;
      await new Promise((r) => setTimeout(r, 1500));
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
