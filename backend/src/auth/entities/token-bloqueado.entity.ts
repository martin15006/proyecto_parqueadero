import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('token_bloqueado')
export class TokenBloqueado {
  @PrimaryColumn()
  token: string;

  @Index() // PERFORMANCE: Optimiza la limpieza de la lista negra de tokens
  @Column({ type: 'timestamptz' })
  expiraEn: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
