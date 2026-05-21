import { Request } from 'express';

export interface IJwtPayload {
  sub: string;     // Documento del usuario
  correo?: string;
  idTipoUsr: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: IJwtPayload;
  ip: string;
}
