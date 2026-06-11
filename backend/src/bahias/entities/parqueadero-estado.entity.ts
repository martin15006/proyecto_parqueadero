import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'parqueadero_estado' })
export class ParqueaderoEstado {
  // Se usa una fila única (id=1) para el estado global, evitando múltiples registros ambiguos.
  @PrimaryColumn({ type: 'smallint' })
  id: number;

  @Column({ type: 'boolean', default: false })
  deshabilitado: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'duracion_estimada' })
  duracionEstimada: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'deshabilitado_desde' })
  deshabilitadoDesde: Date | null;

  // Memoria mínima para evitar spam de alertas 80%/100%: 0 (sin umbral), 80, 100.
  @Column({ type: 'smallint', default: 0, name: 'ultimo_umbral_notificado' })
  ultimoUmbralNotificado: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
