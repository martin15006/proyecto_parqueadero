import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionUsuario } from './entities/notificacion-usuario.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

/**
 * RF25: Servicio centralizado para registrar y consultar el historial de notificaciones por usuario.
 *
 * RNF2: Este servicio NO registra en logs tokens/OTP/QR ni datos sensibles; persiste únicamente lo necesario
 * para la bandeja del usuario.
 */
@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(NotificacionUsuario)
    private readonly notificacionRepository: Repository<NotificacionUsuario>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  /**
   * RF25: Retorna la bandeja de notificaciones del usuario (orden descendente por fecha).
   * @param idUsuario Documento del usuario autenticado.
   */
  async obtenerMisNotificaciones(idUsuario: string) {
    return await this.notificacionRepository.find({
      where: { idUsuario },
      order: { createdAt: 'DESC' },
      take: 50, // UX: límite razonable para evitar cargas grandes en móvil/web.
    });
  }

  /**
   * RF25 (Salida de emergencia): Registra una notificación dirigida al usuario dueño del vehículo afectado.
   */
  async registrarSalidaEmergencia(params: {
    idUsuario: string;
    placa: string;
    motivo: string;
    actorNombre: string | null;
  }) {
    const notificacion = this.notificacionRepository.create({
      idUsuario: params.idUsuario, // RF25: destinatario.
      tipo: 'SALIDA_EMERGENCIA', // RF25: tipo semántico para UI.
      titulo: 'Salida de emergencia', // RF25: título breve.
      mensaje: `Se registró una salida de emergencia para tu vehículo (${params.placa}). Motivo: ${params.motivo}`, // RF25: mensaje claro.
      actorNombre: params.actorNombre, // RF25: incluye nombre del administrador que autorizó.
      metadata: { placa: params.placa, motivo: params.motivo }, // RF25: metadatos útiles sin PII prohibida.
      leidaAt: null, // UX: inicia como no leída.
    });

    await this.notificacionRepository.save(notificacion); // RF25: persistencia para consulta posterior en bandeja.
  }

  /**
   * RF14 → RF25: Registra una notificación broadcast para aprendices cuando el parqueadero se deshabilita.
   * - Se persiste por usuario para que sea visible en la bandeja de cada aprendiz.
   */
  async registrarParqueaderoDeshabilitadoBroadcast(params: {
    motivo: string;
    duracionEstimada: string | null;
    actorNombre: string | null;
  }) {
    const aprendices = await this.usuarioRepository.find({
      where: { idTipoUsr: TipoUsuarioEnum.APRENDIZ },
      select: ['documento'], // RNF2: solo necesitamos el identificador para insertar; evitamos traer PII adicional.
    });

    if (aprendices.length === 0) return; // RF25: si no hay aprendices, no hay a quién notificar.

    const mensajeDuracion = params.duracionEstimada
      ? ` Duración estimada: ${params.duracionEstimada}.`
      : '';

    const rows = aprendices.map((u) =>
      this.notificacionRepository.create({
        idUsuario: u.documento, // RF25: bandeja del aprendiz.
        tipo: 'PARQUEADERO_DESHABILITADO', // RF25: tipo semántico.
        titulo: 'Parqueadero deshabilitado', // RF14/RF25: título breve.
        mensaje: `El parqueadero fue deshabilitado. Motivo: ${params.motivo}.${mensajeDuracion}`, // RF14/RF25: mensaje institucional.
        actorNombre: params.actorNombre, // RF25: nombre del administrador que ejecutó.
        metadata: { motivo: params.motivo, duracionEstimada: params.duracionEstimada }, // RF25: metadatos opcionales.
        leidaAt: null, // UX: no leída inicialmente.
      }),
    );

    await this.notificacionRepository.save(rows); // RF25: inserción masiva para bandejas individuales.
  }
}

