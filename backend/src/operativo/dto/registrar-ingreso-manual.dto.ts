import { IsString, IsNotEmpty, MinLength, ValidateIf } from 'class-validator';

/**
 * DTO para el registro de ingresos manuales por contingencia.
 * RF34: Requiere obligatoriamente el motivo de la contingencia.
 */
export class RegistrarIngresoManualDto {
  @ValidateIf((obj: RegistrarIngresoManualDto) => !obj.placa)
  @IsString()
  @IsNotEmpty({ message: 'La identificación es obligatoria' })
  identificacion?: string;

  @ValidateIf((obj: RegistrarIngresoManualDto) => !obj.identificacion)
  @IsString()
  @IsNotEmpty({ message: 'La placa o documento es obligatorio' })
  placa?: string;

  @IsString()
  @IsNotEmpty({ message: 'El motivo de la contingencia es obligatorio' })
  @MinLength(10, { message: 'El motivo debe ser más descriptivo (mínimo 10 caracteres)' })
  motivo: string;
}
