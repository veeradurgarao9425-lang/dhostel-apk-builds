import axios from 'axios';
import { DeviceEventEmitter } from 'react-native';
import { getSecureItem, multiRemoveSecureItems } from './secureStore';
import { navigate } from '../navigation/navigationRef';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Fast Cloudflare Edge Worker connected to DigitalOcean
const FALLBACK_URL = 'https://dark-dew-bf62.veeradurgarao840.workers.dev/api';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || FALLBACK_URL;

// ─── Axios Instance ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 45000, // 45s timeout for multi-image uploads & cold-starts
});

// ─── Fast Memory Token Cache ──────────────────────────────────────────────────
let cachedUserToken: string | null = null;
let cachedDevToken: string | null = null;

export const setCachedToken = (token: string | null, isDev = false) => {
  if (isDev) cachedDevToken = token;
  else cachedUserToken = token;
};

// ─── Request Interceptor — attach token & log ───────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      if (!config.headers['Authorization']) {
        const isDevEndpoint = config.url?.startsWith('/developer');
        let tokenToUse = isDevEndpoint ? (cachedDevToken || cachedUserToken) : (cachedUserToken || cachedDevToken);

        // Fast-path: Use memory cache if available (0ms)
        if (!tokenToUse) {
          const devToken = await getSecureItem('developer_token');
          const userToken = await getSecureItem('token');
          cachedDevToken = devToken || null;
          cachedUserToken = userToken || null;
          tokenToUse = isDevEndpoint ? (devToken || userToken) : (userToken || devToken);
        }

        if (tokenToUse) {
          config.headers['Authorization'] = `Bearer ${tokenToUse}`;
        }
      }
      const isFormData =
        config.data instanceof FormData ||
        (config.data && typeof config.data === 'object' && ('_parts' in config.data || config.data.constructor?.name === 'FormData'));

      if (isFormData) {
        if (config.headers) {
          (config.headers as any)['Content-Type'] = 'multipart/form-data';
          if (typeof (config.headers as any).set === 'function') {
            (config.headers as any).set('Content-Type', 'multipart/form-data');
          }
        }
        config.timeout = 120000; // 2 min timeout for file uploads
      } else {
        if (config.headers && !config.headers['Content-Type'] && !config.headers['content-type']) {
          (config.headers as any)['Content-Type'] = 'application/json';
        }
      }
    } catch {
      // Token read failed — proceed without token
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — auth guard + retry + error logging ────────────────
let isHandling401 = false;

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API Response ${response.status}] ${response.config.url}:`, response.data);
    }
    return response;
  },
  async (error) => {
    // Ignore logging for intentionally canceled requests (e.g. AbortController on tab switch) or health pre-warming
    if (axios.isCancel(error) || error?.message === 'canceled' || error?.name === 'CanceledError' || error?.config?.url?.includes('/health')) {
      return Promise.reject(error);
    }

    // Automatic HTTPS Failover: If unencrypted HTTP (or cellular port 8081 block) fails, retry once via Cloudflare HTTPS
    const cfg = error?.config as any;
    if ((error.message === 'Network Error' || !error.response) && cfg && !cfg._retriedHttps && FALLBACK_URL) {
      cfg._retriedHttps = true;
      cfg.baseURL = FALLBACK_URL;
      return api.request(cfg);
    }

    const status = error?.response?.status;
    if (__DEV__) {
      console.error(`[API Error] ${error.config?.url} | Status: ${status || 'No Response'} | Message: ${error.message}`, error.response?.data || '');
    }

    // 401 → clear session + redirect (deduplicated, ignore on login attempts & background auxiliary checks)
    const isLoginEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/developer/auth/login');
    const isAuxiliaryEndpoint = error.config?.url?.includes('/notifications/register-token') ||
      error.config?.url?.includes('/notifications/deregister-token') ||
      error.config?.url?.includes('/auth/tenant/me');

    if (status === 401 && !isHandling401 && !isLoginEndpoint && !isAuxiliaryEndpoint) {
      isHandling401 = true;
      try {
        const isDevEndpoint = error.config?.url?.startsWith('/developer');
        DeviceEventEmitter.emit('UNAUTHORIZED_SESSION');
        if (isDevEndpoint) {
          setCachedToken(null, true);
          await multiRemoveSecureItems(['developer_token']);
          navigate('RoleSelect');
        } else {
          setCachedToken(null);
          await multiRemoveSecureItems(['token', 'user']);
          delete api.defaults.headers.common['Authorization'];
          navigate('Login');
        }
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
