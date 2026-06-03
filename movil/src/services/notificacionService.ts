import { apiRequest } from './api';

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  actorNombre: string | null;
  metadata: Record<string, unknown> | null;
  leidaAt: string | null;
  createdAt: string;
}

export const notificacionService = {
  async listar(): Promise<Notificacion[]> {
    return apiRequest<Notificacion[]>('/notificaciones/mias', {
      method: 'GET',
      conAuth: true,
    });
  },

  async eliminar(id: number): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>(`/notificaciones/${id}`, {
      method: 'DELETE',
      conAuth: true,
    });
  },

  async eliminarTodas(): Promise<{ mensaje: string; total: number }> {
    return apiRequest<{ mensaje: string; total: number }>('/notificaciones', {
      method: 'DELETE',
      conAuth: true,
    });
  },
};
