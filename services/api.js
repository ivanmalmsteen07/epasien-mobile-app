import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

// Development API URL
// const BASE_URL = 'http://127.0.0.1/api-epasien/data';

// Production/Development API URL
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost/api-epasien/data';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menyisipkan Token JWT secara otomatis
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk menangani error respons secara global
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Hapus data sesi jika tidak sah/expired
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');

      // Arahkan paksa ke login HANYA jika tidak sedang di halaman login
      // Ini mencegah alert gagal login tertutup otomatis karena re-mount
    }
    return Promise.reject(error);
  }
);

export default api;
