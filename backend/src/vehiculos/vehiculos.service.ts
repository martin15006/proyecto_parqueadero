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
import { Compartir } from './entities/compartir.entity';
import { SolicitudVehiculo, EstadoSolicitud } from './entities/solicitud-vehiculo.entity';
import { Bahia } from '../bahias/entities/bahia.entity';
import { CreateVehiculoDto } from './dto/create-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { AdminListVehiculosQueryDto } from './dto/admin-list-vehiculos.query.dto';
import { CompartirVehiculoDto } from './dto/compartir-vehiculo.dto';
import { ResolverSolicitudDto } from './dto/resolver-solicitud.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

/**
 * Servicio de Gestión de Vehículos.
 * Controla el registro, actualización y vinculación de vehículos con usuarios.
 * REFACTOR: Implementa limpieza de recursos multimedia y auditoría integrada.
 */
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
  ) {}

  /**
   * Normalización institucional de placas.
   * RNF2: Elimina guiones y espacios para evitar duplicidad técnica.
   */
  private normalizarPlaca(placa: string): string {
    return String(placa ?? '').replace(/[- ]/g, '').toUpperCase().trim();
  }

  /**
   * Crea una SOLICITUD de registro de vehículo.
   * El vehículo NO se registra de inmediato; queda pendiente de aprobación del administrador.
   */
  async solicitarRegistroVehiculo(documento: string, dto: CreateVehiculoDto): Promise<{ mensaje: string; idSolicitud: number }> {
    const tipo = await this.tipoVehiculoRepository.findOne({ where: { idTipoV: dto.idTipoVehiculo } });
    if (!tipo) throw new BadRequestException('Tipo de vehículo no válido');

    const placaNormalizada = this.normalizarPlaca(dto.placa);

    // Verificar que la placa no esté ya registrada en el sistema
    const vehiculoExistente = await this.vehiculoRepository.findOne({
      where: { placa: placaNormalizada },
    });
    if (vehiculoExistente) {
      throw new ConflictException('Esta placa ya se encuentra registrada en el sistema');
    }

    // Verificar que no haya una solicitud PENDIENTE del mismo usuario para la misma placa
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

    // Notificar a los administradores (tipo 2)
    await this.notificacionesService.notificarAdmins({
      tipo: 'SOLICITUD_VEHICULO',
      titulo: 'Nueva solicitud de vehículo',
      mensaje: `El usuario ${documento} solicita registrar el vehículo con placa ${placaNormalizada}.`,
      metadata: { idSolicitud: guardada.idSolicitud, placa: placaNormalizada, documento },
    });

    return {
      mensaje: 'Solicitud enviada correctamente. El administrador la revisará pronto.',
      idSolicitud: guardada.idSolicitud,
    };
  }

  // ─── ADMIN: gestión de solicitudes ───────────────────────────────────────────

  /** Lista solicitudes (filtro opcional por estado) */
  async listarSolicitudes(estado?: EstadoSolicitud) {
    const where = estado ? { estado } : {};
    return this.solicitudRepository.find({
      where,
      relations: ['usuario', 'tipoVehiculo'],
      order: { creadoEn: 'DESC' },
    });
  }

  /** Aprueba o rechaza una solicitud */
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
      if (!dto.motivoRechazo?.trim()) {
        throw new BadRequestException('Debes indicar el motivo del rechazo');
      }
      solicitud.estado = EstadoSolicitud.RECHAZADO;
      solicitud.motivoRechazo = dto.motivoRechazo.trim();
      solicitud.resueltoEn = new Date();
      await this.solicitudRepository.save(solicitud);

      // Notificar al usuario del rechazo
      await this.notificacionesService.notificarUsuario({
        idUsuario: solicitud.documento,
        tipo: 'SOLICITUD_VEHICULO_RECHAZADA',
        titulo: 'Solicitud de vehículo rechazada',
        mensaje: `Tu solicitud para registrar el vehículo con placa ${solicitud.placa} fue rechazada. Motivo: ${dto.motivoRechazo}`,
        actorNombre: adminDocumento,
        metadata: { placa: solicitud.placa, motivo: dto.motivoRechazo },
      });

      return { mensaje: 'Solicitud rechazada y usuario notificado.' };
    }

    // APROBADO: crear Vehiculo + RegistroVehiculo
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

    // Notificar al usuario de la aprobación
    await this.notificacionesService.notificarUsuario({
      idUsuario: solicitud.documento,
      tipo: 'SOLICITUD_VEHICULO_APROBADA',
      titulo: '¡Vehículo registrado!',
      mensaje: `Tu solicitud para el vehículo con placa ${solicitud.placa} fue aprobada. Ya puedes usarlo en el parqueadero.`,
      actorNombre: adminDocumento,
      metadata: { placa: solicitud.placa },
    });

    return { mensaje: 'Solicitud aprobada. Vehículo registrado exitosamente.' };
  }

  /** Lista las solicitudes del usuario autenticado */
  async listarMisSolicitudes(documento: string) {
    return this.solicitudRepository.find({
      where: { documento },
      relations: ['tipoVehiculo'],
      order: { creadoEn: 'DESC' },
    });
  }

  // ─── COMPARTIR VEHÍCULO ───────────────────────────────────────────────────────

  /**
   * Comparte un vehículo con otro usuario.
   * Reglas:
   *  - Solo el propietario del registro puede compartir.
   *  - Un vehículo solo puede ser compartido 1 vez.
   *  - El receptor puede tener máximo 2 vehículos compartidos.
   */
  async compartirVehiculo(documentoPropietario: string, placa: string, dto: CompartirVehiculoDto): Promise<{ mensaje: string }> {
    const placaNormalizada = this.normalizarPlaca(placa);

    // Verificar que el propietario tiene registrado ese vehículo
    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documentoPropietario, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes este vehículo registrado en tu cuenta');

    // No puede compartirse con uno mismo
    if (dto.documentoReceptor === documentoPropietario) {
      throw new BadRequestException('No puedes compartir un vehículo contigo mismo');
    }

    // Verificar que el receptor existe
    const receptor = await this.compartirRepository.manager
      .getRepository('usuario')
      .findOne({ where: { documento: dto.documentoReceptor } });
    if (!receptor) throw new NotFoundException('El usuario receptor no existe');

    // Un vehículo solo puede compartirse 1 vez (una fila activa por id_registro_v)
    const yaCompartido = await this.compartirRepository.findOne({
      where: { idRegistroV: registro.idRegistroV },
    });
    if (yaCompartido) {
      throw new ConflictException('Este vehículo ya fue compartido con otro usuario');
    }

    // El receptor no puede tener más de 2 vehículos compartidos
    const totalCompartidosReceptor = await this.compartirRepository.count({
      where: { documento: dto.documentoReceptor },
    });
    if (totalCompartidosReceptor >= 2) {
      throw new BadRequestException('El usuario receptor ya tiene el máximo de 2 vehículos compartidos');
    }

    await this.compartirRepository.save(
      this.compartirRepository.create({
        documento: dto.documentoReceptor,
        idRegistroV: registro.idRegistroV,
      }),
    );

    return { mensaje: `Vehículo ${placaNormalizada} compartido exitosamente con ${dto.documentoReceptor}` };
  }

  /**
   * Elimina el compartido de un vehículo (solo el propietario puede hacerlo).
   */
  async quitarCompartido(documentoPropietario: string, placa: string): Promise<{ mensaje: string }> {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documentoPropietario, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes este vehículo registrado en tu cuenta');

    const compartido = await this.compartirRepository.findOne({
      where: { idRegistroV: registro.idRegistroV },
    });
    if (!compartido) throw new NotFoundException('Este vehículo no tiene ningún compartido activo');

    await this.compartirRepository.remove(compartido);
    return { mensaje: 'Vehículo dejó de estar compartido' };
  }

  /**
   * Lista los vehículos que otros usuarios han compartido con el usuario autenticado.
   */
  async listarVehiculosCompartidosConmigo(documento: string) {
    const compartidos = await this.compartirRepository.find({
      where: { documento },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo', 'registroVehiculo.vehiculo.tipoVehiculo', 'registroVehiculo.usuario'],
    });

    return compartidos.map((c) => ({
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

  /**
   * Información del compartido de un vehículo propio (con quién está compartido).
   */
  async infoCompartidoMio(documentoPropietario: string, placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);
    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documentoPropietario, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes este vehículo registrado en tu cuenta');

    const compartido = await this.compartirRepository.findOne({
      where: { idRegistroV: registro.idRegistroV },
      relations: ['usuarioReceptor'],
    });

    if (!compartido) return { compartido: false };

    return {
      compartido: true,
      receptor: {
        documento: compartido.usuarioReceptor.documento,
        nombre: compartido.usuarioReceptor.nombreCompleto,
        compartidoDesde: compartido.createdAt,
      },
    };
  }

  /**
   * Lista vehículos vinculados al usuario autenticado.
   * MOBILE_API: Optimizado para mostrar la flota personal del usuario en la app.
   * SERIALIZATION: Mapea la relación Many-to-Many para un consumo simplificado en mobile.
   */
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

  /**
   * Lista todos los vehículos del sistema con paginación (Solo Admin).
   * MOBILE_API: Usado para la gestión masiva de flota desde la consola móvil.
   * PAGINATION: Controla el flujo de datos para evitar latencia en redes móviles.
   */
  async findAll(page: number = 1, limit: number = 10) {
    // PAGINATION: Offset dinámico para navegación entre páginas
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

  /**
   * Requerido por UsuarioService.
   */
  async findByUsuario(documento: string): Promise<Vehiculo[]> {
    const registros = await this.registroRepository.find({
      where: { idUsuario: documento },
      relations: ['vehiculo', 'vehiculo.tipoVehiculo'],
    });
    return registros.map(r => r.vehiculo);
  }

  /**
   * RF32: Historial de uso del Aprendiz.
   *
   * Objetivo:
   * - Permitir que el Aprendiz consulte sus ingresos/salidas (transparencia).
   * - Depende de que registrarSalida cierre correctamente el movimiento (horaSalida + estado).
   *
   * RNF2:
   * - Retorna solo información operativa del usuario autenticado (no expone datos de otros usuarios).
   */
  async listarHistorialUsuario(documento: string) {
    const movimientos = await this.movimientoRepository
      .createQueryBuilder('mv') // PERFORMANCE: consulta agregada con joins controlados.
      .innerJoin(RegistroVehiculo, 'rv', 'rv.id_registro_v = mv.id_registro_vehiculo') // RF32: enlaza movimiento con registro usuario-vehículo.
      .innerJoin(Vehiculo, 'v', 'v.placa = rv.id_vehiculo') // RF32: permite devolver la placa en el historial.
      .leftJoin(Bahia, 'b', 'b.id_bahia = mv.id_bahia') // RF32: permite devolver nombre de bahía si existe.
      .where('rv.id_usuario = :documento', { documento }) // RNF2: limita estrictamente al usuario autenticado.
      .orderBy('mv.hora_ingreso', 'DESC') // RF32: orden cronológico descendente.
      .limit(50) // UX: limita historial para evitar cargas grandes en móvil.
      .select([
        'mv.id_movimiento AS "idMovimiento"',
        'v.placa AS "placa"',
        'mv.hora_ingreso AS "horaIngreso"',
        'mv.hora_salida AS "horaSalida"',
        'mv.estado AS "estado"',
        'b.nombre_bahia AS "bahia"',
      ]) // RF32: payload mínimo para UI.
      .getRawMany();

    return movimientos;
  }

  /**
   * Detalle de vehículo.
   */
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

  /**
   * Actualiza datos y gestiona Cloudinary.
   */
  async actualizarVehiculo(documento: string, placa: string, dto: ActualizarVehiculoDto): Promise<{ mensaje: string }> {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new ForbiddenException('No tienes permisos para modificar este vehículo');

    const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
    if (!vehiculo) throw new NotFoundException('Vehículo no encontrado');

    const fotoVehiculoVieja = vehiculo.fotoVehiculo;
    const fotoTarjetaVieja = vehiculo.fotoTarjetaP;
    const fotoPlacaVieja = vehiculo.fotoPlaca;

    if (dto.fotoVehiculo) vehiculo.fotoVehiculo = dto.fotoVehiculo;
    if (dto.fotoTarjetaP) vehiculo.fotoTarjetaP = dto.fotoTarjetaP;
    if (dto.fotoPlaca) vehiculo.fotoPlaca = dto.fotoPlaca;
    if (dto.color) vehiculo.color = dto.color;
    if (dto.idTipoVehiculo) vehiculo.idTipoVehiculo = dto.idTipoVehiculo;

    await this.vehiculoRepository.save(vehiculo);

    // SECURITY: Limpieza de fotos obsoletas en Cloudinary
    const fotosABorrar: string[] = [];
    if (dto.fotoVehiculo && fotoVehiculoVieja && fotoVehiculoVieja !== dto.fotoVehiculo) fotosABorrar.push(fotoVehiculoVieja);
    if (dto.fotoTarjetaP && fotoTarjetaVieja && fotoTarjetaVieja !== dto.fotoTarjetaP) fotosABorrar.push(fotoTarjetaVieja);
    if (dto.fotoPlaca && fotoPlacaVieja && fotoPlacaVieja !== dto.fotoPlaca) fotosABorrar.push(fotoPlacaVieja);
    
    if (fotosABorrar.length > 0) await this.cloudinaryService.borrarVariasPorUrl(fotosABorrar);

    return { mensaje: 'Datos del vehículo actualizados exitosamente' };
  }

  /**
   * Catálogo de tipos.
   */
  async listarTipos(): Promise<TipoVehiculo[]> {
    return await this.tipoVehiculoRepository.find({ order: { tipoVehiculo: 'ASC' } });
  }

  /**
   * Desvincula usuario y vehículo.
   * SECURITY: Borra lógicamente el vínculo (Soft Delete) para preservar historial.
   */
  async eliminarRegistro(documento: string, placa: string) {
    const placaNormalizada = this.normalizarPlaca(placa);

    const registro = await this.registroRepository.findOne({
      where: { idUsuario: documento, idVehiculo: placaNormalizada },
    });
    if (!registro) throw new NotFoundException('El vínculo no existe o ya fue eliminado');

    // SECURITY: Impedir eliminar si el vehículo está dentro
    const estaAdentro = await this.movimientoRepository.findOne({
      where: { 
        idRegistroVehiculo: registro.idRegistroV, 
        estado: In([EstadoMovimiento.ADENTRO, EstadoMovimiento.TRANSITO]) 
      }
    });

    if (estaAdentro) {
      throw new BadRequestException('No puedes eliminar un vehículo que se encuentra dentro del parqueadero');
    }

    await this.registroRepository.softRemove(registro);

    const otrosRegistros = await this.registroRepository.count({ where: { idVehiculo: placaNormalizada } });

    if (otrosRegistros === 0) {
      const vehiculo = await this.vehiculoRepository.findOne({ where: { placa: placaNormalizada } });
      if (vehiculo) {
        // Mantenemos el vehículo en la DB pero lo marcamos como eliminado si no tiene más dueños
        // Las fotos se quedan en Cloudinary si queremos auditoría, o se borran si es borrado físico.
        // Por consistencia con Soft Delete del registro, usamos softRemove en vehículo también.
        await this.vehiculoRepository.softRemove(vehiculo);
      }
    }

    return { ok: true, mensaje: 'Vínculo eliminado exitosamente' };
  }
}
