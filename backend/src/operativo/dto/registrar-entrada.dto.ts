import { IsString } from 'class-validator';

export class RegistrarEntradaDto {
  @IsString()
  placa: string;
}
