import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  IsOptional,
  MinLength,
  IsInt,
  Min,
} from 'class-validator';
import { ContrasenaSegura } from '../../common/validators/contrasena-segura.validator';

// ...dentro de la clase del DTO:


export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  @Length(6, 10, { message: 'El documento debe tener entre 6 y 10 caracteres' })
  @Matches(/^[0-9]+$/, { message: 'El documento solo puede contener números' })
  documento: string;

  @IsString()
  @IsNotEmpty({ message: 'La foto es obligatoria' })
  @Length(1, 255)
  fotoPersona: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @Length(3, 50, { message: 'El nombre debe tener entre 3 y 50 caracteres' })
  nombreCompleto: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de teléfono es obligatorio' })
  @Length(10, 10, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El teléfono solo puede contener números' })
  numTelf: string;

  @IsString()
  @IsNotEmpty({ message: 'El contacto de emergencia es obligatorio' })
  @Length(10, 10, { message: 'El contacto de emergencia debe tener 10 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El contacto de emergencia solo puede contener números' })
  contactoEmerg: string;

  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @Length(1, 50)
  correo: string;

  @IsString()
  @IsNotEmpty()
  @ContrasenaSegura()
  contra: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      return trimmedValue === '' ? undefined : trimmedValue;
    }
    return value;
  })
  @Length(7, 7, { message: 'La ficha debe tener exactamente 7 caracteres' })
  @Matches(/^[0-9]+$/, { message: 'La ficha solo puede contener números' })
  idFormacion?: string;

  @Type(() => Number)
  @IsInt({ message: 'El tipo de usuario debe ser un número válido' })
  @Min(1, { message: 'El tipo de usuario debe ser mayor o igual a 1' })
  @IsNotEmpty({ message: 'El tipo de usuario es obligatorio' })
  idTipoUsr: number;

}