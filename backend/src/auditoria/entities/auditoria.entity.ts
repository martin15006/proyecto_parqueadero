import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * ENTIDAD DE AUDITORÍA (APPEND-ONLY / INMUTABLE).
 *
 * RNF2 / RF37 / RF24 (Auditoría y Trazabilidad):
 * - Esta tabla debe ser estrictamente "append-only": solo se permite INSERT.
 * - Se eliminan explícitamente los campos que habilitan mutabilidad histórica:
 *   - updatedAt (@UpdateDateColumn) permitiría reescritura de registros (UPDATE).
 *   - deletedAt (@DeleteDateColumn) habilitaría soft-delete (DELETE lógico).
 *
 * NOTA DE SEGURIDAD (DB-level):
 * - La inmutabilidad real no se garantiza únicamente en el ORM.
 * - Se refuerza a nivel de base de datos con triggers que rechazan UPDATE/DELETE
 *   (ver migración de endurecimiento en /migrations).
 */
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
  // INMUTABILIDAD: único timestamp permitido (momento de inserción); no existe updatedAt/deletedAt.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
