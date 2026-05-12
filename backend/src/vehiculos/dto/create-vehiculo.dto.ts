import { IsString, IsNotEmpty, Length, IsInt, IsPositive } from 'class-validator';

export class CreateVehiculoDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 10, { message: 'La placa debe tener entre 5 y 10 caracteres' })
  placa: string;

  @IsString()
  @IsNotEmpty()
  fotoVehiculo: string;

  @IsString()
  @IsNotEmpty()
  fotoTarjetaP: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  color: string;

  @IsInt()
  @IsPositive()
  idTipoVehiculo: number;
}