import { IsArray, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoSolicitud } from '../entities/solicitud-vehiculo.entity';

/** Campos de una solicitud que el admin puede marcar como incorrectos. */
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

  /** Obligatorio solo si estado = RECHAZADO (a menos que se marquen campos) */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRechazo?: string;

  /** Campos específicos a corregir (solo aplica al rechazar) */
  @IsOptional()
  @IsArray()
  @IsIn(CAMPOS_SOLICITUD, { each: true, message: 'Campo a corregir no válido' })
  camposRechazados?: CampoSolicitud[];
}
