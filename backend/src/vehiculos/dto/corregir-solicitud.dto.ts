import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * Datos para que un usuario corrija una solicitud rechazada.
 * Todos los campos son opcionales: solo se actualizan los que el admin marcó como incorrectos.
 */
export class CorregirSolicitudDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  placa?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  idTipoVehiculo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fotoVehiculo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fotoTarjetaP?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fotoPlaca?: string;
}
