import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class AdminAuditoriaOperacionesQueryDto {
  @IsString()
  @IsOptional()
  @Length(1, 10)
  operativo?: string;

  @IsDateString()
  @IsOptional()
  desde?: string;

  @IsDateString()
  @IsOptional()
  hasta?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}

