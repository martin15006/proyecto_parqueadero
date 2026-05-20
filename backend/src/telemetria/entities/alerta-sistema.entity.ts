import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('alerta_sistema')
export class AlertaSistema {
  @PrimaryGeneratedColumn()
  idAlerta: number;

  @Column({ length: 30 })
  tipo: string; // CAPACIDAD_80, LLENO, DESHABILITADO, SENSOR_SIN_DATOS

  @Column({ type: 'text' })
  mensaje: string;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn()
  fechaCreacion: Date;
}