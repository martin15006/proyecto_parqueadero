import { SetMetadata } from '@nestjs/common';
import { TipoUsuarioEnum } from '../../common/enums/tipo-usuario.enum';

export const ROLES_KEY = 'roles';

export type AppRole = keyof typeof TipoUsuarioEnum | TipoUsuarioEnum;

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
