import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';
import { TipoBahia } from './tipo-bahia.entity';
import { IotStatusEnum } from '../../common/enums/iot-status.enum';
import { BahiaReconciliacionEstadoEnum } from '../../common/enums/bahia-reconciliacion-estado.enum';

@Entity({ name: 'bahia' })
export class Bahia {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  idBahia: number;

  @Column({ length: 20 })
  nombreBahia: string;

  @Index() // PERFORMANCE: Optimiza el filtrado por tipo de bahía (Ej. Discapacitados, Motos)
  @Column({ type: 'smallint' })
  idTipoBahia: number;

  // FIX: Auditoría técnica - Timestamps estandarizados en snake_case vía SnakeNamingStrategy
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Index() // PERFORMANCE: Optimiza consultas de disponibilidad que excluyen bahías eliminadas
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @Column({ name: 'estado_manual', type: 'varchar', length: 12, nullable: true })
  estadoManual: IotStatusEnum | null;

  @Index()
  @Column({
    name: 'estado_reconciliado',
    type: 'varchar',
    length: 16,
    default: BahiaReconciliacionEstadoEnum.LIBRE,
  })
  estadoReconciliado: BahiaReconciliacionEstadoEnum;

  @Index()
  @Column({ name: 'transito_desde', type: 'timestamptz', nullable: true })
  transitoDesde: Date | null;

  @Column({ name: 'discrepancia_desde', type: 'timestamptz', nullable: true })
  discrepanciaDesde: Date | null;

  @Column({ name: 'ultima_telemetria_at', type: 'timestamptz', nullable: true })
  ultimaTelemetriaAt: Date | null;

  @Column({ name: 'ultimo_fisico_ocupado', type: 'boolean', nullable: true })
  ultimoFisicoOcupado: boolean | null;

  @ManyToOne(() => TipoBahia, (tipo) => tipo.bahias)
  @JoinColumn({ name: 'id_tipo_bahia' })
  tipoBahia: TipoBahia;
}
