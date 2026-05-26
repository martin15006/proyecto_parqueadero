import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'parqueadero_estado' }) // RF14/RF39: tabla de estado global (fuente institucional) del parqueadero.
export class ParqueaderoEstado {
  @PrimaryColumn({ type: 'smallint' }) // DISEÑO: se usa una fila única (id=1) para estado global, evitando múltiples registros ambiguos.
  id: number; // DISEÑO: clave primaria fija para leer/escribir el estado global sin joins complejos.

  @Column({ type: 'boolean', default: false }) // RF14: bandera institucional que bloquea ingresos cuando el admin deshabilita el parqueadero.
  deshabilitado: boolean; // RF14: true => el sistema debe impedir cualquier ingreso (operativo/contingencia).

  @Column({ type: 'varchar', length: 255, nullable: true }) // RF14: motivo persistido para comunicar al usuario y soportar auditoría funcional.
  motivo: string | null; // RF14: requerido cuando deshabilitado=true; null cuando habilitado.

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'duracion_estimada' }) // RF14: duración estimada (texto) para planificación del usuario.
  duracionEstimada: string | null; // RF14: opcional; puede ser "30 min", "Hasta nuevo aviso", etc.

  @Column({ type: 'timestamptz', nullable: true, name: 'deshabilitado_desde' }) // RF14: fecha/hora desde la cual rige el bloqueo administrativo.
  deshabilitadoDesde: Date | null; // RF14: útil para UI y trazabilidad sin exponer PII.

  @Column({ type: 'smallint', default: 0, name: 'ultimo_umbral_notificado' }) // RF13/RF39: memoria mínima para evitar spam de alertas 80%/100%.
  ultimoUmbralNotificado: number; // RF13/RF39: 0 (sin umbral), 80 (alertado), 100 (lleno alertado).

  @UpdateDateColumn({ type: 'timestamptz' }) // OPERACIÓN: timestamp técnico de última actualización del estado (no es auditoría inmutable).
  updatedAt: Date; // OPERACIÓN: permite monitoreo de cambios sin requerir tablas adicionales.
}
