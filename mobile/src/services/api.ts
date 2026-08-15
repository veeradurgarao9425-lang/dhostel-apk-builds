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
  'http://143.244.131.69:8081/api';

// ─── Axios Instance ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000, // 90s — Render free-tier cold start can take 50-80s
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
    // Allow retry on GET requests AND on POST to auth/login (idempotent login for cold-start)
    const isRetryableMethod =
      config.method?.toLowerCase() === 'get' ||
      (config.method?.toLowerCase() === 'post' && config.url?.includes('/auth/login'));

    if (isNetworkOrTimeout && (config._retryCount || 0) < 2 && isRetryableMethod) {
      config._retryCount = (config._retryCount || 0) + 1;
      // Progressive delay: 3s, then 6s — gives Render cold-start time to wake up
      const delay = config._retryCount * 3000;
      await new Promise((r) => setTimeout(r, delay));
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
