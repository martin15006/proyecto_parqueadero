import api from '../api/axios';
import type { BackendEnvelope, OcupacionPayload } from '../types';

export const parqueaderoAdminService = {
  actualizarEstadoParqueadero: async (deshabilitado: boolean): Promise<BackendEnvelope<{ id: number; deshabilitado: boolean; updatedAt: string }>> => {
    const response = await api.patch('/admin/parqueadero/estado', { deshabilitado });
    return response.data;
  },

  forzarEstadoBahia: async (
    idBahia: number,
    estado: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED' | 'AUTO',
  ): Promise<BackendEnvelope<any>> => {
    const response = await api.patch(`/admin/bahia/${idBahia}/forzar-estado`, { estado });
    return response.data;
  },

  getOcupacion: async (): Promise<BackendEnvelope<OcupacionPayload>> => {
    const response = await api.get('/bahias/ocupacion');
    return response.data;
  },
};

