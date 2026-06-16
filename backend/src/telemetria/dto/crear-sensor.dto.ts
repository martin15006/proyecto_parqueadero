import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CrearSensorDto {
  @IsString()
  @IsNotEmpty({ message: 'El código del sensor es obligatorio' })
  @MaxLength(50)
  codigo: string;

  @IsInt()
  @Min(1)
  idBahia: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
