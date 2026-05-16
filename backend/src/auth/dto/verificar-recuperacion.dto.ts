import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerificarRecuperacionDto {
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  codigo: string;
}