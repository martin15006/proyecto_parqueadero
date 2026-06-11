import { sessionService } from './sessionService';
import axios, { type AxiosRequestConfig } from 'axios';
import { NativeModules } from 'react-native';

const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL?.trim();

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

const localhostIp = extractIpFromDebuggerHost(debuggerHost) || '192.168.101.84';

const API_BASE_URL = ensureApiPrefix(
  RAW_API_URL || `http://${localhostIp}:3000/api/v1`,
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
