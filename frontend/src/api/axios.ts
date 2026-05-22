import axios from 'axios';
import { normalizeToCamel } from '../utils/normalization';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api/v1` 
    : 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // REFACTOR: Asegura que las credenciales (cookies/auth) se envíen correctamente en CORS
});

api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const token = user.accessToken || user.access_token || user.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      localStorage.removeItem('user');
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = normalizeToCamel(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isDev = Boolean(import.meta.env.DEV);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (isDev && error.response?.status >= 500) {
      console.error('SERVER_ERROR', {
        statusCode: error.response.status,
        url: originalRequest?.url,
      });
    }

    const backendError = error.response?.data;
    const message = Array.isArray(backendError?.message)
      ? backendError.message.join('\n')
      : backendError?.message || 'Error inesperado en el sistema';

    const errorData = {
      statusCode: backendError?.statusCode || error.response?.status || 500,
      message,
      timestamp: backendError?.timestamp,
      path: backendError?.path,
      error: backendError?.error,
    };

    return Promise.reject(errorData);
  }
);

export default api;
