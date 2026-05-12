import { apiRequest } from './api';
import { CreateUsuarioDto, Usuario } from '../types/usuario';

export const usuarioService = {
  async registrar(datos: CreateUsuarioDto): Promise<Usuario> {
    return apiRequest<Usuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  async cambiarContrasena(
    contraActual: string,
    contraNueva: string,
  ): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>('/usuarios/cambiar-contrasena', {
      method: 'PATCH',
      body: JSON.stringify({ contraActual, contraNueva }),
      conAuth: true,
    });
  },
};