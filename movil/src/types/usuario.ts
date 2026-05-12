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

// Para el login
export interface LoginDto {
  correo: string;
  contra: string;
}

// Forma estándar de errores del backend
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}