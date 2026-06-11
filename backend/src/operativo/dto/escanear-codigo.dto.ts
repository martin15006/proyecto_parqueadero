import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Nota de integración:
 * - El lector físico suele emular teclado + Enter, por lo que llega como string plano.
 * - El backend NO debe asumir prefijos ni formatos especiales; solo normaliza y valida longitud.
 */
export class EscanearCodigoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128) // evita payloads excesivos y entradas maliciosas
  codigo: string;
}

