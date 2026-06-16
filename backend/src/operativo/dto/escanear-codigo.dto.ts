import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EscanearCodigoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128) // evita payloads excesivos y entradas maliciosas
  codigo: string;
}

