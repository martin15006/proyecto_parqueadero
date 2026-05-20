import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('contingencia')
export class Contingencia {
  @PrimaryGeneratedColumn()
  idContingencia: number;

  @Column({ length: 20 })
  tipoOperacion: string; // INGRESO o SALIDA

  @Column({ length: 20 })
  placa: string;

  @Column({ type: 'text' })
  motivo: string;

  @Column()
  idOperativo: number;

  @CreateDateColumn()
  fechaCreacion: Date;
}