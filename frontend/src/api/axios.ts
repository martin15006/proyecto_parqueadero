import axios from 'axios';
import { normalizeToCamel } from '../utils/normalization';

// FIX: baseURL parametrizada con variable de entorno
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api/v1` 
    : 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // REFACTOR: Asegura que las credenciales (cookies/auth) se envíen correctamente en CORS
});

// FIX: interceptor robusto para JWT (Access y Refresh Token) y Normalización de salida
api.interceptors.request.use((config) => {
  // 1. JWT Injection
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // FIX: Soportar ambos formatos (snake_case del backend y camelCase tras normalización)
      const token = user.accessToken || user.access_token || user.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('FIX: Error parseando sesión local para inyección de token', e);
    }
  }

  // 2. Normalización de salida (REFACTOR: Se elimina denormalizeToSnake ya que el backend usa camelCase en DTOs)
  /*
  if (config.data && !(config.data instanceof FormData)) {
    config.data = denormalizeToSnake(config.data);
  }
  */

  return config;
});

// Interceptor para manejo de errores globales y Normalización de entrada
api.interceptors.response.use(
  (response) => {
    // NORMALIZACIÓN: Convertimos snake_case a camelCase automáticamente
    if (response.data) {
      response.data = normalizeToCamel(response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Error 401: Unauthorized (Sesión expirada)
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.warn('Sesión expirada o inválida');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // SECURITY: Logging de errores críticos sin exponer datos sensibles
    if (error.response?.status >= 500) {
      console.error('SERVER_ERROR:', {
        status: error.response.status,
        url: originalRequest.url,
        message: 'Error interno del servidor'
      });
    }

    // REFACTOR: Estandarización de la respuesta de error para el frontend
    const errorData = {
      message: error.response?.data?.message || 'Error inesperado en el sistema',
      status: error.response?.status || 500,
      errors: error.response?.data?.errors || null
    };

    return Promise.reject(errorData);
  }
);

export default api;