import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Bahia } from './bahia.entity';

@Entity({ name: 'tipo_bahia' })
export class TipoBahia {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  idTipoB: number;

  @Column({ length: 50 })
  tipoBahia: string;

  // FIX: Auditoría técnica - Timestamps estandarizados en snake_case vía SnakeNamingStrategy
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @OneToMany(() => Bahia, (bahia) => bahia.tipoBahia)
  bahias: Bahia[];
}
