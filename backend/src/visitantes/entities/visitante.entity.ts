import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('visitante')
export class Visitante {
  @PrimaryGeneratedColumn()
  idVisitante: number;

  @Column({ length: 120 })
  nombreCompleto: string;

  @Column({ unique: true, length: 20 })
  documento: string;

  @Column({ unique: true, length: 10 })
  placa: string;

  @Column({ length: 50 })
  marca: string;

  @Column({ length: 50 })
  modelo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string;

  @Column()
  idOperativo: number;

  @CreateDateColumn()
  fechaIngreso: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaSalida: Date | null;
}