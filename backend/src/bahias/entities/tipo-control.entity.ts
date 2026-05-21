import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Bahia } from './bahia.entity';

@Entity({ name: 'tipo_control' })
export class TipoControl {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  idTipoC: number;

  @Column({ length: 30 })
  tipoControl: string;

  // FIX: Auditoría técnica - Timestamps estandarizados en snake_case vía SnakeNamingStrategy
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @OneToMany(() => Bahia, (bahia) => bahia.tipoControl)
  bahias: Bahia[];
}
