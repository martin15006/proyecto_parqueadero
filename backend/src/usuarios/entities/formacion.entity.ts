import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

export enum Jornada {
  MANANA = 'MAÑANA',
  TARDE = 'TARDE',
  NOCHE = 'NOCHE',
}

@Entity({ name: 'formacion' })
export class Formacion {
  @PrimaryColumn({ length: 7 })
  ficha: string;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 4, nullable: true })
  ambiente: string;

  @Column({
    type: 'enum',
    enum: Jornada,
    nullable: true,
  })
  jornada: Jornada;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @OneToMany(() => Usuario, (usuario) => usuario.formacion)
  usuarios: Usuario[];
}
