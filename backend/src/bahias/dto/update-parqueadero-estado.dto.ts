import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateParqueaderoEstadoDto {
  @IsBoolean()
  deshabilitado: boolean;

  @ValidateIf((dto: UpdateParqueaderoEstadoDto) => dto.deshabilitado === true) // RF14: solo exigimos motivo cuando el admin deshabilita el parqueadero.
  @IsString() // RF14: el motivo es texto para que el usuario lo entienda y el frontend lo muestre tal cual.
  @IsNotEmpty() // RF14: el motivo no puede ser vacío si el estado es DESHABILITADO.
  @MaxLength(255) // HARDENING: limita tamaño para evitar payloads excesivos (protección básica de API).
  motivo?: string; // RF14: razón obligatoria de deshabilitación para transparencia institucional.

  @IsOptional() // RF14: el documento permite que la duración sea opcional/variable (minutos o texto); no bloquea si no se provee.
  @IsString() // RF14: se permite texto libre (ej. "30 min", "Hasta nuevo aviso").
  @MaxLength(120) // HARDENING: evita datos descontrolados y facilita render en UI.
  duracionEstimada?: string; // RF14: duración estimada comunicable al usuario para planificar su ingreso.
}
