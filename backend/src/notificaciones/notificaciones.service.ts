import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificacionUsuario } from './entities/notificacion-usuario.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

/**
 * Este servicio NO registra en logs tokens/OTP/QR ni datos sensibles; persiste únicamente lo necesario
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

  async obtenerMisNotificaciones(idUsuario: string) {
    return await this.notificacionRepository.find({
      where: { idUsuario },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async eliminarNotificacion(idUsuario: string, id: number) {
    const notificacion = await this.notificacionRepository.findOne({ where: { id } });
    if (!notificacion) throw new NotFoundException('Notificación no encontrada');
    if (notificacion.idUsuario !== idUsuario) {
      throw new ForbiddenException('No puedes eliminar una notificación que no es tuya');
    }
    await this.notificacionRepository.remove(notificacion);
    return { mensaje: 'Notificación eliminada' };
  }

  async eliminarTodas(idUsuario: string) {
    const result = await this.notificacionRepository.delete({ idUsuario });
    return { mensaje: 'Notificaciones eliminadas', total: result.affected ?? 0 };
  }

  async notificarUsuario(params: {
    idUsuario: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    actorNombre?: string;
    metadata?: Record<string, unknown>;
  }) {
    const notificacion = this.notificacionRepository.create({
      idUsuario: params.idUsuario,
      tipo: params.tipo,
      titulo: params.titulo,
      mensaje: params.mensaje,
      actorNombre: params.actorNombre ?? null,
      metadata: params.metadata ?? null,
      leidaAt: null,
    });
    await this.notificacionRepository.save(notificacion);
  }

  async notificarAdmins(params: {
    tipo: string;
    titulo: string;
    mensaje: string;
    metadata?: Record<string, unknown>;
  }) {
    const admins = await this.usuarioRepository.find({
      where: { idTipoUsr: TipoUsuarioEnum.ADMIN },
      select: ['documento'],
    });
    if (admins.length === 0) return;

    const rows = admins.map((u) =>
      this.notificacionRepository.create({
        idUsuario: u.documento,
        tipo: params.tipo,
        titulo: params.titulo,
        mensaje: params.mensaje,
        actorNombre: null,
        metadata: params.metadata ?? null,
        leidaAt: null,
      }),
    );
    await this.notificacionRepository.save(rows);
  }

  async registrarSalidaEmergencia(params: {
    idUsuario: string;
    placa: string;
    motivo: string;
    actorNombre: string | null;
  }) {
    const notificacion = this.notificacionRepository.create({
      idUsuario: params.idUsuario,
      tipo: 'SALIDA_EMERGENCIA',
      titulo: 'Salida de emergencia',
      mensaje: `Se registró una salida de emergencia para tu vehículo (${params.placa}). Motivo: ${params.motivo}`,
      actorNombre: params.actorNombre,
      metadata: { placa: params.placa, motivo: params.motivo },
      leidaAt: null,
    });

    await this.notificacionRepository.save(notificacion);
  }

  /**
   * Se persiste por usuario para que sea visible en la bandeja de cada aprendiz.
   */
  async registrarParqueaderoDeshabilitadoBroadcast(params: {
    motivo: string;
    duracionEstimada: string | null;
    actorNombre: string | null;
  }) {
    const aprendices = await this.usuarioRepository.find({
      where: { idTipoUsr: TipoUsuarioEnum.APRENDIZ },
      select: ['documento'],
    });

    if (aprendices.length === 0) return;

    const mensajeDuracion = params.duracionEstimada
      ? ` Duración estimada: ${params.duracionEstimada}.`
      : '';

    const rows = aprendices.map((u) =>
      this.notificacionRepository.create({
        idUsuario: u.documento,
        tipo: 'PARQUEADERO_DESHABILITADO',
        titulo: 'Parqueadero deshabilitado',
        mensaje: `El parqueadero fue deshabilitado. Motivo: ${params.motivo}.${mensajeDuracion}`,
        actorNombre: params.actorNombre,
        metadata: { motivo: params.motivo, duracionEstimada: params.duracionEstimada },
        leidaAt: null,
      }),
    );

    await this.notificacionRepository.save(rows);
  }
}
