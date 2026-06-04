import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { RegistroVehiculo } from './registro-vehiculo.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum EstadoMovimiento {
  TRANSITO = 'TRANSITO',
  ADENTRO = 'ADENTRO',
  SALIDA = 'SALIDA',
  ANULADO = 'ANULADO',
}

@Entity({ name: 'movimiento_vehiculo' })
export class MovimientoVehiculo {
  @PrimaryGeneratedColumn()
  idMovimiento: number;

  @Index() // Acelera reportes históricos por fecha de ingreso
  @Column({ type: 'timestamp' })
  horaIngreso: Date;

  @Index() // Acelera reportes históricos por fecha de salida
  @Column({ type: 'timestamp', nullable: true })
  horaSalida: Date | null;

  @Index() // Optimiza búsquedas de historial por vehículo
  @Column({ type: 'int' })
  idRegistroVehiculo: number;

  @Index() // Filtrado rápido por estado (ADENTRO/SALIDA)
  @Column({
    type: 'enum',
    enum: EstadoMovimiento,
  })
  estado: EstadoMovimiento;

  @Column({ default: false })
  esManual: boolean;

  /**
   * Documento del usuario que efectivamente realizó el ingreso al escanear el QR.
   * Puede ser:
   *  - el propietario del vehículo, o
   *  - un usuario al que se le compartió el vehículo (ACEPTADO).
   *
   * Solo este mismo usuario podrá registrar la salida.
   */
  @Index()
  @Column({ name: 'documento_ingreso', type: 'varchar', length: 10, nullable: true })
  documentoIngreso: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Index() // Optimiza consultas que excluyen registros eliminados (soft delete)
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => RegistroVehiculo, (registro) => registro.movimientos)
  @JoinColumn({ name: 'id_registro_vehiculo' })
  registroVehiculo: RegistroVehiculo;

  /**
   * Relación con el usuario que ejecutó el ingreso (puede ser dueño o receptor de compartido).
   * onDelete SET NULL: si se elimina el usuario, el movimiento se conserva pero pierde el vínculo
   * (preserva el historial para auditoría).
   */
  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'documento_ingreso' })
  usuarioIngreso: Usuario | null;
}
