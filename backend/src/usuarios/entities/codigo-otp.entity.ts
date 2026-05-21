import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity({ name: 'codigo_otp' })
export class CodigoOtp {
  @PrimaryGeneratedColumn()
  idOtp: number;

  @Column({ length: 10 })
  documento: string;

  @Column({ length: 6 })
  codigo: string;

  @Column({ type: 'timestamp' })
  expiraEn: Date;

  @Column({ type: 'smallint', default: 0 })
  intentos: number;

  @Column({ default: false })
  usado: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  // FIX: zj9up6 - agregada relación bidireccional faltante usuario <-> codigoOtp
  @ManyToOne(() => Usuario, (usuario) => usuario.otps)
  @JoinColumn({ name: 'documento' })
  usuario: Usuario;
}
