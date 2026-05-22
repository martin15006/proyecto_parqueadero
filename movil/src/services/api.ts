import { sessionService } from './sessionService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'Falta configurar EXPO_PUBLIC_API_URL en el archivo .env de la carpeta movil/',
  );
}

export { API_BASE_URL };

interface ApiRequestOptions extends RequestInit {
  conAuth?: boolean;
}

// Callback que se ejecuta cuando se detecta un token inválido
// Se configura desde AuthContext para forzar logout
let onSesionInvalida: (() => void) | null = null;

export function configurarManejoSesionInvalida(callback: () => void) {
  onSesionInvalida = callback;
}

/**
 * Función genérica para hacer peticiones HTTP al backend.
 * Si `conAuth=true`, agrega automáticamente el token JWT guardado.
 *
 * Si el backend responde con 401 (token inválido) o con un error de FK
 * (usuario no existe en BD), cierra sesión automáticamente.
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
      // Detectar sesión inválida
      const esSesionInvalida =
        response.status === 401 ||
        (response.status === 500 &&
          typeof data?.message === 'string' &&
          (data.message.includes('foreign key') ||
            data.message.includes('llave foránea') ||
            data.message.includes('FK')));

      if (esSesionInvalida && conAuth) {
        console.log('⚠️ Sesión inválida detectada. Cerrando sesión...');
        await sessionService.eliminarSesion();
        if (onSesionInvalida) {
          onSesionInvalida();
        }
        throw new Error(
          'Tu sesión expiró o no es válida. Por favor inicia sesión de nuevo.',
        );
      }

      const errorMessage = Array.isArray(data.message)
        ? data.message.join('\n')
        : data.message || 'Error desconocido';

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