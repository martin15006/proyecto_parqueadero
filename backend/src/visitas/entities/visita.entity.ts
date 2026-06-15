import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export enum EstadoVisita {
  /** Visitante actualmente dentro de las instalaciones. */
  ADENTRO = 'ADENTRO',
  /** Visita cerrada: el visitante ya salió. */
  SALIDA = 'SALIDA',
}

/**
 * Registro **temporal** de un visitante.
 *
 * Tabla deliberadamente AISLADA del modelo de usuarios enrolados (`usuario` /
 * `registro_vehiculo` / `vehiculo`). Un visitante NO es un `Usuario`: por
 * construcción no puede iniciar sesión, no tiene QR y no accede a ninguna
 * función del sistema. Solo el personal operativo crea y cierra estas visitas.
 */
@Entity({ name: 'visita' })
export class Visita {
  @PrimaryGeneratedColumn()
  idVisita: number;

  @Column({ length: 80 })
  nombreVisitante: string;

  @Index()
  @Column({ length: 10 })
  documentoVisitante: string;

  @Index()
  @Column({ length: 10 })
  placa: string;

  /** Texto libre (Carro, Moto, …); el vehículo del visitante no está enrolado. */
  @Column({ type: 'varchar', length: 30, nullable: true })
  tipoVehiculo: string | null;

  /** Persona o dependencia que recibe la visita (anfitrión) — trazabilidad. */
  @Column({ length: 80 })
  aQuienVisita: string;

  @Column({ type: 'text', nullable: true })
  motivo: string | null;

  @Index()
  @Column({ type: 'timestamptz' })
  horaIngreso: Date;

  @Column({ type: 'timestamptz', nullable: true })
  horaSalida: Date | null;

  @Index()
  @Column({ type: 'enum', enum: EstadoVisita, default: EstadoVisita.ADENTRO })
  estado: EstadoVisita;

  /**
   * Vencimiento de la visita (caja de tiempo). No cierra la visita
   * automáticamente —el vehículo puede seguir físicamente dentro—, pero el
   * panel resalta y alerta las visitas vencidas para que el operativo actúe.
   */
  @Index()
  @Column({ type: 'timestamptz' })
  expiraEn: Date;

  /** Documento del operativo que registró el ingreso (auditoría). */
  @Column({ length: 10 })
  idOperativoIngreso: string;

  /** Documento del operativo que registró la salida (auditoría). */
  @Column({ type: 'varchar', length: 10, nullable: true })
  idOperativoSalida: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
