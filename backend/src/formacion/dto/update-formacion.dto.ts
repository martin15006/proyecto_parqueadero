import { IsString, IsNotEmpty, IsOptional, MaxLength, IsEnum, Matches } from 'class-validator';
import { Jornada } from '../../usuarios/entities/formacion.entity';

export class UpdateFormacionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @Matches(/^[0-9]{1,4}$/, { message: 'El ambiente debe ser numérico (máx. 4 dígitos)' })
  ambiente?: string;

  @IsOptional()
  @IsEnum(Jornada)
  jornada?: Jornada;
}
