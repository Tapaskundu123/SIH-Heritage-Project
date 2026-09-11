import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reads from mobile-app/.env (EXPO_PUBLIC_ prefix is automatically bundled by Expo)
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.249:5000';
export const AI_URL = process.env.EXPO_PUBLIC_AI_URL || 'http://192.168.29.249:8000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('ks_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
