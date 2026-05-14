import { IsString, IsOptional, IsNotEmpty, Length, IsInt, IsPositive } from 'class-validator';

export class ActualizarVehiculoDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  fotoVehiculo?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  fotoTarjetaP?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Length(1, 50)
  color?: string;

  @IsInt()
  @IsOptional()
  @IsPositive()
  idTipoVehiculo?: number;
}