// ⚠️ IMPORTANTE: Cambia esta IP por la tuya (resultado de ipconfig)
// localhost NO funciona desde el celular, debe ser la IP de la PC en la red local
// La URL del backend viene del archivo .env
// En desarrollo cada quien usa su IP local, en producción será un dominio real
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'Falta configurar EXPO_PUBLIC_API_URL en el archivo .env de la carpeta movil/',
  );
}

export { API_BASE_URL };

/**
 * Función genérica para hacer peticiones HTTP al backend.
 * Maneja errores de forma consistente.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // El backend devuelve errores con formato { statusCode, message, error }
      const errorMessage = Array.isArray(data.message)
        ? data.message.join('\n')
        : data.message || 'Error desconocido';
      throw new Error(errorMessage);
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