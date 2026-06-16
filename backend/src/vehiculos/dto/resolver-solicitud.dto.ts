import { IsArray, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoSolicitud } from '../entities/solicitud-vehiculo.entity';

export const CAMPOS_SOLICITUD = [
  'placa',
  'color',
  'idTipoVehiculo',
  'fotoVehiculo',
  'fotoTarjetaP',
  'fotoPlaca',
] as const;

export type CampoSolicitud = (typeof CAMPOS_SOLICITUD)[number];

export class ResolverSolicitudDto {
  @IsEnum([EstadoSolicitud.APROBADO, EstadoSolicitud.RECHAZADO], {
    message: 'El estado debe ser APROBADO o RECHAZADO',
  })
  estado: EstadoSolicitud.APROBADO | EstadoSolicitud.RECHAZADO;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRechazo?: string;

  @IsOptional()
  @IsArray()
  @IsIn(CAMPOS_SOLICITUD, { each: true, message: 'Campo a corregir no válido' })
  camposRechazados?: CampoSolicitud[];
}
