import { IsIn, IsString } from 'class-validator';

export class ForzarEstadoBahiaDto {
  @IsString()
  @IsIn(['AVAILABLE', 'OCCUPIED', 'DISABLED', 'AUTO'])
  estado: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED' | 'AUTO';
}

