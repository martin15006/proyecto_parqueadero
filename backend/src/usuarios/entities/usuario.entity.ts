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

/**
 * Entidad de Usuario.
 * Representa a los actores del sistema (Aprendices, Operativos, Administradores).
 * Almacena información personal, credenciales, tokens de notificación y datos institucionales.
 */
@Entity({ name: 'usuario' })
export class Usuario {
  /**
   * Documento de identidad (Cédula/TI). Actúa como identificador primario institucional.
   */
  @PrimaryColumn({ length: 10 })
  documento: string;

  /**
   * URL de la fotografía del perfil almacenada en Cloudinary.
   */
  @Column({ length: 255 })
  fotoPersona: string;

  /**
   * Nombres y apellidos completos.
   */
  @Index()
  @Column({ length: 50 })
  nombreCompleto: string;

  /**
   * Número de teléfono de contacto.
   */
  @Column({ length: 10 })
  numTelf: string;

  /**
   * Número de teléfono de un contacto de emergencia.
   */
  @Column({ length: 10 })
  contactoEmerg: string;

  /**
   * Correo electrónico institucional o personal (Único).
   */
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

  /**
   * Indica si el correo fue verificado vía OTP al momento del registro.
   */
  @Column({ name: 'correo_verificado', type: 'boolean', default: false })
  correoVerificado: boolean;

  /**
   * Token de notificaciones push (Firebase/Expo) para la aplicación móvil.
   */
  @Column({ name: 'push_token', type: 'varchar', length: 255, nullable: true })
  pushToken: string | null;

  /**
   * Fecha de registro en el sistema.
   */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /**
   * Fecha de la última actualización del perfil.
   */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  /**
   * Fecha de eliminación lógica (Soft Delete).
   */
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  // --- RELACIONES ---

  /**
   * Relación con el catálogo de roles/tipos de usuario.
   */
  @ManyToOne(() => TipoUsuario, (tipo) => tipo.usuarios)
  @JoinColumn({ name: 'id_tipo_usr' })
  tipoUsuario: TipoUsuario;

  /**
   * Relación con el catálogo de fichas de formación.
   */
  @ManyToOne(() => Formacion, (formacion) => formacion.usuarios)
  @JoinColumn({ name: 'id_formacion' })
  formacion: Formacion;

  /**
   * Listado de vinculaciones con vehículos.
   */
  @OneToMany(() => RegistroVehiculo, (registro) => registro.usuario)
  registrosVehiculos: RegistroVehiculo[];

  /**
   * Historial de códigos OTP generados para seguridad.
   */
  @OneToMany(() => CodigoOtp, (otp) => otp.usuario)
  otps: CodigoOtp[];
}
