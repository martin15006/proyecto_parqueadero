import { IsNotEmpty, IsString } from 'class-validator';
import { ContrasenaSegura } from '../../common/validators/contrasena-segura.validator';

export class ResetPasswordOperativoDto {
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @ContrasenaSegura()
  contra: string;
}

