import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CrearBahiaDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la bahía es obligatorio' })
  @MaxLength(20)
  nombreBahia: string;

  @IsInt()
  @Min(1)
  idTipoBahia: number;
}
