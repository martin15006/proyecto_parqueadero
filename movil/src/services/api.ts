import { sessionService } from './sessionService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'Falta configurar EXPO_PUBLIC_API_URL en el archivo .env de la carpeta movil/',
  );
}

export { API_BASE_URL };

interface ApiRequestOptions extends RequestInit {
  conAuth?: boolean; // Si es true, agrega el JWT automáticamente
}

/**
 * Función genérica para hacer peticiones HTTP al backend.
 * Si `conAuth=true`, agrega automáticamente el token JWT guardado.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { conAuth = false, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Si se requiere autenticación, agregar el JWT
  if (conAuth) {
    const token = await sessionService.obtenerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = Array.isArray(data.message)
        ? data.message.join('\n')
        : data.message || 'Error desconocido';
      
      // Si es 401 (token inválido/expirado), también lanzamos error pero con código
      const error: any = new Error(errorMessage);
      error.statusCode = response.status;
      throw error;
    }

    return data as T;
  } catch (error: any) {
    if (error.message === 'Network request failed') {
      throw new Error(
        'No se pudo conectar al servidor. Verifica tu conexión y que el servidor esté corriendo.',
      );
    }
    throw error;
  }
}