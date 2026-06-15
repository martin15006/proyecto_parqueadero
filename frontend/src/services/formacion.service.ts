import api from '../api/axios';
import type { BackendEnvelope } from '../types';

export type Jornada = 'MAÑANA' | 'TARDE' | 'NOCHE';

export interface Ficha {
  ficha: string;
  nombre: string;
  ambiente: string | null;
  jornada: Jornada | null;
  createdAt: string;
  activo: boolean;
}

export interface FichaPayload {
  ficha?: string;
  nombre: string;
  ambiente?: string;
  jornada?: Jornada;
}

export const formacionService = {
  listar: async (estado?: 'ACTIVO' | 'INACTIVO' | 'TODOS'): Promise<BackendEnvelope<Ficha[]>> => {
    const suffix = estado ? `?estado=${estado}` : '';
    const response = await api.get(`/admin/formaciones${suffix}`);
    return response.data;
  },

  crear: async (datos: FichaPayload): Promise<BackendEnvelope<Ficha>> => {
    const response = await api.post('/admin/formaciones', datos);
    return response.data;
  },

  actualizar: async (ficha: string, datos: Partial<FichaPayload>): Promise<BackendEnvelope<Ficha>> => {
    const response = await api.patch(`/admin/formaciones/${ficha}`, datos);
    return response.data;
  },

  eliminar: async (ficha: string): Promise<BackendEnvelope<{ mensaje: string }>> => {
    const response = await api.delete(`/admin/formaciones/${ficha}`);
    return response.data;
  },

  reactivar: async (ficha: string): Promise<BackendEnvelope<{ mensaje: string }>> => {
    const response = await api.post(`/admin/formaciones/${ficha}/reactivar`);
    return response.data;
  },
};
