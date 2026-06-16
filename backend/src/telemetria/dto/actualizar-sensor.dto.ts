import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ActualizarSensorDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  idBahia?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
