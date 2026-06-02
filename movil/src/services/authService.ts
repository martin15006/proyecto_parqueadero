import { apiRequest } from './api';
import {
  LoginDto,
  LoginPaso1Response,
  VerificarOtpDto,
  VerificarOtpResponse,
  Usuario,
} from '../types/usuario';

export const authService = {
  /**
   * Paso 1 del login: envía correo + contraseña.
   * Si son correctas, el backend envía un OTP al correo.
   */
  async loginPaso1(datos: LoginDto): Promise<LoginPaso1Response> {
    return apiRequest<LoginPaso1Response>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  /**
   * Paso 2 del login: envía el código OTP que llegó al correo.
   * Si es correcto, recibe el JWT y los datos del usuario.
   */
  async verificarOtp(datos: VerificarOtpDto): Promise<VerificarOtpResponse> {
    return apiRequest<VerificarOtpResponse>('/auth/verificar-otp', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  /**
   * Verifica el OTP enviado al registrarse.
   * Si es correcto, activa la cuenta y devuelve tokens (login automático).
   */
  async verificarRegistro(datos: VerificarOtpDto): Promise<VerificarOtpResponse> {
    return apiRequest<VerificarOtpResponse>('/auth/verificar-registro', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  },

  /**
   * Solicita el reenvío de un nuevo código OTP.
   */
  async reenviarOtp(correo: string): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>('/auth/reenviar-otp', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    });
  },

  /**
   * Verifica si el JWT actual sigue siendo válido.
   * Útil al abrir la app para saber si la sesión sigue activa.
   */
  async verificarSesion(): Promise<Usuario> {
    return apiRequest<Usuario>('/auth/me', {
      method: 'GET',
      conAuth: true,
    });
  },

  async solicitarRecuperacion(correo: string): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>('/auth/recuperar/solicitar', {
      method: 'POST',
      body: JSON.stringify({ correo }),
    });
  },

  async verificarRecuperacion(
    correo: string,
    codigo: string,
  ): Promise<{ mensaje: string; valido: boolean }> {
    return apiRequest<{ mensaje: string; valido: boolean }>(
      '/auth/recuperar/verificar',
      {
        method: 'POST',
        body: JSON.stringify({ correo, codigo }),
      },
    );
  },

  async restablecerContrasena(
    correo: string,
    codigo: string,
    contraNueva: string,
  ): Promise<{ mensaje: string }> {
    return apiRequest<{ mensaje: string }>('/auth/recuperar/restablecer', {
      method: 'POST',
      body: JSON.stringify({ correo, codigo, contraNueva }),
    });
  },
};