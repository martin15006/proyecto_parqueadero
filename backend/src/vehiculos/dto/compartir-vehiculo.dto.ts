import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class CompartirVehiculoDto {
  /** Cédula del usuario receptor al que se quiere compartir el vehículo */
  @IsString()
  @IsNotEmpty({ message: 'El documento del receptor es obligatorio' })
  @Length(6, 10, { message: 'El documento debe tener entre 6 y 10 caracteres' })
  @Matches(/^[0-9]+$/, { message: 'El documento solo puede contener números' })
  documentoReceptor: string;
}
