import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity({ name: 'tipo_usuario' })
export class TipoUsuario {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  idTipoUsr: number;

  @Column({ length: 20, unique: true })
  tipoUsr: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @OneToMany(() => Usuario, (usuario) => usuario.tipoUsuario)
  usuarios: Usuario[];
}
