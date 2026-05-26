import { IsOptional, IsString, Length } from 'class-validator';

export class AdminListVehiculosQueryDto {
  @IsString()
  @IsOptional()
  @Length(1, 10)
  placa?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  marca?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  q?: string;
}

