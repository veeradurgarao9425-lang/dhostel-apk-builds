import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigate } from '../navigation/navigationRef';

// ─── Base URL ─────────────────────────────────────────────────────────────────
const BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  'https://dhostel-backend.onrender.com/api';

// ─── Axios Instance ───────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, 
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
      // ignore
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

    if (status === 401 && !isHandling401) {
      isHandling401 = true;
      try {
        await AsyncStorage.multiRemove(['token', 'user']);
        delete api.defaults.headers.common['Authorization'];
        // @ts-ignore
        navigate('Login');
      } finally {
        isHandling401 = false;
      }
    }

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
