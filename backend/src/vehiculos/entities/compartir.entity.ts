import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { RegistroVehiculo } from './registro-vehiculo.entity';

export enum EstadoCompartido {
  PENDIENTE  = 'PENDIENTE',
  ACEPTADO   = 'ACEPTADO',
  RECHAZADO  = 'RECHAZADO',
}

/**
 * Representa la vinculación de un vehículo compartido con otro usuario.
 * Reglas de negocio:
 *  - Un vehículo solo puede ser compartido 1 vez con un receptor (estado PENDIENTE o ACEPTADO).
 *  - Un usuario receptor puede tener máximo 2 vehículos compartidos ACEPTADOS.
 *  - Solo el propietario del registro puede compartir.
 *  - Al compartir, queda en estado PENDIENTE hasta que el receptor lo ACEPTE o RECHACE.
 */
@Entity({ name: 'compartir' })
export class Compartir {
  @PrimaryGeneratedColumn({ name: 'id_compartir', type: 'smallint' })
  idCompartir: number;

  /** Documento del usuario que RECIBE el vehículo compartido */
  @Column({ name: 'documento', type: 'varchar', length: 10 })
  documento: string;

  /** Registro (propietario + vehículo) que se está compartiendo */
  @Column({ name: 'id_registro_v', type: 'int' })
  idRegistroV: number;

  @Column({
    name: 'estado',
    type: 'enum',
    enum: EstadoCompartido,
    default: EstadoCompartido.PENDIENTE,
  })
  estado: EstadoCompartido;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'respondido_en', type: 'timestamptz', nullable: true })
  respondidoEn: Date | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'documento' })
  usuarioReceptor: Usuario;

  @ManyToOne(() => RegistroVehiculo)
  @JoinColumn({ name: 'id_registro_v' })
  registroVehiculo: RegistroVehiculo;
}
