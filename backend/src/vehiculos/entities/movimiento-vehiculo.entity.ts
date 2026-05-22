import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { RegistroVehiculo } from './registro-vehiculo.entity';
import { Bahia } from '../../bahias/entities/bahia.entity';

export enum EstadoMovimiento {
  ADENTRO = 'ADENTRO',
  SALIDA = 'SALIDA',
}

@Entity({ name: 'movimiento_vehiculo' })
@Index(['estado', 'idBahia']) // PERFORMANCE: Índice compuesto para búsquedas de ocupación en tiempo real
export class MovimientoVehiculo {
  @PrimaryGeneratedColumn()
  idMovimiento: number;

  @Index() // PERFORMANCE: Acelera reportes históricos por fecha de ingreso
  @Column({ type: 'timestamp' })
  horaIngreso: Date;

  @Index() // PERFORMANCE: Acelera reportes históricos por fecha de salida
  @Column({ type: 'timestamp', nullable: true })
  horaSalida: Date | null;

  @Index() // PERFORMANCE: Optimiza búsquedas de historial por vehículo
  @Column({ type: 'int' })
  idRegistroVehiculo: number;

  @Index() // PERFORMANCE: Optimiza búsquedas de historial por bahía
  @Column({ type: 'smallint' })
  idBahia: number;

  @Index() // PERFORMANCE: Filtrado rápido por estado (ADENTRO/SALIDA)
  @Column({
    type: 'enum',
    enum: EstadoMovimiento,
  })
  estado: EstadoMovimiento;

  @Column({ default: false })
  esManual: boolean;

  // FIX: Auditoría técnica - Timestamps estandarizados en snake_case vía SnakeNamingStrategy
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Index() // PERFORMANCE: Optimiza consultas que excluyen registros eliminados (soft delete)
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => RegistroVehiculo, (registro) => registro.movimientos)
  @JoinColumn({ name: 'id_registro_vehiculo' })
  registroVehiculo: RegistroVehiculo;

  @ManyToOne(() => Bahia, (bahia) => bahia.movimientos)
  @JoinColumn({ name: 'id_bahia' })
  bahia: Bahia;
}
