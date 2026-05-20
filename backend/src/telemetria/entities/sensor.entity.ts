import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ type: 'timestamp', nullable: true })
  ultimaLectura: Date;

  @UpdateDateColumn()
  fechaActualizacion: Date;
}