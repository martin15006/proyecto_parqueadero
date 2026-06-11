import api from '../api/axios';
import type { AdminUsuarioItem, BackendEnvelope, CreateOperativoAdminDto, CreateUsuarioDto, UpdateOperativoAdminDto, User } from '../types';

export const usuariosService = {
  findAll: async (page = 1, limit = 10): Promise<BackendEnvelope<User[]>> => {
    const response = await api.get(`/usuarios?page=${page}&limit=${limit}`);
    return response.data;
  },

  findOne: async (documento: string): Promise<BackendEnvelope<User>> => {
    const response = await api.get(`/usuarios/${documento}`);
    return response.data;
  },

  buscarPorQR: async (qr: string): Promise<BackendEnvelope<User>> => {
    const response = await api.get(`/usuarios/qr/${qr}`);
    return response.data;
  },

  actualizarPerfil: async (datos: Partial<CreateUsuarioDto>): Promise<BackendEnvelope<User>> => {
    const response = await api.patch('/usuarios/perfil', datos);
    return response.data;
  },

  cambiarContrasena: async (contraActual: string, contraNueva: string): Promise<BackendEnvelope<{ message?: string }>> => {
    const response = await api.patch('/usuarios/cambiar-contrasena', { contraActual, contraNueva });
    return response.data;
  },

  registerUser: async (datos: CreateUsuarioDto): Promise<BackendEnvelope<User>> => {
    const response = await api.post('/usuarios', datos);
    return response.data;
  },
  registrar: async (datos: CreateUsuarioDto): Promise<BackendEnvelope<User>> => {
    return usuariosService.registerUser(datos);
  },

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

  listarUsuariosAdmin: async (params?: { q?: string; rol?: 'APRENDIZ' | 'ADMIN' | 'OPERATIVO' | 'TODOS' }): Promise<BackendEnvelope<AdminUsuarioItem[]>> => {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.rol) query.set('rol', params.rol);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await api.get(`/admin/usuarios${suffix}`);
    return response.data;
  },

  /** Crea un usuario desde el panel admin (cualquier tipo). Si es APRENDIZ envía OTP al correo */
  crearUsuarioAdmin: async (datos: any): Promise<BackendEnvelope<{ mensaje: string; usuario?: User }>> => {
    const response = await api.post('/admin/usuarios', datos);
    return response.data;
  },

  actualizarUsuarioAdmin: async (documento: string, datos: any): Promise<BackendEnvelope<User>> => {
    const response = await api.patch(`/admin/usuarios/${documento}`, datos);
    return response.data;
  },

  eliminarUsuarioAdmin: async (documento: string): Promise<BackendEnvelope<{ mensaje: string }>> => {
    const response = await api.delete(`/admin/usuarios/${documento}`);
    return response.data;
  },
};
