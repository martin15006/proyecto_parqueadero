import { IsOptional, IsString, Matches } from 'class-validator';

export class RegistrarEntradaDto {
  @IsString()
  placa: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{6,10}$/, { message: 'documentoIngreso debe ser 6-10 dígitos' })
  documentoIngreso?: string;
}
