import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoSolicitud } from '../entities/solicitud-vehiculo.entity';

export class ResolverSolicitudDto {
  @IsEnum([EstadoSolicitud.APROBADO, EstadoSolicitud.RECHAZADO], {
    message: 'El estado debe ser APROBADO o RECHAZADO',
  })
  estado: EstadoSolicitud.APROBADO | EstadoSolicitud.RECHAZADO;

  /** Obligatorio solo si estado = RECHAZADO */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRechazo?: string;
}
