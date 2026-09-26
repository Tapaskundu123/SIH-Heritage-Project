import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reads from mobile-app/.env (EXPO_PUBLIC_ prefix is automatically bundled by Expo)
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.249:5000';
export const AI_URL = process.env.EXPO_PUBLIC_AI_URL || 'http://192.168.29.249:8000';

const LOCAL_FALLBACK_API = 'http://192.168.29.249:5000/api';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 45000,
  headers: {
    'bypass-tunnel-reminder': 'true',
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('ks_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Resilient response interceptor: if tunnel returns 530, 502, 504, or network timeout, automatically fallback to local Wi-Fi IP
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    const status = error?.response?.status;
    const isTunnelError = status === 530 || status === 502 || status === 504 || error?.code === 'ERR_NETWORK';

    if (config && !config._retryWithLocal && isTunnelError) {
      config._retryWithLocal = true;
      config.baseURL = LOCAL_FALLBACK_API;
      console.warn(`[API] Tunnel returned ${status || error?.code}. Automatically retrying via local Wi-Fi backend: ${LOCAL_FALLBACK_API}`);
      return axios(config);
    }
    return Promise.reject(error);
  }
);

export default api;
