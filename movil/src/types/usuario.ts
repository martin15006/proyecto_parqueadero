export interface Usuario {
  documento: string;
  fotoPersona: string;
  nombreCompleto: string;
  numTelf: string;
  contactoEmerg: string;
  correo: string;
  idTipoUsr: number;
  idFormacion?: string | null;
  qr?: string | null;
  correoVerificado?: boolean;
  rol?: string;
}

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

export interface LoginDto {
  correo: string;
  contra: string;
}

export interface LoginPaso1Response {
  mensaje: string;
  correo: string;
}

export interface VerificarOtpDto {
  correo: string;
  codigo: string;
}

export interface VerificarOtpResponse {
  access_token: string;
  refresh_token?: string;
  usuario: Usuario;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
