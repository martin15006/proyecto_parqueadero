import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * RF31: DTO de confirmación secundaria cuando el aprendiz tiene múltiples vehículos.
 *
 * Decisión de seguridad:
 * - Se reenvía el `codigo` leído en portería para revalidar el usuario sin mantener estado server-side.
 * - Se envía la `placa` seleccionada para confirmar cuál vehículo se observa físicamente.
 */
export class ConfirmarIngresoMultivehiculoDto {
  @IsString() // RF31: el código siempre es string.
  @IsNotEmpty() // RF31: sin código no se puede validar el aprendiz.
  @MaxLength(128) // HARDENING: limita tamaño por seguridad.
  codigo: string; // RF31: token alfanumérico/UUID que identifica al usuario.

  @IsString() // RF31: la placa se maneja como string.
  @IsNotEmpty() // RF31: selección obligatoria del vehículo observado.
  @MaxLength(10) // HARDENING: coincide con longitud típica de placa.
  placa: string; // RF31: placa elegida por el operativo en el modal.
}

