import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('sesion_activa')
export class SesionActiva {
  @PrimaryGeneratedColumn('uuid')
  idSesion: string;

  @Index() // PERFORMANCE: Optimiza la búsqueda de sesiones por documento de usuario
  @Column({ length: 10 })
  documento: string;

  @Column({ unique: true })
  refreshToken: string;

  @Index() // PERFORMANCE: Optimiza la limpieza de sesiones expiradas
  @Column({ type: 'timestamptz' })
  expiraEn: Date;

  @Index() // PERFORMANCE: Optimiza el filtrado de sesiones activas/revocadas
  @Column({ default: false })
  revocado: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'documento' })
  usuario: Usuario;
}
