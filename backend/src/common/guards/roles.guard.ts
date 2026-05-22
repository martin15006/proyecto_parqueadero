import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<number[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // FIX: Normalización de roles para soportar camelCase (Entity) y snake_case (DB/DTO)
    // SECURITY: Validación estricta de presencia de rol para evitar bypass
    const idRol = user?.idTipoUsr ?? user?.id_tipo_usr;

    if (!user || idRol === undefined || idRol === null) {
      return false;
    }

    // Aseguramos comparación numérica ya que los enums son números
    return requiredRoles.includes(Number(idRol));
  }
}