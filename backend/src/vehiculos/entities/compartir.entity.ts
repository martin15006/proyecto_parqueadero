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

@Entity({ name: 'compartir' })
export class Compartir {
  @PrimaryGeneratedColumn({ name: 'id_compartir', type: 'smallint' })
  idCompartir: number;

  @Column({ name: 'documento', type: 'varchar', length: 10 })
  documento: string;

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
