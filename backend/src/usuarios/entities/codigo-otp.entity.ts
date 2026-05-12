import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity({ name: 'codigo_otp' })
export class CodigoOtp {
  @PrimaryGeneratedColumn({ name: 'idotp' })
  idOtp: number;

  @Column({ name: 'documento', type: 'varchar', length: 10 })
  documento: string;

  @Column({ name: 'codigo', type: 'varchar', length: 6 })
  codigo: string;

  @Column({ name: 'expiraen', type: 'timestamp' })
  expiraEn: Date;

  @Column({ name: 'intentos', type: 'smallint', default: 0 })
  intentos: number;

  @Column({ name: 'usado', type: 'boolean', default: false })
  usado: boolean;

  @CreateDateColumn({ name: 'creadoen', type: 'timestamp' })
  creadoEn: Date;
}