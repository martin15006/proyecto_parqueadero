import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ContrasenaSegura } from '../../common/validators/contrasena-segura.validator';

export class CreateOperativoDto {
  @IsString()
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  @Length(6, 10, { message: 'El documento debe tener entre 6 y 10 caracteres' })
  @Matches(/^[0-9]+$/, { message: 'El documento solo puede contener números' })
  documento: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @Length(3, 50, { message: 'El nombre debe tener entre 3 y 50 caracteres' })
  nombreCompleto: string;

  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @Length(1, 50, { message: 'El correo debe tener máximo 50 caracteres' })
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de teléfono es obligatorio' })
  @Length(10, 10, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El teléfono solo puede contener números' })
  numTelf: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña inicial es obligatoria' })
  @ContrasenaSegura()
  contra: string;
}
