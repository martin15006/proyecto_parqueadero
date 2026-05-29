import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { RegistroVehiculo } from './registro-vehiculo.entity';
import { Bahia } from '../../bahias/entities/bahia.entity';

export enum EstadoMovimiento {
  TRANSITO = 'TRANSITO',
  ADENTRO = 'ADENTRO',
  SALIDA = 'SALIDA',
  ANULADO = 'ANULADO',
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

  /**
   * Bahía asignada al movimiento.
   * Es `null` mientras el vehículo está en tránsito de ingreso (QR escaneado,
   * sensor aún no ha detectado presencia física). El `SerialBridgeService` es
   * el único responsable de asignar este valor al disparar `OCCUPIED`.
   */
  @Index()
  @Column({ type: 'smallint', nullable: true })
  idBahia: number | null;

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

  @ManyToOne(() => Bahia, (bahia) => bahia.movimientos, { nullable: true })
  @JoinColumn({ name: 'id_bahia' })
  bahia: Bahia | null;
}
