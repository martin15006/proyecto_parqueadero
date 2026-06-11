import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { TipoUsuario } from './tipo-usuario.entity';
import { Formacion } from './formacion.entity';
import { RegistroVehiculo } from '../../vehiculos/entities/registro-vehiculo.entity';
import { CodigoOtp } from './codigo-otp.entity';

@Entity({ name: 'usuario' })
export class Usuario {
  /**
   * Documento de identidad (Cédula/TI). Actúa como identificador primario institucional.
   */
  @PrimaryColumn({ length: 10 })
  documento: string;

  @Column({ length: 255 })
  fotoPersona: string;

  @Index()
  @Column({ length: 50 })
  nombreCompleto: string;

  @Column({ length: 10 })
  numTelf: string;

  @Column({ length: 10 })
  contactoEmerg: string;

  @Index({ unique: true })
  @Column({ length: 50, unique: true })
  correo: string;

  /**
   * Hash de la contraseña (BCrypt).
   */
  @Exclude()
  @Column({ name: 'password', length: 255 })
  contra: string;

  /**
   * Identificador del tipo de usuario (Roles: 1=Aprendiz, 2=Admin, 3=Operativo).
   */
  @Index()
  @Column({ name: 'id_tipo_usr', type: 'smallint' })
  idTipoUsr: number;

  /**
   * Código de la ficha de formación (Solo para Aprendices).
   */
  @Index()
  @Column({ name: 'id_formacion', type: 'varchar', length: 7, nullable: true })
  idFormacion: string | null;

  /**
   * Token único para la generación del código QR institucional dinámico.
   */
  @Exclude()
  @Index({ unique: true })
  @Column({ name: 'qr', type: 'varchar', length: 100, nullable: true, unique: true })
  qr: string | null;

  @Column({ name: 'correo_verificado', type: 'boolean', default: false })
  correoVerificado: boolean;

  /**
   * Token de notificaciones push (Firebase/Expo) para la aplicación móvil.
   */
  @Column({ name: 'push_token', type: 'varchar', length: 255, nullable: true })
  pushToken: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  /**
   * Fecha de eliminación lógica (Soft Delete).
   */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @ManyToOne(() => TipoUsuario, (tipo) => tipo.usuarios)
  @JoinColumn({ name: 'id_tipo_usr' })
  tipoUsuario: TipoUsuario;

  @ManyToOne(() => Formacion, (formacion) => formacion.usuarios)
  @JoinColumn({ name: 'id_formacion' })
  formacion: Formacion;

  @OneToMany(() => RegistroVehiculo, (registro) => registro.usuario)
  registrosVehiculos: RegistroVehiculo[];

  @OneToMany(() => CodigoOtp, (otp) => otp.usuario)
  otps: CodigoOtp[];
}
