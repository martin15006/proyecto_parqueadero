import { IsString, IsNotEmpty, Length, Matches, IsEmail } from 'class-validator';

export class VerificarOtpDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'El código es obligatorio' })
  @Length(6, 6, { message: 'El código debe tener 6 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El código solo puede contener números' })
  codigo: string;
}