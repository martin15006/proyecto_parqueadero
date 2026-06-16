import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfirmarIngresoMultivehiculoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  placa: string;
}
