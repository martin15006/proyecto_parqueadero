import { IsUUID } from 'class-validator';

export class EscanearQrDto {
  @IsUUID()
  qr: string;
}
