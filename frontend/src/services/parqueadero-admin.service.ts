import api from '../api/axios';
import type { BackendEnvelope, OcupacionPayload, BahiaAdmin, TipoBahia } from '../types';

export const parqueaderoAdminService = {
  actualizarEstadoParqueadero: async (
    deshabilitado: boolean,
    motivo?: string,
    duracionEstimada?: string,
  ): Promise<BackendEnvelope<{ id: number; deshabilitado: boolean; updatedAt: string }>> => {
    const response = await api.patch('/admin/parqueadero/estado', { deshabilitado, motivo, duracionEstimada });
    return response.data;
  },

  forzarEstadoBahia: async (
    idBahia: number,
    estado: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED' | 'AUTO',
  ): Promise<BackendEnvelope<any>> => {
    const response = await api.patch(`/admin/bahia/${idBahia}/forzar-estado`, { estado });
    return response.data;
  },

  activarBahia: async (idBahia: number, activa: boolean): Promise<BackendEnvelope<any>> => {
    const response = await api.patch(`/admin/bahia/${idBahia}/forzar-estado`, {
      estado: activa ? 'AUTO' : 'DISABLED',
    });
    return response.data;
  },

  crearBahia: async (payload: { nombreBahia: string; idTipoBahia: number }): Promise<BackendEnvelope<any>> => {
    const response = await api.post('/admin/bahia', payload);
    return response.data;
  },

  eliminarBahia: async (idBahia: number): Promise<BackendEnvelope<any>> => {
    const response = await api.delete(`/admin/bahia/${idBahia}`);
    return response.data;
  },

  getOcupacion: async (): Promise<BackendEnvelope<OcupacionPayload>> => {
    const response = await api.get('/bahias/ocupacion');
    return response.data;
  },

  getBahias: async (): Promise<BackendEnvelope<BahiaAdmin[]>> => {
    const response = await api.get('/bahias');
    return response.data;
  },

  getTipos: async (): Promise<BackendEnvelope<TipoBahia[]>> => {
    const response = await api.get('/bahias/tipos');
    return response.data;
  },
};
