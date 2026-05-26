import { IsBoolean } from 'class-validator';

export class UpdateOperativoEstadoDto {
  @IsBoolean()
  activo: boolean;
}

