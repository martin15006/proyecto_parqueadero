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
  }
};
