import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TipoUsuarioEnum } from '../../common/enums/tipo-usuario.enum';
import { AppRole, ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard de autorización basado en roles (RBAC).
 *
 * Responsabilidad:
 * - Leer los roles requeridos desde metadata (@Roles)
 * - Compararlos contra el rol del usuario autenticado (request.user) poblado por JwtStrategy
 *
 * Seguridad:
 * - Fail-closed: si falta usuario/rol o la metadata es inválida, deniega acceso
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Determina si la petición puede continuar según los roles requeridos.
   * @param context Contexto de ejecución de NestJS.
   * @returns true si cumple; caso contrario lanza Unauthorized/Forbidden.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user as { idTipoUsr?: number; id_tipo_usr?: number } | undefined;
    const idRol = user?.idTipoUsr ?? user?.id_tipo_usr;

    if (idRol === undefined || idRol === null) {
      throw new UnauthorizedException('Token inválido o usuario no autenticado');
    }

    const requiredRoleIds = requiredRoles
      .map((role) => {
        if (typeof role === 'number') return role;
        const mapped = TipoUsuarioEnum[role];
        return typeof mapped === 'number' ? mapped : undefined;
      })
      .filter((v): v is number => typeof v === 'number');

    if (requiredRoleIds.length !== requiredRoles.length) {
      throw new ForbiddenException('Acceso denegado');
    }

    if (!requiredRoleIds.includes(Number(idRol))) {
      throw new ForbiddenException('Acceso denegado');
    }

    return true;
  }
}
