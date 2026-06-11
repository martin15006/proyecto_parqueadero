import api from '../api/axios';

export const telemetriaService = {
  getSensores: async () => {
    const response = await api.get('/telemetria/sensores');
    return response.data.data;
  },

  testOffline: async () => {
    const response = await api.post('/telemetria/test-offline');
    return response.data.data;
  },

  /**
   * Solo está disponible en ambiente NO productivo y para ADMIN.
   */
  simularIngresoQr: async (params?: { idBahia?: number; placa?: string }) => {
    const response = await api.post('/telemetria/simulador/qr-ingreso', params ?? {});
    return response.data.data ?? response.data;
  },

  /**
   * Solo está disponible en ambiente NO productivo y para ADMIN.
   */
  simularAlerta: async (params: { tipo?: string; mensaje: string }) => {
    const response = await api.post('/telemetria/simulador/alerta', params);
    return response.data.data ?? response.data;
  },
};

export const bahiasService = {
  findAll: async () => {
    const response = await api.get('/bahias');
    return response.data.data;
  },

  /**
   * Reutiliza la lógica del dashboard.
   */
  getOcupacion: async () => {
    const response = await api.get('/bahias/ocupacion');
    return response.data.data;
  },

  findOne: async (id: number) => {
    const response = await api.get(`/bahias/${id}`);
    return response.data.data;
  }
};
