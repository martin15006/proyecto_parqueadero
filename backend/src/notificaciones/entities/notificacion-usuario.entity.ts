import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * RF25 (Historial visible al usuario):
 * - Esta entidad persiste un registro consultable de notificaciones/alertas relevantes para el Aprendiz.
 * - Se utiliza para:
 *   - Salidas de emergencia (RF24 → RF25).
 *   - Parqueadero deshabilitado (RF14 → RF25).
 *
 * RNF2 (Privacidad):
 * - No se almacenan contraseñas, tokens JWT ni contenido de QR.
 * - Se almacena referencia por documento (idUsuario) porque el sistema ya usa documento como identificador.
 */
@Entity({ name: 'notificacion_usuario' })
export class NotificacionUsuario {
  @PrimaryGeneratedColumn() // RF25: ID interno para paginación/consulta sin exponer PII adicional.
  id: number;

  @Index() // RF25: se consulta frecuentemente por usuario (bandeja del Aprendiz).
  @Column({ type: 'varchar', length: 10, name: 'id_usuario' }) // RF25: destinatario (documento) para asociar bandeja.
  idUsuario: string;

  @Index() // RF25: permite filtrar por tipo de evento (emergencia, deshabilitado, etc.).
  @Column({ type: 'varchar', length: 50 }) // RF25: tipo semántico consumible por frontend.
  tipo: string;

  @Column({ type: 'varchar', length: 120 }) // RF25: título breve para UX.
  titulo: string;

  @Column({ type: 'text' }) // RF25: mensaje legible (incluye motivo/detalles, sin PII prohibida).
  mensaje: string;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'actor_nombre' }) // RF25: nombre del admin que ejecutó (criterio RF25).
  actorNombre: string | null;

  @Column({ type: 'jsonb', nullable: true }) // RF25: metadatos opcionales (placa, bahía, etc.) sin romper el esquema.
  metadata: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'leida_at' }) // UX: permite marcar como leída sin borrar historial.
  leidaAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) // RF25: fecha/hora de la alerta para orden cronológico.
  createdAt: Date;
}

