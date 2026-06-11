import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateParqueaderoEstadoDto {
  @IsBoolean()
  deshabilitado: boolean;

  @ValidateIf((dto: UpdateParqueaderoEstadoDto) => dto.deshabilitado === true)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  duracionEstimada?: string;
}
