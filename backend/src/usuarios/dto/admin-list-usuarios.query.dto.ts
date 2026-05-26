import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class AdminListUsuariosQueryDto {
  @IsString()
  @IsOptional()
  @Length(1, 50)
  q?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  nombre?: string;

  @IsString()
  @IsOptional()
  @Length(1, 10)
  documento?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ACTIVO', 'INACTIVO', 'TODOS'])
  estado?: 'ACTIVO' | 'INACTIVO' | 'TODOS';
}

