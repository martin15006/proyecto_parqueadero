import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class RegistrarVisitaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del visitante es obligatorio' })
  @MaxLength(80)
  nombreVisitante: string;

  @IsString()
  @IsNotEmpty({ message: 'El documento del visitante es obligatorio' })
  @MaxLength(10)
  documentoVisitante: string;

  @IsString()
  @IsNotEmpty({ message: 'La placa del vehículo es obligatoria' })
  @MaxLength(10)
  placa: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  aQuienVisita?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipoVehiculo?: string;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El motivo debe ser más descriptivo (mínimo 3 caracteres)' })
  motivo?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(1440)
  duracionMinutos?: number;
}
