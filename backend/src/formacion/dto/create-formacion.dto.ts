import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength, IsEnum } from 'class-validator';
import { Jornada } from '../../usuarios/entities/formacion.entity';

export class CreateFormacionDto {
  @IsString()
  @Matches(/^[0-9]{7}$/, { message: 'La ficha debe tener 7 dígitos' })
  ficha: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del programa es obligatorio' })
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @Matches(/^[0-9]{1,4}$/, { message: 'El ambiente debe ser numérico (máx. 4 dígitos)' })
  ambiente?: string;

  @IsOptional()
  @IsEnum(Jornada)
  jornada?: Jornada;
}
