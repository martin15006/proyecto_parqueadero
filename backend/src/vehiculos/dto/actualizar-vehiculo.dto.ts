import { IsString, IsOptional, IsNotEmpty, Length } from 'class-validator';

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
