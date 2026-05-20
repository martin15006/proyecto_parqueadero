import { IsString, MinLength } from 'class-validator';

export class LoginOperativoDto {
  @IsString()
  documento: string;

  @IsString()
  @MinLength(6)
  password: string;
}
