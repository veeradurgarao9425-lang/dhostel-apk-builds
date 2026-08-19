import axios from 'axios';
import { getSecureItem, multiRemoveSecureItems } from './secureStore';
import { navigate } from '../navigation/navigationRef';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Priority: EXPO_PUBLIC_API_URL env var → production fallback
// For local dev: set EXPO_PUBLIC_API_URL in .env file
// e.g. EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api (Android emulator)
//      EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api (Physical device)
const BASE_URL = 'http://143.244.131.69:8081/api';

// ─── Axios Instance ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s timeout for image uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor — attach token & log ───────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getSecureItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
    } catch {
      // Token read failed — proceed without token
    }
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — auth guard + retry + error logging ────────────────
let isHandling401 = false;

api.interceptors.response.use(
  (response) => {
    console.log(`[API Response ${response.status}] ${response.config.url}:`, response.data);
    return response;
  },
  async (error) => {
    // Ignore logging for intentionally canceled requests (e.g. AbortController on tab switch)
    if (axios.isCancel(error) || error?.message === 'canceled' || error?.name === 'CanceledError') {
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    console.error(`[API Error] ${error.config?.url} | Status: ${status || 'No Response'} | Message: ${error.message}`, error.response?.data || '');

    // 401 → clear session + redirect to Login (deduplicated, ignore on login attempt)
    if (status === 401 && !isHandling401 && !error.config?.url?.includes('/auth/login')) {
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

    return Promise.reject(error);
  },
);

export default api;
