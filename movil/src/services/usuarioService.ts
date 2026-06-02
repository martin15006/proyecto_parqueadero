import { apiRequest } from './api';
import { CreateUsuarioDto, Usuario } from '../types/usuario';

export interface ActualizarPerfilDto {
  fotoPersona?: string;
  numTelf?: string;
  contactoEmerg?: string;
}

export const usuarioService = {
  /**
   * Registra un nuevo usuario.
   * El backend envía un OTP al correo y devuelve { mensaje, correo }.
   * El usuario debe verificar el OTP antes de poder iniciar sesión.
   */
  async registrar(datos: CreateUsuarioDto): Promise<{ mensaje: string; correo: string }> {
    return apiRequest<{ mensaje: string; correo: string }>('/usuarios', {
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

  async actualizarPerfil(datos: ActualizarPerfilDto): Promise<Usuario> {
    return apiRequest<Usuario>('/usuarios/perfil', {
      method: 'PATCH',
      body: JSON.stringify(datos),
      conAuth: true,
    });
  },

  async solicitarCambioCorreo(nuevoCorreo: string): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>('/usuarios/correo/solicitar', {
      method: 'POST',
      body: JSON.stringify({ nuevoCorreo }),
      conAuth: true,
    });
  },

  async confirmarCambioCorreo(nuevoCorreo: string, codigo: string): Promise<Usuario> {
    return apiRequest<Usuario>('/usuarios/correo/confirmar', {
      method: 'POST',
      body: JSON.stringify({ nuevoCorreo, codigo }),
      conAuth: true,
    });
  },
};
