import axios from 'axios';
import { getSecureItem, multiRemoveSecureItems } from './secureStore';
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
      const token = await getSecureItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Token read failed — proceed without token
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
        await multiRemoveSecureItems(['token', 'user']);
        delete api.defaults.headers.common['Authorization'];
        navigate('Login');
      } finally {
        isHandling401 = false;
      }
    }

    if (status === 403 && error.response?.data?.message === "Your subscription has expired. Please renew to continue.") {
      navigate('SubscriptionExpired');
    }


    // Auto-retry up to 2 times on network failure or timeout (Render server cold-start)
    const config = error.config as any;
    const isNetworkOrTimeout = !error.response || error.code === 'ECONNABORTED';
    
    if (
      isNetworkOrTimeout &&
      (config._retryCount || 0) < 2 &&
      config.method?.toLowerCase() === 'get'
    ) {
      config._retryCount = (config._retryCount || 0) + 1;
      // Progressive delay to allow Render server to spin up
      const delay = config._retryCount * 2500;
      await new Promise((r) => setTimeout(r, delay));
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
