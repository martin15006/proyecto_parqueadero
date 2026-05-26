import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class SalidaEmergenciaVehiculoDto {
  @ValidateIf((o) => o.idRegistroVehiculo === undefined || o.idRegistroVehiculo === null)
  @IsString()
  @IsNotEmpty({ message: 'La placa es obligatoria si no se envía idRegistroVehiculo' })
  @Length(5, 10)
  @Matches(/^[A-Z0-9]+$/i)
  placa?: string;

  @ValidateIf((o) => o.placa === undefined || o.placa === null || String(o.placa).trim() === '')
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  idRegistroVehiculo?: number;

  @IsString()
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @Length(5, 500)
  motivo: string;
}

