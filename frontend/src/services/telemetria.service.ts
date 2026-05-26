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
    return response.data.data;
  },

  /**
   * Fuerza un chequeo de salud de los sensores (Solo Admin).
   */
  testOffline: async () => {
    const response = await api.post('/telemetria/test-offline');
    return response.data.data;
  },

  /**
   * Simulador (DEMO): fuerza un ingreso simulado para reflejar cambios en el mapa 2D y disparar alertas (RF14).
   * Solo está disponible en ambiente NO productivo y para ADMIN.
   */
  simularIngresoQr: async (params?: { idBahia?: number; placa?: string }) => {
    const response = await api.post('/telemetria/simulador/qr-ingreso', params ?? {});
    return response.data.data ?? response.data;
  },

  /**
   * Simulador (DEMO): emite una alerta del sistema en tiempo real (RF14) sin depender de hardware.
   * Solo está disponible en ambiente NO productivo y para ADMIN.
   */
  simularAlerta: async (params: { tipo?: string; mensaje: string }) => {
    const response = await api.post('/telemetria/simulador/alerta', params);
    return response.data.data ?? response.data;
  },
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
    return response.data.data;
  },

  /**
   * Obtiene el resumen de ocupación actual (Reutiliza lógica de dashboard).
   */
  getOcupacion: async () => {
    const response = await api.get('/bahias/ocupacion');
    return response.data.data;
  },

  /**
   * Busca detalle de una bahía específica.
   */
  findOne: async (id: number) => {
    const response = await api.get(`/bahias/${id}`);
    return response.data.data;
  }
};
