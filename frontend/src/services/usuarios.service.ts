import api from '../api/axios';
import type { AdminUsuarioItem, BackendEnvelope, CreateOperativoAdminDto, CreateUsuarioDto, UpdateOperativoAdminDto, User } from '../types';

/**
 * Servicio de Gestión de Usuarios.
 * Conecta con las APIs de perfil, búsqueda institucional y administración de cuentas.
 */
export const usuariosService = {
  /**
   * Obtiene la lista paginada de usuarios (Solo Admin).
   */
  findAll: async (page = 1, limit = 10): Promise<BackendEnvelope<User[]>> => {
    const response = await api.get(`/usuarios?page=${page}&limit=${limit}`);
    return response.data;
  },

  /**
   * Busca un usuario por su documento de identidad.
   */
  findOne: async (documento: string): Promise<BackendEnvelope<User>> => {
    const response = await api.get(`/usuarios/${documento}`);
    return response.data;
  },

  /**
   * Busca un usuario por su código QR institucional.
   */
  buscarPorQR: async (qr: string): Promise<BackendEnvelope<User>> => {
    const response = await api.get(`/usuarios/qr/${qr}`);
    return response.data;
  },

  /**
   * Actualiza los datos del perfil del usuario autenticado.
   */
  actualizarPerfil: async (datos: Partial<CreateUsuarioDto>): Promise<BackendEnvelope<User>> => {
    const response = await api.patch('/usuarios/perfil', datos);
    return response.data;
  },

  /**
   * Cambia la contraseña del usuario autenticado.
   */
  cambiarContrasena: async (contraActual: string, contraNueva: string): Promise<BackendEnvelope<{ message?: string }>> => {
    const response = await api.patch('/usuarios/cambiar-contrasena', { contraActual, contraNueva });
    return response.data;
  },

  /**
   * Registra un nuevo usuario en el sistema.
   */
  registerUser: async (datos: CreateUsuarioDto): Promise<BackendEnvelope<User>> => {
    const response = await api.post('/usuarios', datos);
    return response.data;
  },
  registrar: async (datos: CreateUsuarioDto): Promise<BackendEnvelope<User>> => {
    return usuariosService.registerUser(datos);
  },

  /**
   * Regenera el código QR de seguridad.
   */
  regenerarQr: async (): Promise<BackendEnvelope<{ qr?: string }>> => {
    const response = await api.post('/usuarios/qr/regenerar');
    return response.data;
  },

  listarOperativosAdmin: async (): Promise<BackendEnvelope<User[]>> => {
    const response = await api.get('/admin/usuarios/operativo');
    return response.data;
  },

  crearOperativoAdmin: async (datos: CreateOperativoAdminDto): Promise<BackendEnvelope<User>> => {
    const response = await api.post('/admin/usuarios/operativo', datos);
    return response.data;
  },

  actualizarOperativoAdmin: async (documento: string, datos: UpdateOperativoAdminDto): Promise<BackendEnvelope<User>> => {
    const response = await api.put(`/admin/usuarios/operativo/${documento}`, datos);
    return response.data;
  },

  cambiarEstadoOperativoAdmin: async (documento: string, activo: boolean): Promise<BackendEnvelope<User>> => {
    const response = await api.patch(`/admin/usuarios/operativo/${documento}/estado`, { activo });
    return response.data;
  },

  /**
   * Restablece la contraseña de un Operativo desde el Panel Administrador (RF28).
   * Operación crítica: el backend valida RF3 (contraseña segura) y evita reutilizar la anterior.
   */
  resetPasswordOperativoAdmin: async (
    documento: string,
    contra: string,
  ): Promise<BackendEnvelope<{ mensaje: string }>> => {
    const response = await api.patch(`/admin/usuarios/operativo/${documento}/reset-password`, { contra });
    return response.data;
  },

  listarUsuariosAdmin: async (params?: { q?: string; estado?: 'ACTIVO' | 'INACTIVO' | 'TODOS' }): Promise<BackendEnvelope<AdminUsuarioItem[]>> => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.estado) query.set('estado', params.estado);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await api.get(`/admin/usuarios${suffix}`);
    return response.data;
  },
};
