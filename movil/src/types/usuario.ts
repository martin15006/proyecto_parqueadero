// Lo que la app envía al backend para registrar un usuario
export interface CreateUsuarioDto {
  documento: string;
  fotoPersona: string;
  nombreCompleto: string;
  numTelf: string;
  contactoEmerg: string;
  correo: string;
  contra: string;
  idFormacion: string;
}

// Lo que el backend devuelve (sin contraseña)
export interface Usuario {
  documento: string;
  fotoPersona: string;
  nombreCompleto: string;
  numTelf: string;
  contactoEmerg: string;
  correo: string;
  idTipoUsr: number;
  idFormacion: string | null;
  QR: string | null;
}

// Para el paso 1 del login (correo + contraseña)
export interface LoginDto {
  correo: string;
  contra: string;
}

// Respuesta del paso 1: solo confirma que el OTP se envió
export interface LoginPaso1Response {
  mensaje: string;
  correo: string;
}

// Para el paso 2 del login (verificar OTP)
export interface VerificarOtpDto {
  correo: string;
  codigo: string;
}

// Respuesta del paso 2: incluye el JWT
export interface VerificarOtpResponse {
  access_token: string;
  usuario: Usuario;
}

// Forma estándar de errores del backend
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}