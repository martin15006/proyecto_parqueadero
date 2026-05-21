import api from '../api/axios';

/**
 * Servicio de Gestión de Usuarios.
 * Conecta con las APIs de perfil, búsqueda institucional y administración de cuentas.
 */
export const usuariosService = {
  /**
   * Obtiene la lista paginada de usuarios (Solo Admin).
   */
  findAll: async (page = 1, limit = 10) => {
    const response = await api.get(`/usuarios?page=${page}&limit=${limit}`);
    return response.data;
  },

  /**
   * Busca un usuario por su documento de identidad.
   */
  findOne: async (documento: string) => {
    const response = await api.get(`/usuarios/${documento}`);
    return response.data;
  },

  /**
   * Busca un usuario por su código QR institucional.
   */
  buscarPorQR: async (qr: string) => {
    const response = await api.get(`/usuarios/qr/${qr}`);
    return response.data;
  },

  /**
   * Actualiza los datos del perfil del usuario autenticado.
   */
  actualizarPerfil: async (datos: any) => {
    const response = await api.patch('/usuarios/perfil', datos);
    return response.data;
  },

  /**
   * Cambia la contraseña del usuario autenticado.
   */
  cambiarContrasena: async (contraActual: string, contraNueva: string) => {
    const response = await api.patch('/usuarios/cambiar-contrasena', { contraActual, contraNueva });
    return response.data;
  },

  /**
   * Registra un nuevo usuario en el sistema.
   */
  registrar: async (datos: any) => {
    const response = await api.post('/usuarios', datos);
    return response.data;
  },

  /**
   * Regenera el código QR de seguridad.
   */
  regenerarQr: async () => {
    const response = await api.post('/usuarios/qr/regenerar');
    return response.data;
  }
};
