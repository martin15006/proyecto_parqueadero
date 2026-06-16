import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('auditoria')
export class Auditoria {
  @PrimaryGeneratedColumn()
  idAuditoria: number;

  @Index()
  @Column({ length: 100 })
  accion: string;

  @Index()
  @Column({ length: 100 })
  entidad: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  idEntidad: string;

  @Column({ type: 'json', nullable: true })
  datosAnteriores: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  datosNuevos: Record<string, unknown>;

  @Index()
  @Column({ length: 10 })
  idUsuario: string;

  @Column({ length: 45, nullable: true })
  ip: string;

  @Column({ length: 255, nullable: true })
  userAgent: string;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
