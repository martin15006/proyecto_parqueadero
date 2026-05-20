import { IsString } from 'class-validator';

export class RegistrarSalidaDto {
  @IsString()
  placa: string;
}
