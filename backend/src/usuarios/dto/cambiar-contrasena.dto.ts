import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  contraActual: string;

  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  contraNueva: string;
}