import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('auditoria')
export class Auditoria {
  @PrimaryGeneratedColumn()
  idAuditoria: number;

  @Column({ length: 100 })
  accion: string;

  @Column({ length: 100 })
  entidad: string;

  @Column({ nullable: true })
  idEntidad: number;

  @Column({ type: 'json', nullable: true })
  datosAnteriores: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  datosNuevos: Record<string, any>;

  @Column()
  idUsuario: number;

  @Column({ length: 45, nullable: true })
  ip: string;

  @Column({ length: 255, nullable: true })
  userAgent: string;

  @CreateDateColumn()
  fechaCreacion: Date;
}