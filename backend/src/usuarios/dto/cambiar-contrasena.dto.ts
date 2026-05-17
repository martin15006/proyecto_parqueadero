import { IsString, IsNotEmpty } from 'class-validator';
import { ContrasenaSegura } from '../../common/validators/contrasena-segura.validator';

export class CambiarContrasenaDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  contraActual: string;

  @IsString()
  @IsNotEmpty()
  @ContrasenaSegura()
  contraNueva: string;
}