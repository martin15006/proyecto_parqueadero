import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum EstadoVisita {
  ADENTRO = 'ADENTRO',
  SALIDA = 'SALIDA',
}

@Entity({ name: 'visita' })
export class Visita {
  @PrimaryGeneratedColumn()
  idVisita: number;

  @Column({ length: 80 })
  nombreVisitante: string;

  @Index()
  @Column({ length: 10 })
  documentoVisitante: string;

  @Index()
  @Column({ length: 10 })
  placa: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  tipoVehiculo: string | null;

  @Column({ length: 80 })
  aQuienVisita: string;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Index()
  @Column({ type: 'timestamptz' })
  horaIngreso: Date;

  @Column({ type: 'timestamptz', nullable: true })
  horaSalida: Date | null;

  @Index()
  @Column({ type: 'enum', enum: EstadoVisita, default: EstadoVisita.ADENTRO })
  estado: EstadoVisita;

  @Index()
  @Column({ type: 'timestamptz' })
  expiraEn: Date;

  @Column({ length: 10 })
  idOperativoIngreso: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  idOperativoSalida: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
