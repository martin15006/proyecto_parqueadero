import { SetMetadata } from '@nestjs/common';
import { TipoUsuarioEnum } from '../../common/enums/tipo-usuario.enum';

export const ROLES_KEY = 'roles';

/**
 * Tipo de rol permitido en el decorador:
 * - string: 'ADMIN' | 'OPERATIVO' | 'APRENDIZ'
 * - number: TipoUsuarioEnum (ids persistidos en BD)
 */
export type AppRole = keyof typeof TipoUsuarioEnum | TipoUsuarioEnum;

/**
 * Decorador para restringir endpoints por rol (RBAC).
 *
 * @example
 * \@UseGuards(JwtAuthGuard, RolesGuard)
 * \@Roles('ADMIN')
 * \@Post('...')
 * handler() {}
 */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
