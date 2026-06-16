import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

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
