import { apiRequest } from './api';
import { CreateUsuarioDto, Usuario, LoginDto } from '../types/usuario';

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

  /**
   * Inicia sesión con correo y contraseña.
   */
  async login(datos: LoginDto): Promise<Usuario> {
    return apiRequest<Usuario>('/usuarios/login', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },
};