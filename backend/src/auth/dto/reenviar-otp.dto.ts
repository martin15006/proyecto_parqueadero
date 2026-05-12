import { IsEmail, IsNotEmpty } from 'class-validator';

export class ReenviarOtpDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  correo: string;
}