import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Validar JWT estándar vía Passport
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    // 2. Verificar si el token está en la lista negra (logout)
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (token) {
      const isRevocado = await this.authService.isTokenRevocado(token);
      if (isRevocado) {
        throw new UnauthorizedException('Token revocado. Inicie sesión nuevamente.');
      }
    }

    return true;
  }
}
