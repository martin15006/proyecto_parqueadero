import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  CreateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

import { IotStatusEnum } from '../../common/enums/iot-status.enum';

@Entity('sensor')
export class Sensor {
  @PrimaryGeneratedColumn()
  idSensor: number;

  @Column({ unique: true, length: 50 })
  codigo: string;

  @Column()
  idBahia: number;

  @Column({ default: true })
  activo: boolean;

  @Column({
    name: 'estado_actual', // EXPLÍCITO: Mapeo exacto con la base de datos (RF33)
    type: 'enum',
    enum: IotStatusEnum,
    default: IotStatusEnum.OFFLINE,
  })
  estadoActual: IotStatusEnum;

  @Column({ name: 'bateria', type: 'smallint', nullable: true })
  bateria: number;

  @Column({ name: 'ultima_lectura', type: 'timestamptz', nullable: true })
  ultimaLectura: Date;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: Record<string, any>;

  // FIX: Auditoría técnica - Timestamps estandarizados en snake_case vía SnakeNamingStrategy
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;
}