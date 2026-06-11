import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    // Verificar si el token está en la lista negra (logout)
    const request = context.switchToHttp().getRequest();
    if (!request?.headers) {
      throw new UnauthorizedException('Token inválido');
    }

    const authHeader = request.headers.authorization;
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const raw = typeof headerValue === 'string' ? headerValue.trim() : '';

    if (!raw.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Token inválido');
    }

    const token = raw.slice(7).trim();

    if (token) {
      if (!this.authService || typeof this.authService.isTokenRevocado !== 'function') {
        throw new UnauthorizedException('Usuario no válido o no encontrado');
      }

      const isRevocado = await this.authService.isTokenRevocado(token);
      if (isRevocado) {
        throw new UnauthorizedException('Token revocado. Inicie sesión nuevamente.');
      }
    } else {
      throw new UnauthorizedException('Token inválido');
    }

    return true;
  }
}
