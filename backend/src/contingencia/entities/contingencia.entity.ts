import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
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

  @Column({ length: 10 })
  idOperativo: string;

  @Column({ nullable: true })
  idMovimiento: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;
}