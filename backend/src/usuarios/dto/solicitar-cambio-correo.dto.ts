import { IsEmail, IsNotEmpty } from 'class-validator';

export class SolicitarCambioCorreoDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @IsNotEmpty()
  nuevoCorreo: string;
}