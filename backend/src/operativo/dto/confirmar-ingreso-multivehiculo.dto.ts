import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Decisión de seguridad:
 * - Se reenvía el `codigo` leído en portería para revalidar el usuario sin mantener estado server-side.
 * - Se envía la `placa` seleccionada para confirmar cuál vehículo se observa físicamente.
 */
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
