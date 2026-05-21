import api from '../api/axios';

/**
 * Servicio de Telemetría e Infraestructura.
 * Monitorea el estado de los sensores y la disponibilidad de las bahías.
 */
export const telemetriaService = {
  /**
   * Obtiene el listado de todos los sensores instalados y su estado online/offline.
   */
  getSensores: async () => {
    const response = await api.get('/telemetria/sensores');
    return response.data;
  },

  /**
   * Fuerza un chequeo de salud de los sensores (Solo Admin).
   */
  testOffline: async () => {
    const response = await api.post('/telemetria/test-offline');
    return response.data;
  }
};

/**
 * Servicio de Gestión de Bahías.
 */
export const bahiasService = {
  /**
   * Lista todas las bahías con sus metadatos.
   */
  findAll: async () => {
    const response = await api.get('/bahias');
    return response.data;
  },

  /**
   * Obtiene el resumen de ocupación actual (Reutiliza lógica de dashboard).
   */
  getOcupacion: async () => {
    const response = await api.get('/bahias/ocupacion');
    return response.data;
  },

  /**
   * Busca detalle de una bahía específica.
   */
  findOne: async (id: number) => {
    const response = await api.get(`/bahias/${id}`);
    return response.data;
  }
};
