import { sessionService } from './sessionService';
import axios, { type AxiosRequestConfig } from 'axios';
import { NativeModules } from 'react-native';

// URL del backend. Prioridad:
//   1. EXPO_PUBLIC_API_URL  → override explícito y completo (p. ej. un servidor desplegado).
//   2. IP autodetectada del host de Metro + EXPO_PUBLIC_API_PORT (3001 por defecto).
//      En desarrollo la IP se toma sola de la red, así NO hay que editar nada al
//      cambiar de Wi-Fi: el celular usa la misma IP del PC donde corre Metro.
//   3. EXPO_PUBLIC_API_FALLBACK_IP → último recurso si Metro no expone host
//      (p. ej. en una build standalone sin bundler).
const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim();
const API_PORT = process.env.EXPO_PUBLIC_API_PORT?.trim() || '3001';
const FALLBACK_IP = process.env.EXPO_PUBLIC_API_FALLBACK_IP?.trim() || '192.168.18.216';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const ensureApiPrefix = (baseUrl: string) => {
  const normalized = stripTrailingSlash(baseUrl);
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
};

const extractIpFromDebuggerHost = (host: string | undefined | null) => {
  const raw = String(host || '').trim();
  if (!raw) return null;
  const withoutProtocol = raw.includes('://') ? raw.split('://')[1] : raw;
  const withoutPath = withoutProtocol.split('/')[0];
  const hostPart = withoutPath.split(':')[0];
  return hostPart || null;
};

const debuggerHost = (() => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (typeof scriptURL === 'string' && scriptURL.length) {
    return scriptURL;
  }
  return null;
})();

// IP del PC donde corre Metro = IP del backend en la misma red local.
const detectedIp = extractIpFromDebuggerHost(debuggerHost) || FALLBACK_IP;

const API_BASE_URL = ensureApiPrefix(
  RAW_API_URL || `http://${detectedIp}:${API_PORT}`,
);

export { API_BASE_URL };

interface ApiRequestOptions extends RequestInit {
  conAuth?: boolean;
}

type BackendEnvelope<T> = {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
  timestamp: string;
  meta?: any;
};

function isBackendEnvelope<T>(value: any): value is BackendEnvelope<T> {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.success === 'boolean' &&
    typeof value.statusCode === 'number' &&
    'data' in value
  );
}

let onSesionInvalida: (() => void) | null = null;
let inMemoryAuthToken: string | null = null;

export function setInMemoryAuthToken(token: string | null) {
  const raw = String(token ?? '').trim();
  inMemoryAuthToken = raw.length ? raw : null;
}

export function configurarManejoSesionInvalida(callback: () => void) {
  onSesionInvalida = callback;
}

type HttpConfig = AxiosRequestConfig & { _conAuth?: boolean };

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  validateStatus: () => true,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use(async (config) => {
  const conAuth = Boolean((config as HttpConfig)._conAuth);

  if (conAuth) {
    const token = (await sessionService.obtenerToken()) || inMemoryAuthToken;
    if (token) {
      if (!config.headers) {
        config.headers = {} as any;
      }
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

http.interceptors.response.use(async (response) => {
  const conAuth = Boolean((response.config as HttpConfig)._conAuth);

  if (conAuth && response.status === 401) {
    const headers = (response.config as any)?.headers as any;
    const sentAuthHeader = headers?.Authorization || headers?.authorization;

    if (sentAuthHeader) {
      await sessionService.eliminarSesion();
      if (onSesionInvalida) onSesionInvalida();
    }

    throw new Error('Tu sesión expiró o no es válida. Por favor inicia sesión de nuevo.');
  }

  return response;
});

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { conAuth = false, ...fetchOptions } = options;
  const debugHttp = __DEV__ && String(process.env.EXPO_PUBLIC_DEBUG_HTTP ?? '') === '1';

  try {
    const method = String(fetchOptions.method || 'GET').toUpperCase();

    const incomingHeaders = (fetchOptions.headers || {}) as Record<string, string>;
    const headers: Record<string, string> = {
      ...incomingHeaders,
    };

    const rawBody: any = (fetchOptions as any).body;
    const data =
      (fetchOptions as any).data !== undefined
        ? (fetchOptions as any).data
        : typeof rawBody === 'string'
          ? (() => {
              const contentType =
                headers['Content-Type'] || headers['content-type'] || 'application/json';
              const isJson = contentType.toLowerCase().includes('application/json');
              if (!isJson) return rawBody;
              try {
                return JSON.parse(rawBody);
              } catch {
                return rawBody;
              }
            })()
          : rawBody;

    const response = await http.request({
      url: endpoint,
      method,
      headers,
      data,
      _conAuth: conAuth,
    } as HttpConfig);

    if (debugHttp) {
      console.log('[HTTP]', method, endpoint, '->', response.status);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const responseData = response.data;

    if (response.status < 200 || response.status >= 300) {
      const message = Array.isArray(responseData?.message)
        ? responseData.message.join('\n')
        : responseData?.message || response.statusText || 'Error desconocido';

      const err: any = new Error(message);
      err.statusCode = response.status;
      err.payload = responseData;
      throw err;
    }

    if (isBackendEnvelope<T>(responseData)) {
      return responseData.data as T;
    }

    return responseData as T;
  } catch (error: any) {
    const networkMessage = String(error?.message || '');
    if (networkMessage === 'Network Error' || networkMessage === 'Network request failed') {
      throw new Error(
        'No se pudo conectar al servidor. Verifica tu conexión y que el servidor esté corriendo.',
      );
    }
    throw error;
  }
}
