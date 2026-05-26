import api from '../api/axios';

/**
 * Servicio de Auditoría y Logs.
 * Permite a los administradores visualizar la trazabilidad de acciones críticas.
 */
export const auditoriaService = {
  /**
   * Obtiene logs de auditoría paginados.
   */
  findAll: async (page = 1, limit = 20) => {
    const response = await api.get(`/auditoria?page=${page}&limit=${limit}`);
    return response.data;
  },

  operaciones: async (params: { operativo?: string; desde?: string; hasta?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.operativo) query.set('operativo', params.operativo);
    if (params.desde) query.set('desde', params.desde);
    if (params.hasta) query.set('hasta', params.hasta);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await api.get(`/admin/auditoria/operaciones${suffix}`);
    return response.data;
  },
};
