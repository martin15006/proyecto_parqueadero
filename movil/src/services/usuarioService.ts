import { apiRequest } from './api';
import { CreateUsuarioDto, Usuario } from '../types/usuario';

export interface ActualizarPerfilDto {
  fotoPersona?: string;
  numTelf?: string;
  contactoEmerg?: string;
}

export const usuarioService = {
  async registrar(datos: CreateUsuarioDto): Promise<Usuario> {
    console.log('📤 Enviando al backend:', JSON.stringify(datos, null, 2));
    try {
      const respuesta = await apiRequest<Usuario>('/usuarios', {
        method: 'POST',
        body: JSON.stringify(datos),
      });
      console.log('✅ Usuario registrado:', respuesta);
      return respuesta;
    } catch (error: any) {
      console.log('❌ ERROR del backend:', error.message);
      throw error;
    }
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