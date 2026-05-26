import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateOperativoDto {
  @IsString()
  @IsOptional()
  @Length(3, 50, { message: 'El nombre debe tener entre 3 y 50 caracteres' })
  nombreCompleto?: string;

  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @IsOptional()
  @Length(1, 50, { message: 'El correo debe tener máximo 50 caracteres' })
  correo?: string;

  @IsString()
  @IsOptional()
  @Length(10, 10, { message: 'El teléfono debe tener exactamente 10 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El teléfono solo puede contener números' })
  numTelf?: string;

  @IsString()
  @IsOptional()
  @Length(10, 10, { message: 'El contacto de emergencia debe tener 10 dígitos' })
  @Matches(/^[0-9]+$/, { message: 'El contacto de emergencia solo puede contener números' })
  contactoEmerg?: string;
}

