import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { TipoBahia } from './tipo-bahia.entity';
import { TipoControl } from './tipo-control.entity';
import { MovimientoVehiculo } from '../../vehiculos/entities/movimiento-vehiculo.entity';

@Entity({ name: 'bahia' })
export class Bahia {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  idBahia: number;

  @Column({ length: 20 })
  nombreBahia: string;

  @Index() // PERFORMANCE: Optimiza el filtrado por tipo de bahía (Ej. Discapacitados, Motos)
  @Column({ type: 'smallint' })
  idTipoBahia: number;

  @Index() // PERFORMANCE: Optimiza el filtrado por tipo de control (Ej. Sensor, Manual)
  @Column({ type: 'smallint' })
  idTipoControl: number;

  // FIX: Auditoría técnica - Timestamps estandarizados en snake_case vía SnakeNamingStrategy
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Index() // PERFORMANCE: Optimiza consultas de disponibilidad que excluyen bahías eliminadas
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => TipoBahia, (tipo) => tipo.bahias)
  @JoinColumn({ name: 'id_tipo_bahia' })
  tipoBahia: TipoBahia;

  @ManyToOne(() => TipoControl, (tipo) => tipo.bahias)
  @JoinColumn({ name: 'id_tipo_control' })
  tipoControl: TipoControl;

  @OneToMany(() => MovimientoVehiculo, (movimiento) => movimiento.bahia)
  movimientos: MovimientoVehiculo[];
}
