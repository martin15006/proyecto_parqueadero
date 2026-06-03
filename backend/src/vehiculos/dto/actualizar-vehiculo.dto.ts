import { IsString, IsOptional, IsNotEmpty, Length } from 'class-validator';

/**
 * Solo se permite editar la foto del vehículo y el color.
 * Hay además una restricción de 15 días entre ediciones, validada en el service.
 */
export class ActualizarVehiculoDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  fotoVehiculo?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Length(1, 50)
  color?: string;
}
