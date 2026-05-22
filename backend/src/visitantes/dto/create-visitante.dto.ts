import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO de creación para visitantes.
 */
export class CreateVisitanteDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @Length(3, 120, { message: 'El nombre completo debe tener entre 3 y 120 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombreCompleto: string;

  @IsString()
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  @Length(6, 20, { message: 'El documento debe tener entre 6 y 20 caracteres' })
  @Matches(/^[0-9A-Za-z-]+$/, { message: 'El documento contiene caracteres inválidos' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  documento: string;

  @IsString()
  @IsNotEmpty({ message: 'La placa es obligatoria' })
  @Length(3, 10, { message: 'La placa debe tener entre 3 y 10 caracteres' })
  @Matches(/^[0-9A-Za-z-]+$/, { message: 'La placa contiene caracteres inválidos' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  placa: string;

  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  @Length(2, 50, { message: 'La marca debe tener entre 2 y 50 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  marca: string;

  @IsString()
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  @Length(1, 50, { message: 'El modelo debe tener entre 1 y 50 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  modelo: string;

  @IsString()
  @IsOptional()
  @Length(0, 1000, { message: 'La descripción es demasiado larga' })
  @Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  })
  descripcion?: string;
}
