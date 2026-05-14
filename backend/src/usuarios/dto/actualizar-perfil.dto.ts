import { IsString, IsOptional, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class ActualizarPerfilDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(255)
  fotoPersona?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'El teléfono debe tener 10 dígitos' })
  numTelf?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @Matches(/^[0-9]{10}$/, { message: 'El contacto de emergencia debe tener 10 dígitos' })
  contactoEmerg?: string;
}