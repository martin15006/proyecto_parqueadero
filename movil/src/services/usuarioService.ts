import { apiRequest } from './api';
import { CreateUsuarioDto, Usuario } from '../types/usuario';

export const usuarioService = {
  /**
   * Registra un nuevo usuario en el backend.
   */
  async registrar(datos: CreateUsuarioDto): Promise<Usuario> {
    return apiRequest<Usuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },
};