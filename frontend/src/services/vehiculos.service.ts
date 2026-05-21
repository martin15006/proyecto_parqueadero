import api from '../api/axios';

/**
 * Servicio de Gestión de Vehículos.
 * Permite el registro, consulta y actualización de la flota institucional.
 */
export const vehiculosService = {
  /**
   * Lista los tipos de vehículos permitidos (Moto, Carro, Bici, etc).
   */
  listarTipos: async () => {
    const response = await api.get('/vehiculos/tipos');
    return response.data;
  },

  /**
   * Obtiene los vehículos vinculados al usuario autenticado.
   */
  listarMios: async () => {
    const response = await api.get('/vehiculos/mios');
    return response.data;
  },

  /**
   * Registra un nuevo vehículo y lo vincula al usuario.
   */
  registrar: async (datos: any) => {
    const response = await api.post('/vehiculos', datos);
    return response.data;
  },

  /**
   * Obtiene el detalle completo de un vehículo por su placa.
   */
  obtenerDetalle: async (placa: string) => {
    const response = await api.get(`/vehiculos/detalle/${placa}`);
    return response.data;
  },

  /**
   * Actualiza la información de un vehículo existente.
   */
  actualizar: async (placa: string, datos: any) => {
    const response = await api.patch(`/vehiculos/${placa}`, datos);
    return response.data;
  },

  /**
   * Elimina la vinculación de un vehículo con el usuario.
   */
  eliminar: async (placa: string) => {
    const response = await api.delete(`/vehiculos/${placa}`);
    return response.data;
  }
};
