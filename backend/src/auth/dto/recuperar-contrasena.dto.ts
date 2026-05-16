import { IsEmail, IsNotEmpty } from 'class-validator';

export class SolicitarRecuperacionDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty()
  correo: string;
}