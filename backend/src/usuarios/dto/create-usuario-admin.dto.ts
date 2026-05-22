import {
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUsuarioDto } from './create-usuario.dto';

export class CreateUsuarioAdminDto extends CreateUsuarioDto {
  @Type(() => Number)
  @IsInt({ message: 'El tipo de usuario debe ser un número válido' })
  @Min(1, { message: 'El tipo de usuario debe ser mayor o igual a 1' })
  @IsOptional()
  idTipoUsr?: number;
}
