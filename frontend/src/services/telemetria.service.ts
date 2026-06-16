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

  simularIngresoQr: async (params?: { idBahia?: number; placa?: string }) => {
    const response = await api.post('/telemetria/simulador/qr-ingreso', params ?? {});
    return response.data.data ?? response.data;
  },

  simularAlerta: async (params: { tipo?: string; mensaje: string }) => {
    const response = await api.post('/telemetria/simulador/alerta', params);
    return response.data.data ?? response.data;
  },

  crearSensor: async (payload: { codigo: string; idBahia: number; activo?: boolean }) => {
    const response = await api.post('/telemetria/sensores', payload);
    return response.data.data ?? response.data;
  },

  actualizarSensor: async (
    idSensor: number,
    payload: { codigo?: string; idBahia?: number; activo?: boolean },
  ) => {
    const response = await api.patch(`/telemetria/sensores/${idSensor}`, payload);
    return response.data.data ?? response.data;
  },

  eliminarSensor: async (idSensor: number) => {
    const response = await api.delete(`/telemetria/sensores/${idSensor}`);
    return response.data.data ?? response.data;
  },
};

export const bahiasService = {
  findAll: async () => {
    const response = await api.get('/bahias');
    return response.data.data;
  },

  getOcupacion: async () => {
    const response = await api.get('/bahias/ocupacion');
    return response.data.data;
  },

  findOne: async (id: number) => {
    const response = await api.get(`/bahias/${id}`);
    return response.data.data;
  }
};
