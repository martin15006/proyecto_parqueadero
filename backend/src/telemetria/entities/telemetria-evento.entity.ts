import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('telemetria_evento')
export class TelemetriaEvento {
  @PrimaryGeneratedColumn()
  idEvento: number;

  @Column()
  idSensor: number;

  @Column({ length: 30 })
  tipoEvento: string; // OCUPADO, LIBRE, ERROR

  @Column({ type: 'json', nullable: true })
  payload: Record<string, any>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;
}