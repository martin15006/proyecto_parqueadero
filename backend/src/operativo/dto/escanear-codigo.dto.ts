import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * RF31/RF33: DTO para recibir el token leído por el hardware en portería (lector de barras/QR).
 *
 * Nota de integración:
 * - El lector físico suele emular teclado + Enter, por lo que llega como string plano.
 * - El backend NO debe asumir prefijos ni formatos especiales; solo normaliza y valida longitud.
 */
export class EscanearCodigoDto {
  @IsString() // RF33: el lector entrega una cadena estándar.
  @IsNotEmpty() // RF31: el código es obligatorio para identificar al aprendiz.
  @MaxLength(128) // HARDENING: evita payloads excesivos y entradas maliciosas.
  codigo: string; // RF31: token alfanumérico (Code128) o UUID (QR futuro) que identifica al usuario de forma opaca.
}

