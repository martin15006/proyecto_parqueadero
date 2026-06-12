import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { TipoVehiculo } from './tipo-vehiculo.entity';

export enum EstadoSolicitud {
  PENDIENTE  = 'PENDIENTE',
  APROBADO   = 'APROBADO',
  RECHAZADO  = 'RECHAZADO',
}

/**
 * Solicitud de registro de vehículo enviada por un usuario.
 * El administrador la revisa y la aprueba o rechaza.
 * Si se aprueba, se crea el Vehiculo + RegistroVehiculo correspondientes.
 */
@Entity({ name: 'solicitud_vehiculo' })
export class SolicitudVehiculo {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud: number;

  @Index()
  @Column({ name: 'documento', type: 'varchar', length: 10 })
  documento: string;

  @Column({ name: 'placa', type: 'varchar', length: 10 })
  placa: string;

  @Column({ name: 'foto_vehiculo', type: 'varchar', length: 255 })
  fotoVehiculo: string;

  @Column({ name: 'foto_tarjeta_p', type: 'varchar', length: 255 })
  fotoTarjetaP: string;

  @Column({ name: 'foto_placa', type: 'varchar', length: 255, nullable: true })
  fotoPlaca: string | null;

  @Column({ name: 'color', type: 'varchar', length: 50 })
  color: string;

  @Column({ name: 'id_tipo_vehiculo', type: 'smallint' })
  idTipoVehiculo: number;

  @Index()
  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoSolicitud,
    default: EstadoSolicitud.PENDIENTE,
  })
  estado: EstadoSolicitud;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string | null;

  /**
   * Campos específicos que el administrador marcó como incorrectos al rechazar.
   * El usuario solo podrá corregir estos campos desde el móvil.
   * Claves posibles: placa, color, idTipoVehiculo, fotoVehiculo, fotoTarjetaP, fotoPlaca.
   */
  @Column({ name: 'campos_rechazados', type: 'jsonb', nullable: true })
  camposRechazados: string[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  creadoEn: Date;

  @Column({ name: 'resuelto_en', type: 'timestamptz', nullable: true })
  resueltoEn: Date | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'documento' })
  usuario: Usuario;

  @ManyToOne(() => TipoVehiculo)
  @JoinColumn({ name: 'id_tipo_vehiculo' })
  tipoVehiculo: TipoVehiculo;
}
