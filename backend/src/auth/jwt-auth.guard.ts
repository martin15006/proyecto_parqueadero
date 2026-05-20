import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Usuario de prueba
    request.user = {
      idUsuario: 1,
      documento: '1234567890',
      rol: 'OPERATIVO',
    };

    return true;
  }
}
