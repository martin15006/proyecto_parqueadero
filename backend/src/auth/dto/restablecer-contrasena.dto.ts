import { IsEmail, IsNotEmpty, MinLength, Length } from 'class-validator';

export class RestablecerContrasenaDto {
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  codigo: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  contraNueva: string;
}