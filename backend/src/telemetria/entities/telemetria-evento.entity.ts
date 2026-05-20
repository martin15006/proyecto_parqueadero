import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @CreateDateColumn()
  fechaEvento: Date;
}