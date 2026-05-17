import { IsEmail, IsNotEmpty, Length, IsString } from 'class-validator';
import { ContrasenaSegura } from '../../common/validators/contrasena-segura.validator';

export class RestablecerContrasenaDto {
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @IsNotEmpty()
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @ContrasenaSegura()
  contraNueva: string;
}