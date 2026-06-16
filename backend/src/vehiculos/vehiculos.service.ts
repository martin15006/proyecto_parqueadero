import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Vehiculo } from './entities/vehiculo.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { RegistroVehiculo } from './entities/registro-vehiculo.entity';
import { MovimientoVehiculo, EstadoMovimiento } from './entities/movimiento-vehiculo.entity';
import { Compartir, EstadoCompartido } from './entities/compartir.entity';
import { SolicitudVehiculo, EstadoSolicitud } from './entities/solicitud-vehiculo.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { AdminListVehiculosQueryDto } from './dto/admin-list-vehiculos.query.dto';
import { CompartirVehiculoDto } from './dto/compartir-vehiculo.dto';
import { ResolverSolicitudDto } from './dto/resolver-solicitud.dto';
import { CorregirSolicitudDto } from './dto/corregir-solicitud.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { EventosGateway } from '../gateway/eventos.gateway';

@Injectable()
export class VehiculosService {
  constructor(
    @InjectRepository(Vehiculo)
    private readonly vehiculoRepository: Repository<Vehiculo>,
    @InjectRepository(TipoVehiculo)
    private readonly tipoVehiculoRepository: Repository<TipoVehiculo>,
    @InjectRepository(RegistroVehiculo)
    private readonly registroRepository: Repository<RegistroVehiculo>,
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
    @InjectRepository(Compartir)
    private readonly compartirRepository: Repository<Compartir>,
    @InjectRepository(SolicitudVehiculo)
    private readonly solicitudRepository: Repository<SolicitudVehiculo>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly auditoriaService: AuditoriaService,
    private readonly notificacionesService: NotificacionesService,
    private readonly eventosGateway: EventosGateway,
  ) {}

  private normalizarPlaca(placa: string): string {
    return String(placa ?? '').replace(/[- ]/g, '').toUpperCase().trim();
  }

  async solicitarRegistroVehiculo(documento: string, dto: CreateVehiculoDto): Promise<{ mensaje: string; idSolicitud: number }> {
    const tipo = await this.tipoVehiculoRepository.findOne({ where: { idTipoV: dto.idTipoVehiculo } });
    if (!tipo) throw new BadRequestException('Tipo de vehículo no válido');

    const MAX_VEHICULOS_POR_USUARIO = 3;
    const [registrados, pendientes] = await Promise.all([
      this.registroRepository.count({ where: { idUsuario: documento } }),
      this.solicitudRepository.count({ where: { documento, estado: EstadoSolicitud.PENDIENTE } }),
    ]);
    if (registrados + pendientes >= MAX_VEHICULOS_POR_USUARIO) {
      throw new ConflictException(
        `Has alcanzado el máximo de ${MAX_VEHICULOS_POR_USUARIO} vehículos registrados. Elimina uno para poder registrar otro.`,
      );
    }

    const placaNormalizada = this.normalizarPlaca(dto.placa);

    const vehiculoExistente = await this.vehiculoRepository.findOne({
      where: { placa: placaNormalizada },
    });
    if (vehiculoExistente) {
      throw new ConflictException('Esta placa ya se encuentra registrada en el sistema');
    }

    const solicitudPendiente = await this.solicitudRepository.findOne({
      where: { documento, placa: placaNormalizada, estado: EstadoSolicitud.PENDIENTE },
    });
    if (solicitudPendiente) {
      throw new ConflictException('Ya tienes una solicitud pendiente para esta placa');
    }

    const solicitud = this.solicitudRepository.create({
      documento,
      placa: placaNormalizada,
      fotoVehiculo: dto.fotoVehiculo,
      fotoTarjetaP: dto.fotoTarjetaP,
      fotoPlaca: dto.fotoPlaca ?? null,
      color: dto.color,
      idTipoVehiculo: dto.idTipoVehiculo,
      estado: EstadoSolicitud.PENDIENTE,
    });

    const guardada = await this.solicitudRepository.save(solicitud);

    await this.auditoriaService.create({
      accion: 'SOLICITAR_REGISTRO_VEHICULO',
      entidad: 'SOLICITUD_VEHICULO',
      idEntidad: guardada.idSolicitud,
      idUsuario: documento,
      datosNuevos: { placa: placaNormalizada },
    });

    await this.notificacionesService.notificarAdmins({
      tipo: 'SOLICITUD_VEHICULO',
      titulo: 'Nueva solicitud de vehículo',
      mensaje: `El usuario ${documento} solicita registrar el vehículo con placa ${placaNormalizada}.`,
      metadata: { idSolicitud: guardada.idSolicitud, placa: placaNormalizada, documento },
    });

    this.eventosGateway.emitirSolicitudesActualizadas({ tipo: 'NUEVA', idSolicitud: guardada.idSolicitud });

    return {
      mensaje: 'Solicitud enviada correctamente. El administrador la revisará pronto.',
      idSolicitud: guardada.idSolicitud,
    };
  }

  async listarSolicitudes(estado?: EstadoSolicitud) {
    const where = estado ? { estado } : {};
    return this.solicitudRepository.find({
      where,
      relations: ['usuario', 'tipoVehiculo'],
      order: { creadoEn: 'DESC' },
    });
  }

  async resolverSolicitud(idSolicitud: number, dto: ResolverSolicitudDto, adminDocumento: string): Promise<{ mensaje: string }> {
    const solicitud = await this.solicitudRepository.findOne({
      where: { idSolicitud },
      relations: ['usuario'],
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException('Esta solicitud ya fue resuelta');
    }

    if (dto.estado === EstadoSolicitud.RECHAZADO) {
      const motivo = dto.motivoRechazo?.trim();
      const campos = Array.isArray(dto.camposRechazados)
        ? Array.from(new Set(dto.camposRechazados))
        : [];

      if (!motivo && campos.length === 0) {
        throw new BadRequestException(
          'Debes indicar el motivo del rechazo o marcar al menos un campo a corregir',
        );
      }

      solicitud.estado = EstadoSolicitud.RECHAZADO;
      solicitud.motivoRechazo = motivo ?? null;
      solicitud.camposRechazados = campos.length > 0 ? campos : null;
      solicitud.resueltoEn = new Date();
      await this.solicitudRepository.save(solicitud);

      const detalleMotivo = motivo ? ` Motivo: ${motivo}` : '';
      await this.notificacionesService.notificarUsuario({
        idUsuario: solicitud.documento,
        tipo: 'SOLICITUD_VEHICULO_RECHAZADA',
        titulo: 'Solicitud de vehículo rechazada',
        mensaje: `Tu solicitud para registrar el vehículo con placa ${solicitud.placa} fue rechazada.${detalleMotivo} Corrige los datos marcados y reenvíala.`,
        actorNombre: adminDocumento,
        metadata: { placa: solicitud.placa, motivo: motivo ?? null, camposRechazados: solicitud.camposRechazados },
      });

      this.eventosGateway.emitirSolicitudesActualizadas({ tipo: 'RESUELTA', idSolicitud: solicitud.idSolicitud });

      return { mensaje: 'Solicitud rechazada y usuario notificado.' };
    }

    let vehiculo = await this.vehiculoRepository.findOne({
      where: { placa: solicitud.placa },
      withDeleted: true,
    });

    if (vehiculo) {
      Object.assign(vehiculo, {
        fotoVehiculo: solicitud.fotoVehiculo,
        fotoTarjetaP: solicitud.fotoTarjetaP,
        fotoPlaca: solicitud.fotoPlaca,
        color: solicitud.color,
        idTipoVehiculo: solicitud.idTipoVehiculo,
        deletedAt: null,
      });
      vehiculo = await this.vehiculoRepository.save(vehiculo);
    } else {
      vehiculo = this.vehiculoRepository.create({
        placa: solicitud.placa,
        fotoVehiculo: solicitud.fotoVehiculo,
        fotoTarjetaP: solicitud.fotoTarjetaP,
        fotoPlaca: solicitud.fotoPlaca ?? undefined,
        color: solicitud.color,
        idTipoVehiculo: solicitud.idTipoVehiculo,
      });
      vehiculo = await this.vehiculoRepository.save(vehiculo);
    }

    const yaRegistrado = await this.registroRepository.findOne({
      where: { idUsuario: solicitud.documento, idVehiculo: solicitud.placa },
      withDeleted: true,
    });

    if (yaRegistrado) {
      yaRegistrado.deletedAt = null;
      await this.registroRepository.save(yaRegistrado);
    } else {
      await this.registroRepository.save(
        this.registroRepository.create({ idUsuario: solicitud.documento, idVehiculo: solicitud.placa }),
      );
    }

    solicitud.estado = EstadoSolicitud.APROBADO;
    solicitud.resueltoEn = new Date();
    await this.solicitudRepository.save(solicitud);

    await this.auditoriaService.create({
      accion: 'APROBAR_SOLICITUD_VEHICULO',
      entidad: 'SOLICITUD_VEHICULO',
      idEntidad: solicitud.idSolicitud,
      idUsuario: adminDocumento,
      datosNuevos: { placa: solicitud.placa, propietario: solicitud.documento },
    });

    await this.notificacionesService.notificarUsuario({
      idUsuario: solicitud.documento,
      tipo: 'SOLICITUD_VEHICULO_APROBADA',
      titulo: '¡Vehículo registrado!',
      mensaje: `Tu solicitud para el vehículo con placa ${solicitud.placa} fue aprobada. Ya puedes usarlo en el parqueadero.`,
      actorNombre: adminDocumento,
      metadata: { placa: solicitud.placa },
    });

    this.eventosGateway.emitirSolicitudesActualizadas({ tipo: 'RESUELTA', idSolicitud: solicitud.idSolicitud });

    return { mensaje: 'Solicitud aprobada. Vehículo registrado exitosamente.' };
  }

  async listarMisSolicitudes(documento: string) {
    return this.solicitudRepository.find({
      where: { documento },
      relations: ['tipoVehiculo'],
      order: { creadoEn: 'DESC' },
    });
  }

  async corregirSolicitud(
    documento: string,
    idSolicitud: number,
    dto: CorregirSolicitudDto,
  ): Promise<{ mensaje: string }> {
    const solicitud = await this.solicitudRepository.findOne({ where: { idSolicitud } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (solicitud.documento !== documento) {
      throw new ForbiddenException('No puedes corregir esta solicitud');
    }
    if (solicitud.estado !== EstadoSolicitud.RECHAZADO) {
      throw new BadRequestException('Solo puedes corregir solicitudes rechazadas');
    }

    const camposPermitidos = solicitud.camposRechazados ?? [];
    const puede = (campo: string) => camposPermitidos.includes(campo);

    if (dto.placa !== undefined && puede('placa')) {
      const placaNormalizada = this.normalizarPlaca(dto.placa);
      const vehiculoExistente = await this.vehiculoRepository.findOne({
        where: { placa: placaNormalizada },
      });
      if (vehiculoExistente) {
        throw new ConflictException('Esta placa ya se encuentra registrada en el sistema');
      }
      const otraPendiente = await this.solicitudRepository.findOne({
        where: { documento, placa: placaNormalizada, estado: EstadoSolicitud.PENDIENTE },
      });
      if (otraPendiente) {
        throw new ConflictException('Ya tienes una solicitud pendiente para esta placa');
      }
      solicitud.placa = placaNormalizada;
    }

    if (dto.color !== undefined && puede('color')) {
      solicitud.color = dto.color.trim();
    }

    if (dto.idTipoVehiculo !== undefined && puede('idTipoVehiculo')) {
      const tipo = await this.tipoVehiculoRepository.findOne({
        where: { idTipoV: dto.idTipoVehiculo },
      });
      if (!tipo) throw new BadRequestException('Tipo de vehículo no válido');
      solicitud.idTipoVehiculo = dto.idTipoVehiculo;
    }

    if (dto.fotoVehiculo !== undefined && puede('fotoVehiculo')) {
      solicitud.fotoVehiculo = dto.fotoVehiculo;
    }
    if (dto.fotoTarjetaP !== undefined && puede('fotoTarjetaP')) {
      solicitud.fotoTarjetaP = dto.fotoTarjetaP;
    }
    if (dto.fotoPlaca !== undefined && puede('fotoPlaca')) {
      solicitud.fotoPlaca = dto.fotoPlaca;
    }

    solicitud.estado = EstadoSolicitud.PENDIENTE;
    solicitud.motivoRechazo = null;
    solicitud.camposRechazados = null;
    solicitud.resueltoEn = null;
    await this.solicitudRepository.save(solicitud);

    await this.auditoriaService.create({
      accion: 'CORREGIR_SOLICITUD_VEHICULO',
      entidad: 'SOLICITUD_VEHICULO',
      idEntidad: solicitud.idSolicitud,
      idUsuario: documento,
      datosNuevos: { placa: solicitud.placa },
    });

    await this.notificacionesService.notificarAdmins({
      tipo: 'SOLICITUD_VEHICULO',
      titulo: 'Solicitud corregida',
      mensaje: `El usuario ${documento} corrigió y reenvió la solicitud del vehículo con placa ${solicitud.placa}.`,
      metadata: { idSolicitud: solicitud.idSolicitud, placa: solicitud.placa, documento },
    });

    return { mensaje: 'Solicitud corregida y reenviada para revisión.' };
  }

  async compartirVehiculo(documentoPropietario: string, placa: string, dto: CompartirVehiculoDto): Promise<{ mensaje: string }> {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documentoPropietario, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes este vehículo registrado en tu cuenta');

    if (dto.documentoReceptor === documentoPropietario) {
      throw new BadRequestException('No puedes compartir un vehículo contigo mismo');
    }

    const receptor = await this.compartirRepository.manager
      .getRepository(Vehiculo).manager
      .getRepository('usuario')
      .findOne({ where: { documento: dto.documentoReceptor } });
    if (!receptor) throw new NotFoundException('El usuario receptor no existe');

    const yaCompartido = await this.compartirRepository.findOne({
      where: {
        idRegistroV: registro.idRegistroV,
        estado: In([EstadoCompartido.PENDIENTE, EstadoCompartido.ACEPTADO]),
      },
    });
    if (yaCompartido) {
      const msg = yaCompartido.estado === EstadoCompartido.PENDIENTE
        ? 'Este vehículo tiene una invitación pendiente de respuesta'
        : 'Este vehículo ya fue compartido con otro usuario';
      throw new ConflictException(msg);
    }

    const aceptadosReceptor = await this.compartirRepository.count({
      where: { documento: dto.documentoReceptor, estado: EstadoCompartido.ACEPTADO },
    });
    if (aceptadosReceptor >= 2) {
      throw new BadRequestException('El usuario receptor ya tiene el máximo de 2 vehículos compartidos aceptados');
    }

    const nueva = await this.compartirRepository.save(
      this.compartirRepository.create({
        documento: dto.documentoReceptor,
        idRegistroV: registro.idRegistroV,
        estado: EstadoCompartido.PENDIENTE,
      }),
    );

    const propietario = await this.compartirRepository.manager
      .getRepository('usuario')
      .findOne({ where: { documento: documentoPropietario } }) as any;

    await this.notificacionesService.notificarUsuario({
      idUsuario: dto.documentoReceptor,
      tipo: 'COMPARTIDO_RECIBIDO',
      titulo: 'Te compartieron un vehículo',
      mensaje: `${propietario?.nombreCompleto ?? documentoPropietario} quiere compartir contigo el vehículo con placa ${placaNormalizada}. Acéptalo o recházalo desde la app.`,
      actorNombre: propietario?.nombreCompleto ?? documentoPropietario,
      metadata: { idCompartir: nueva.idCompartir, placa: placaNormalizada, propietario: documentoPropietario },
    });

    return { mensaje: `Invitación enviada a ${dto.documentoReceptor}. Quedará activa cuando el usuario la acepte.` };
  }

  async quitarCompartido(documentoPropietario: string, placa: string): Promise<{ mensaje: string }> {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documentoPropietario, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes este vehículo registrado en tu cuenta');

    const compartido = await this.compartirRepository.findOne({
      where: {
        idRegistroV: registro.idRegistroV,
        estado: In([EstadoCompartido.PENDIENTE, EstadoCompartido.ACEPTADO]),
      },
      relations: ['usuarioReceptor'],
    });
    if (!compartido) throw new NotFoundException('Este vehículo no tiene ningún compartido activo');

    const erasAceptado = compartido.estado === EstadoCompartido.ACEPTADO;
    const receptorDoc = compartido.documento;
    const propietario = await this.compartirRepository.manager
      .getRepository('usuario')
      .findOne({ where: { documento: documentoPropietario } }) as any;

    await this.compartirRepository.remove(compartido);

    if (erasAceptado) {
      await this.notificacionesService.notificarUsuario({
        idUsuario: receptorDoc,
        tipo: 'COMPARTIDO_REVOCADO',
        titulo: 'Acceso a vehículo revocado',
        mensaje: `${propietario?.nombreCompleto ?? documentoPropietario} ya no comparte contigo el vehículo con placa ${placaNormalizada}.`,
        actorNombre: propietario?.nombreCompleto ?? documentoPropietario,
        metadata: { placa: placaNormalizada },
      });
    }

    return { mensaje: 'Vehículo dejó de estar compartido' };
  }

  async aceptarCompartido(documentoReceptor: string, idCompartir: number): Promise<{ mensaje: string }> {
    const compartido = await this.compartirRepository.findOne({
      where: { idCompartir },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo', 'registroVehiculo.usuario'],
    });
    if (!compartido) throw new NotFoundException('Invitación no encontrada');
    if (compartido.documento !== documentoReceptor) {
      throw new ForbiddenException('Esta invitación no es para ti');
    }
    if (compartido.estado !== EstadoCompartido.PENDIENTE) {
      throw new BadRequestException('Esta invitación ya fue respondida');
    }

    const aceptados = await this.compartirRepository.count({
      where: { documento: documentoReceptor, estado: EstadoCompartido.ACEPTADO },
    });
    if (aceptados >= 2) {
      throw new BadRequestException('Ya tienes el máximo de 2 vehículos compartidos. Rechaza alguno antes de aceptar este.');
    }

    compartido.estado = EstadoCompartido.ACEPTADO;
    compartido.respondidoEn = new Date();
    await this.compartirRepository.save(compartido);

    const placa = compartido.registroVehiculo.vehiculo.placa;
    const propietarioDoc = compartido.registroVehiculo.usuario.documento;
    const receptor = await this.compartirRepository.manager
      .getRepository('usuario')
      .findOne({ where: { documento: documentoReceptor } }) as any;

    await this.notificacionesService.notificarUsuario({
      idUsuario: propietarioDoc,
      tipo: 'COMPARTIDO_ACEPTADO',
      titulo: 'Compartido aceptado',
      mensaje: `${receptor?.nombreCompleto ?? documentoReceptor} aceptó el vehículo compartido con placa ${placa}.`,
      actorNombre: receptor?.nombreCompleto ?? documentoReceptor,
      metadata: { placa, receptor: documentoReceptor },
    });

    return { mensaje: `Vehículo ${placa} aceptado correctamente` };
  }

  async rechazarCompartido(documentoReceptor: string, idCompartir: number): Promise<{ mensaje: string }> {
    const compartido = await this.compartirRepository.findOne({
      where: { idCompartir },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo', 'registroVehiculo.usuario'],
    });
    if (!compartido) throw new NotFoundException('Invitación no encontrada');
    if (compartido.documento !== documentoReceptor) {
      throw new ForbiddenException('Esta invitación no es para ti');
    }
    if (compartido.estado !== EstadoCompartido.PENDIENTE) {
      throw new BadRequestException('Esta invitación ya fue respondida');
    }

    const placa = compartido.registroVehiculo.vehiculo.placa;
    const propietarioDoc = compartido.registroVehiculo.usuario.documento;
    const receptor = await this.compartirRepository.manager
      .getRepository('usuario')
      .findOne({ where: { documento: documentoReceptor } }) as any;

    await this.compartirRepository.remove(compartido);

    await this.notificacionesService.notificarUsuario({
      idUsuario: propietarioDoc,
      tipo: 'COMPARTIDO_RECHAZADO',
      titulo: 'Compartido rechazado',
      mensaje: `${receptor?.nombreCompleto ?? documentoReceptor} rechazó el vehículo compartido con placa ${placa}.`,
      actorNombre: receptor?.nombreCompleto ?? documentoReceptor,
      metadata: { placa, receptor: documentoReceptor },
    });

    return { mensaje: 'Invitación rechazada' };
  }

  async eliminarCompartidoComoReceptor(documentoReceptor: string, idCompartir: number): Promise<{ mensaje: string }> {
    const compartido = await this.compartirRepository.findOne({
      where: { idCompartir },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo', 'registroVehiculo.usuario'],
    });
    if (!compartido) throw new NotFoundException('Compartido no encontrado');
    if (compartido.documento !== documentoReceptor) {
      throw new ForbiddenException('Este compartido no es tuyo');
    }
    if (compartido.estado !== EstadoCompartido.ACEPTADO) {
      throw new BadRequestException('Solo se puede eliminar un compartido que ya fue aceptado.');
    }

    const movimientoActivo = await this.movimientoRepository.findOne({
      where: {
        idRegistroVehiculo: compartido.idRegistroV,
        documentoIngreso: documentoReceptor,
        estado: In([EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO]),
      },
    });
    if (movimientoActivo) {
      throw new BadRequestException(
        'No puedes eliminar este vehículo compartido mientras tengas un ingreso activo. Registra la salida primero.',
      );
    }

    const placa = compartido.registroVehiculo.vehiculo.placa;
    const propietarioDoc = compartido.registroVehiculo.usuario.documento;
    const receptor = await this.compartirRepository.manager
      .getRepository('usuario')
      .findOne({ where: { documento: documentoReceptor } }) as any;

    await this.compartirRepository.remove(compartido);

    await this.notificacionesService.notificarUsuario({
      idUsuario: propietarioDoc,
      tipo: 'COMPARTIDO_RENUNCIADO',
      titulo: 'Vehículo compartido eliminado',
      mensaje: `${receptor?.nombreCompleto ?? documentoReceptor} eliminó el vehículo compartido con placa ${placa} de su cuenta.`,
      actorNombre: receptor?.nombreCompleto ?? documentoReceptor,
      metadata: { placa, receptor: documentoReceptor },
    });

    return { mensaje: `Eliminaste el acceso al vehículo ${placa}` };
  }

  async listarVehiculosCompartidosConmigo(documento: string) {
    const compartidos = await this.compartirRepository.find({
      where: { documento, estado: EstadoCompartido.ACEPTADO },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo', 'registroVehiculo.vehiculo.tipoVehiculo', 'registroVehiculo.usuario'],
    });

    return compartidos
      // Si el vehículo (o su registro) fue eliminado, el compartido ya no es
      // válido: se omite para no romper el listado del receptor.
      .filter((c) => c.registroVehiculo?.vehiculo)
      .map((c) => ({
        idCompartir: c.idCompartir,
        placa: c.registroVehiculo.vehiculo.placa,
        fotoVehiculo: c.registroVehiculo.vehiculo.fotoVehiculo,
        fotoTarjetaP: c.registroVehiculo.vehiculo.fotoTarjetaP,
        color: c.registroVehiculo.vehiculo.color,
        tipoVehiculo: c.registroVehiculo.vehiculo.tipoVehiculo.tipoVehiculo,
        propietario: c.registroVehiculo.usuario.nombreCompleto,
        compartidoDesde: c.createdAt,
      }));
  }

  async listarInvitacionesPendientes(documento: string) {
    const pendientes = await this.compartirRepository.find({
      where: { documento, estado: EstadoCompartido.PENDIENTE },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo', 'registroVehiculo.vehiculo.tipoVehiculo', 'registroVehiculo.usuario'],
      order: { createdAt: 'DESC' },
    });

    return pendientes
      .filter((c) => c.registroVehiculo?.vehiculo)
      .map((c) => ({
        idCompartir: c.idCompartir,
        placa: c.registroVehiculo.vehiculo.placa,
        fotoVehiculo: c.registroVehiculo.vehiculo.fotoVehiculo,
        color: c.registroVehiculo.vehiculo.color,
        tipoVehiculo: c.registroVehiculo.vehiculo.tipoVehiculo.tipoVehiculo,
        propietario: c.registroVehiculo.usuario.nombreCompleto,
        documentoPropietario: c.registroVehiculo.usuario.documento,
        recibidaEn: c.createdAt,
      }));
  }

  async infoCompartidoMio(documentoPropietario: string, placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);
    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documentoPropietario, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes este vehículo registrado en tu cuenta');

    const compartido = await this.compartirRepository.findOne({
      where: {
        idRegistroV: registro.idRegistroV,
        estado: In([EstadoCompartido.PENDIENTE, EstadoCompartido.ACEPTADO]),
      },
      relations: ['usuarioReceptor'],
    });

    if (!compartido) return { compartido: false };

    return {
      compartido: true,
      estado: compartido.estado,
      receptor: {
        documento: compartido.usuarioReceptor.documento,
        nombre: compartido.usuarioReceptor.nombreCompleto,
        compartidoDesde: compartido.createdAt,
      },
    };
  }

  async listarMisVehiculos(documento: string) {
    const registros = await this.registroRepository.find({
      where: { idUsuario: documento },
      relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
    });

    return registros.map(reg => ({
      placa: reg.vehiculo.placa,
      fotoVehiculo: reg.vehiculo.fotoVehiculo,
      fotoTarjetaP: reg.vehiculo.fotoTarjetaP,
      fotoPlaca: reg.vehiculo.fotoPlaca,
      color: reg.vehiculo.color,
      tipoVehiculo: reg.vehiculo.tipoVehiculo.tipoVehiculo,
      idTipoVehiculo: reg.vehiculo.tipoVehiculo.idTipoV,
      idRegistroV: reg.idRegistroV,
    }));
  }

  async findAll(page: number = 1, limit: number = 10) {
    const [data, total] = await this.vehiculoRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['tipoVehiculo'],
      order: { placa: 'ASC' },
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async detalleVehiculoAdmin(placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);
    const vehiculo = await this.vehiculoRepository.findOne({
      where: { placa: placaNormalizada },
      relations: ['tipoVehiculo'],
    });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    const registros = await this.registroRepository.find({
      where: { idVehiculo: placaNormalizada },
      relations: ['usuario'],
    });

    const propietario = registros[0]?.usuario;

    return {
      placa: vehiculo.placa,
      fotoVehiculo: vehiculo.fotoVehiculo,
      fotoTarjetaP: vehiculo.fotoTarjetaP,
      fotoPlaca: vehiculo.fotoPlaca,
      color: vehiculo.color,
      idTipoVehiculo: vehiculo.idTipoVehiculo,
      tipoVehiculo: vehiculo.tipoVehiculo,
      ultimaEdicionAt: vehiculo.ultimaEdicionAt,
      createdAt: vehiculo.createdAt,
      propietario: propietario
        ? {
            documento: propietario.documento,
            nombreCompleto: propietario.nombreCompleto,
            correo: propietario.correo,
            numTelf: propietario.numTelf,
            fotoPersona: propietario.fotoPersona,
            idFormacion: propietario.idFormacion,
          }
        : null,
      registros: registros.map((r) => ({
        idRegistroV: r.idRegistroV,
        documento: r.idUsuario,
        nombreUsuario: r.usuario?.nombreCompleto,
      })),
    };
  }

  async crearVehiculoPorAdmin(dto: {
    documentoPropietario: string;
    placa: string;
    fotoVehiculo: string;
    fotoTarjetaP: string;
    fotoPlaca?: string;
    color: string;
    idTipoVehiculo: number;
  }): Promise<{ mensaje: string; placa: string }> {
    const placaNormalizada = this.normalizarPlaca(dto.placa);

    const tipo = await this.tipoVehiculoRepository.findOne({ where: { idTipoV: dto.idTipoVehiculo } });
    if (!tipo) throw new BadRequestException('Tipo de vehículo no válido');

    const usuario = await this.compartirRepository.manager
      .getRepository('usuario')
      .findOne({ where: { documento: dto.documentoPropietario } });
    if (!usuario) throw new NotFoundException('El usuario propietario no existe');

    let vehiculo = await this.vehiculoRepository.findOne({
      where: { placa: placaNormalizada },
      withDeleted: true,
    });
    if (vehiculo && !vehiculo.deletedAt) {
      throw new ConflictException('Esta placa ya está registrada en el sistema');
    }
    if (vehiculo && vehiculo.deletedAt) {
      Object.assign(vehiculo, {
        fotoVehiculo: dto.fotoVehiculo,
        fotoTarjetaP: dto.fotoTarjetaP,
        fotoPlaca: dto.fotoPlaca ?? null,
        color: dto.color,
        idTipoVehiculo: dto.idTipoVehiculo,
        deletedAt: null,
      });
      vehiculo = await this.vehiculoRepository.save(vehiculo);
    } else {
      vehiculo = this.vehiculoRepository.create({
        placa: placaNormalizada,
        fotoVehiculo: dto.fotoVehiculo,
        fotoTarjetaP: dto.fotoTarjetaP,
        fotoPlaca: dto.fotoPlaca,
        color: dto.color,
        idTipoVehiculo: dto.idTipoVehiculo,
      });
      vehiculo = await this.vehiculoRepository.save(vehiculo);
    }

    const yaRegistrado = await this.registroRepository.findOne({
      where: { idUsuario: dto.documentoPropietario, idVehiculo: placaNormalizada },
      withDeleted: true,
    });
    if (yaRegistrado) {
      yaRegistrado.deletedAt = null;
      await this.registroRepository.save(yaRegistrado);
    } else {
      await this.registroRepository.save(
        this.registroRepository.create({ idUsuario: dto.documentoPropietario, idVehiculo: placaNormalizada }),
      );
    }

    await this.notificacionesService.notificarUsuario({
      idUsuario: dto.documentoPropietario,
      tipo: 'VEHICULO_REGISTRADO_POR_ADMIN',
      titulo: 'Vehículo agregado a tu cuenta',
      mensaje: `El administrador registró el vehículo con placa ${placaNormalizada} en tu cuenta.`,
      metadata: { placa: placaNormalizada },
    });

    return { mensaje: 'Vehículo creado y asignado correctamente', placa: placaNormalizada };
  }

  async actualizarVehiculoPorAdmin(
    placa: string,
    dto: {
      fotoVehiculo?: string;
      fotoTarjetaP?: string;
      fotoPlaca?: string;
      color?: string;
      idTipoVehiculo?: number;
    },
  ): Promise<{ mensaje: string }> {
    const placaNormalizada = this.normalizarPlaca(placa);
    const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    if (dto.fotoVehiculo !== undefined) vehiculo.fotoVehiculo = dto.fotoVehiculo;
    if (dto.fotoTarjetaP !== undefined) vehiculo.fotoTarjetaP = dto.fotoTarjetaP;
    if (dto.fotoPlaca !== undefined) vehiculo.fotoPlaca = dto.fotoPlaca;
    if (dto.color !== undefined) vehiculo.color = dto.color;
    if (dto.idTipoVehiculo !== undefined) vehiculo.idTipoVehiculo = dto.idTipoVehiculo;

    await this.vehiculoRepository.save(vehiculo);

    const registros = await this.registroRepository.find({ where: { idVehiculo: placaNormalizada } });
    for (const r of registros) {
      await this.notificacionesService.notificarUsuario({
        idUsuario: r.idUsuario,
        tipo: 'VEHICULO_EDITADO_POR_ADMIN',
        titulo: 'Vehículo modificado',
        mensaje: `El administrador modificó los datos de tu vehículo con placa ${placaNormalizada}.`,
        metadata: { placa: placaNormalizada },
      });
    }

    return { mensaje: 'Vehículo actualizado exitosamente' };
  }

  async eliminarVehiculoPorAdmin(placa: string): Promise<{ mensaje: string }> {
    const placaNormalizada = this.normalizarPlaca(placa);
    const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    const registros = await this.registroRepository.find({ where: { idVehiculo: placaNormalizada } });

    for (const r of registros) {
      await this.notificacionesService.notificarUsuario({
        idUsuario: r.idUsuario,
        tipo: 'VEHICULO_ELIMINADO_POR_ADMIN',
        titulo: 'Vehículo eliminado',
        mensaje: `El administrador eliminó el vehículo con placa ${placaNormalizada} de tu cuenta.`,
        metadata: { placa: placaNormalizada },
      });

      const compartidos = await this.compartirRepository.find({
        where: {
          idRegistroV: r.idRegistroV,
          estado: In([EstadoCompartido.PENDIENTE, EstadoCompartido.ACEPTADO]),
        },
      });
      for (const c of compartidos) {
        if (c.estado === EstadoCompartido.ACEPTADO) {
          await this.notificacionesService.notificarUsuario({
            idUsuario: c.documento,
            tipo: 'COMPARTIDO_VEHICULO_ELIMINADO',
            titulo: 'Vehículo ya no disponible',
            mensaje: `El vehículo con placa ${placaNormalizada} fue eliminado del sistema. Por eso fue removido de tus vehículos compartidos.`,
            metadata: { placa: placaNormalizada },
          });
        }
      }
      // Se eliminan los registros de compartido para que no queden "huérfanos"
      // apuntando a un registro de vehículo ya eliminado (causaba un crash al
      // listar los compartidos del receptor).
      if (compartidos.length > 0) {
        await this.compartirRepository.remove(compartidos);
      }
    }

    for (const r of registros) {
      await this.registroRepository.softRemove(r);
    }
    await this.vehiculoRepository.softRemove(vehiculo);

    return { mensaje: 'Vehículo eliminado del sistema' };
  }

  async listarVehiculosAdmin(query: AdminListVehiculosQueryDto) {
    const placa = query.placa ? this.normalizarPlaca(query.placa) : null;
    const marca = query.marca?.trim();
    const q = query.q?.trim();

    const qb = this.vehiculoRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.tipoVehiculo', 'tv')
      .orderBy('v.placa', 'ASC');

    if (placa) {
      qb.andWhere('v.placa ILIKE :placa', { placa: `%${placa}%` });
    }

    if (marca) {
      qb.andWhere('tv.tipo_vehiculo ILIKE :marca', { marca: `%${marca}%` });
    }

    if (q) {
      qb.andWhere('(v.placa ILIKE :q OR tv.tipo_vehiculo ILIKE :q)', { q: `%${q}%` });
    }

    const subQuery = qb.subQuery()
      .select('1')
      .from(MovimientoVehiculo, 'mv')
      .innerJoin(RegistroVehiculo, 'rv', 'rv.id_registro_v = mv.id_registro_vehiculo')
      .where('rv.id_vehiculo = v.placa')
      .andWhere('mv.estado = :estadoAdentro', { estadoAdentro: EstadoMovimiento.ADENTRO })
      .andWhere('mv.deleted_at IS NULL')
      .getQuery();

    qb.addSelect(`EXISTS (${subQuery})`, 'is_adentro');

    const { entities, raw } = await qb.getRawAndEntities();

    return entities.map((vehiculo, idx) => {
      const isAdentroRaw = raw[idx]?.is_adentro;
      const isAdentro = isAdentroRaw === true || isAdentroRaw === 't' || isAdentroRaw === 1 || isAdentroRaw === '1';
      return {
        ...vehiculo,
        isAdentro,
      };
    });
  }

  async findByUsuario(documento: string): Promise<Vehiculo[]> {
    const propios = await this.registroRepository.find({
      where: { idUsuario: documento },
      relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
    });

    const compartidos = await this.compartirRepository.find({
      where: { documento, estado: EstadoCompartido.ACEPTADO },
      relations: [
        'registroVehiculo',
        'registroVehiculo.vehiculo',
        'registroVehiculo.vehiculo.tipoVehiculo',
      ],
    });

    const vehiculosCompartidos = compartidos
      .map((c) => c.registroVehiculo?.vehiculo)
      .filter((v): v is Vehiculo => !!v);

    const todos = [...propios.map((r) => r.vehiculo), ...vehiculosCompartidos];
    const seen = new Set<string>();
    const unicos: Vehiculo[] = [];
    for (const v of todos) {
      if (v && !seen.has(v.placa)) {
        seen.add(v.placa);
        unicos.push(v);
      }
    }
    return unicos;
  }

  async listarHistorialUsuario(documento: string) {
    const movimientos = await this.movimientoRepository
      .createQueryBuilder('mv')
      .innerJoin(RegistroVehiculo, 'rv', 'rv.id_registro_v = mv.id_registro_vehiculo')
      .innerJoin(Vehiculo, 'v', 'v.placa = rv.id_vehiculo')
      .where('rv.id_usuario = :documento', { documento })
      .orderBy('mv.hora_ingreso', 'DESC')
      .limit(50)
      .select([
        'mv.id_movimiento AS "idMovimiento"',
        'v.placa AS "placa"',
        'mv.hora_ingreso AS "horaIngreso"',
        'mv.hora_salida AS "horaSalida"',
        'mv.estado AS "estado"',
      ])
      .getRawMany();

    return movimientos;
  }

  async obtenerDetalle(documento: string, placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
      relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
    });

    if (!registro) throw new NotFoundException('Vehículo no encontrado en tus registros');

    return {
      placa: registro.vehiculo.placa,
      fotoVehiculo: registro.vehiculo.fotoVehiculo,
      fotoTarjetaP: registro.vehiculo.fotoTarjetaP,
      fotoPlaca: registro.vehiculo.fotoPlaca,
      color: registro.vehiculo.color,
      tipoVehiculo: registro.vehiculo.tipoVehiculo.tipoVehiculo,
      idTipoVehiculo: registro.vehiculo.tipoVehiculo.idTipoV,
      idRegistroV: registro.idRegistroV,
    };
  }

  async actualizarVehiculo(
    documento: string,
    placa: string,
    dto: ActualizarVehiculoDto,
  ): Promise<{ mensaje: string; proximaEdicionDisponible: Date }> {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes permisos para modificar este vehículo');

    const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    if (!dto.fotoVehiculo && !dto.color) {
      throw new BadRequestException('Debes enviar al menos un campo (foto o color) para actualizar');
    }

    const DIAS_COOLDOWN = 15;
    const MS_15_DIAS = DIAS_COOLDOWN * 24 * 60 * 60 * 1000;
    const ahora = Date.now();

    if (vehiculo.ultimaEdicionAt) {
      const ultima = new Date(vehiculo.ultimaEdicionAt).getTime();
      const transcurridoMs = ahora - ultima;

      if (transcurridoMs < MS_15_DIAS) {
        const restanteMs = MS_15_DIAS - transcurridoMs;
        const diasRestantes = Math.ceil(restanteMs / (24 * 60 * 60 * 1000));
        const proxima = new Date(ultima + MS_15_DIAS);
        throw new BadRequestException(
          `Solo puedes editar este vehículo cada ${DIAS_COOLDOWN} días. Te faltan ${diasRestantes} día(s). Próxima edición: ${proxima.toLocaleDateString('es-CO')}`,
        );
      }
    }

    const fotoVehiculoVieja = vehiculo.fotoVehiculo;

    if (dto.fotoVehiculo) vehiculo.fotoVehiculo = dto.fotoVehiculo;
    if (dto.color) vehiculo.color = dto.color;
    vehiculo.ultimaEdicionAt = new Date(ahora);

    await this.vehiculoRepository.save(vehiculo);

    if (dto.fotoVehiculo && fotoVehiculoVieja && fotoVehiculoVieja !== dto.fotoVehiculo) {
      await this.cloudinaryService.borrarVariasPorUrl([fotoVehiculoVieja]);
    }

    return {
      mensaje: 'Datos del vehículo actualizados exitosamente',
      proximaEdicionDisponible: new Date(ahora + MS_15_DIAS),
    };
  }

  async puedeEditarVehiculo(documento: string, placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);
    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes permisos para consultar este vehículo');

    const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    const MS_15_DIAS = 15 * 24 * 60 * 60 * 1000;

    if (!vehiculo.ultimaEdicionAt) {
      return { puedeEditar: true, ultimaEdicionAt: null, proximaEdicionDisponible: null, diasRestantes: 0 };
    }

    const ultima = new Date(vehiculo.ultimaEdicionAt).getTime();
    const ahora = Date.now();
    const transcurrido = ahora - ultima;

    if (transcurrido >= MS_15_DIAS) {
      return {
        puedeEditar: true,
        ultimaEdicionAt: vehiculo.ultimaEdicionAt,
        proximaEdicionDisponible: null,
        diasRestantes: 0,
      };
    }

    const restanteMs = MS_15_DIAS - transcurrido;
    const diasRestantes = Math.ceil(restanteMs / (24 * 60 * 60 * 1000));
    return {
      puedeEditar: false,
      ultimaEdicionAt: vehiculo.ultimaEdicionAt,
      proximaEdicionDisponible: new Date(ultima + MS_15_DIAS),
      diasRestantes,
    };
  }

  async listarTipos(): Promise<TipoVehiculo[]> {
    return await this.tipoVehiculoRepository.find({ order: { tipoVehiculo: 'ASC' } });
  }

  async eliminarRegistro(documento: string, placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new NotFoundException('El vínculo no existe o ya fue eliminado');

    const estaAdentro = await this.movimientoRepository.findOne({
      where: {
        idRegistroVehiculo: registro.idRegistroV,
        estado: In([EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO]),
      },
    });

    if (estaAdentro) {
      throw new BadRequestException('No puedes eliminar un vehículo que se encuentra dentro del parqueadero');
    }

    const compartidosActivos = await this.compartirRepository.find({
      where: {
        idRegistroV: registro.idRegistroV,
        estado: In([EstadoCompartido.PENDIENTE, EstadoCompartido.ACEPTADO]),
      },
    });

    if (compartidosActivos.length > 0) {
      const propietario = await this.compartirRepository.manager
        .getRepository('usuario')
        .findOne({ where: { documento } }) as any;

      for (const c of compartidosActivos) {
        if (c.estado === EstadoCompartido.ACEPTADO) {
          await this.notificacionesService.notificarUsuario({
            idUsuario: c.documento,
            tipo: 'COMPARTIDO_VEHICULO_ELIMINADO',
            titulo: 'Vehículo ya no disponible',
            mensaje: `El vehículo con placa ${placaNormalizada} ya no se encuentra registrado por ${propietario?.nombreCompleto ?? documento}. Por eso fue removido de tus vehículos compartidos.`,
            actorNombre: propietario?.nombreCompleto ?? documento,
            metadata: { placa: placaNormalizada },
          });
        }
      }

      await this.compartirRepository.remove(compartidosActivos);
    }

    await this.registroRepository.softRemove(registro);

    const otrosRegistros = await this.registroRepository.count({ where: { idVehiculo: placaNormalizada } });

    if (otrosRegistros === 0) {
      const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
      if (vehiculo) {
        await this.vehiculoRepository.softRemove(vehiculo);
      }
    }

    return { ok: true, mensaje: 'Vínculo eliminado exitosamente' };
  }
}
