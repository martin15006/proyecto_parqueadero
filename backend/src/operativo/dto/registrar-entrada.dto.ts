import { IsOptional, IsString, Matches } from 'class-validator';

export class RegistrarEntradaDto {
  @IsString()
  placa: string;

  /**
   * Documento del usuario que efectivamente va a ingresar (dueño o receptor
   * de un compartido ACEPTADO). Opcional: si no se envía, el backend asume
   * al propietario del registro.
   */
  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{6,10}$/, { message: 'documentoIngreso debe ser 6-10 dígitos' })
  documentoIngreso?: string;
}
