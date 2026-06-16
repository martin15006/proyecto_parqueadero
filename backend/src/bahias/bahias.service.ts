import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Bahia } from './entities/bahia.entity';
import { TipoBahia } from './entities/tipo-bahia.entity';
import { ParqueaderoEstado } from './entities/parqueadero-estado.entity';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { IOcupacionPayload } from '../common/interfaces/socket-payloads.interface';
import { IotStatusEnum } from '../common/enums/iot-status.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EventosGateway } from '../gateway/eventos.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { Sensor } from '../telemetria/entities/sensor.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';
import { Visita, EstadoVisita } from '../visitas/entities/visita.entity';
import { BahiaReconciliacionEstadoEnum } from '../common/enums/bahia-reconciliacion-estado.enum';

export enum EstadoPanelEnum {
  LIBRE = 'LIBRE',
  OCUPADO = 'OCUPADO',
  SALIDA_PENDIENTE = 'SALIDA_PENDIENTE',
  DISCREPANCIA = 'DISCREPANCIA',
  OFFLINE = 'OFFLINE',
  DESHABILITADO = 'DESHABILITADO',
}

export interface BahiaSensorizadaDto {
  idBahia: number;
  nombreBahia: string;
  tipoBahia: string;
  estadoReconciliado: BahiaReconciliacionEstadoEnum;
  estadoSensor: IotStatusEnum;
  estadoPanel: EstadoPanelEnum;
  placa: string | null;
  estadoMovimiento: EstadoMovimiento | null;
  ultimaTelemetriaAt: Date | null;
}

@Injectable()
export class BahiasService implements OnModuleInit {
  private readonly logger = new Logger(BahiasService.name);

  constructor(
    @InjectRepository(Bahia)
    private readonly bahiaRepository: Repository<Bahia>,
    @InjectRepository(ParqueaderoEstado)
    private readonly parqueaderoEstadoRepository: Repository<ParqueaderoEstado>,
    @InjectRepository(MovimientoVehiculo)
    private readonly movimientoRepository: Repository<MovimientoVehiculo>,
    @InjectRepository(Visita)
    private readonly visitaRepository: Repository<Visita>,
    private readonly auditoriaService: AuditoriaService,
    private readonly eventosGateway: EventosGateway,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  private mapReconciliacionToSocketEstado(estado: BahiaReconciliacionEstadoEnum): IOcupacionPayload['bahias'][number]['estado'] {
    switch (estado) {
      case BahiaReconciliacionEstadoEnum.LIBRE:
        return IotStatusEnum.AVAILABLE;
      case BahiaReconciliacionEstadoEnum.OCUPADO:
        return IotStatusEnum.OCCUPIED;
      case BahiaReconciliacionEstadoEnum.OFFLINE:
        return IotStatusEnum.OFFLINE;
      case BahiaReconciliacionEstadoEnum.DESHABILITADO:
        return IotStatusEnum.DISABLED;
      case BahiaReconciliacionEstadoEnum.TRANSITO:
        return 'TRANSITO';
      case BahiaReconciliacionEstadoEnum.DISCREPANCIA:
        return 'DISCREPANCIA';
      default:
        return IotStatusEnum.AVAILABLE;
    }
  }

  async onModuleInit() {
    try {
      await this.cerrarMovimientosHuerfanos();
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Error en onModuleInit de BahiasService.', stack);
    }
  }

  private async cerrarMovimientosHuerfanos(): Promise<void> {
    const umbralHoras = Number(process.env.MOVIMIENTO_TIMEOUT_HORAS ?? 8);
    const umbral = new Date(Date.now() - umbralHoras * 60 * 60 * 1000);

    const result = await this.movimientoRepository
      .createQueryBuilder()
      .update(MovimientoVehiculo)
      .set({ estado: EstadoMovimiento.ANULADO, horaSalida: new Date() })
      .where('estado = :estado', { estado: EstadoMovimiento.ADENTRO })
      .andWhere('hora_ingreso < :umbral', { umbral })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.warn(
        `[Startup] ${result.affected} movimiento(s) ADENTRO antiguos cerrados automáticamente ` +
        `(> ${umbralHoras} h sin actividad).`,
      );
    }
  }

  async findAll(): Promise<Bahia[]> {
    return await this.bahiaRepository.find({
      relations: ['tipoBahia'],
    });
  }

  async obtenerBahiasSensorizadas(): Promise<BahiaSensorizadaDto[]> {
    const sensores = await this.bahiaRepository.manager.find(Sensor, {
      where: { activo: true },
    });

    if (sensores.length === 0) return [];

    const idsBahias = sensores.map((s) => s.idBahia);

    const bahias = await this.bahiaRepository.find({
      where: { idBahia: In(idsBahias) },
      relations: ['tipoBahia'],
      order: { idBahia: 'ASC' },
    });

    return bahias.map((b) => {
      const sensor = sensores.find((s) => s.idBahia === b.idBahia)!;
      const estadoPanel = b.estadoManual === IotStatusEnum.DISABLED
        ? EstadoPanelEnum.DESHABILITADO
        : this.derivarEstadoPanel(b.estadoReconciliado);

      return {
        idBahia: b.idBahia,
        nombreBahia: b.nombreBahia,
        tipoBahia: b.tipoBahia?.tipoBahia ?? 'Estándar',
        estadoReconciliado: b.estadoReconciliado,
        estadoSensor: sensor.estadoActual,
        estadoPanel,
        placa: null,
        estadoMovimiento: null,
        ultimaTelemetriaAt: b.ultimaTelemetriaAt,
      };
    });
  }

  private derivarEstadoPanel(
    estadoReconciliado: BahiaReconciliacionEstadoEnum,
  ): EstadoPanelEnum {
    switch (estadoReconciliado) {
      case BahiaReconciliacionEstadoEnum.OCUPADO:
        return EstadoPanelEnum.OCUPADO;
      case BahiaReconciliacionEstadoEnum.DISCREPANCIA:
        return EstadoPanelEnum.DISCREPANCIA;
      case BahiaReconciliacionEstadoEnum.OFFLINE:
        return EstadoPanelEnum.OFFLINE;
      case BahiaReconciliacionEstadoEnum.DESHABILITADO:
        return EstadoPanelEnum.DESHABILITADO;
      case BahiaReconciliacionEstadoEnum.LIBRE:
      default:
        return EstadoPanelEnum.LIBRE;
    }
  }

  async findOne(id: number): Promise<Bahia> {
    const bahia = await this.bahiaRepository.findOne({
      where: { idBahia: id },
      relations: ['tipoBahia'],
    });
    if (!bahia) throw new NotFoundException(`Bahía con ID ${id} no encontrada`);
    return bahia;
  }

  async obtenerTiposBahia(): Promise<TipoBahia[]> {
    return await this.bahiaRepository.manager.find(TipoBahia, { order: { idTipoB: 'ASC' } });
  }

  async crearBahia(
    dto: { nombreBahia: string; idTipoBahia: number },
    actor: { idUsuario: string; ip?: string; userAgent?: string },
  ): Promise<Bahia> {
    const nombre = String(dto.nombreBahia ?? '').trim();
    if (!nombre) {
      throw new BadRequestException({
        message: 'El nombre de la bahía es obligatorio.',
        errorCode: 'NOMBRE_OBLIGATORIO',
      });
    }

    const tipo = await this.bahiaRepository.manager.findOne(TipoBahia, {
      where: { idTipoB: dto.idTipoBahia },
    });
    if (!tipo) {
      throw new BadRequestException({
        message: 'El tipo de bahía indicado no existe.',
        errorCode: 'TIPO_INVALIDO',
      });
    }

    const existente = await this.bahiaRepository.findOne({
      where: { nombreBahia: nombre },
      withDeleted: true,
    });
    if (existente) {
      throw new BadRequestException({
        message: `Ya existe una bahía con el nombre "${nombre}".`,
        errorCode: 'BAHIA_DUPLICADA',
      });
    }

    const creada = await this.bahiaRepository.save(
      this.bahiaRepository.create({
        nombreBahia: nombre,
        idTipoBahia: tipo.idTipoB,
        estadoReconciliado: BahiaReconciliacionEstadoEnum.LIBRE,
      }),
    );

    await this.auditoriaService.create({
      accion: 'CREAR_BAHIA',
      entidad: 'BAHIA',
      idEntidad: creada.idBahia,
      datosNuevos: { nombreBahia: creada.nombreBahia, idTipoBahia: creada.idTipoBahia },
      idUsuario: actor.idUsuario,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    return this.findOne(creada.idBahia);
  }

  async eliminarBahia(
    id: number,
    actor: { idUsuario: string; ip?: string; userAgent?: string },
  ): Promise<{ ok: true; idBahia: number }> {
    const bahia = await this.bahiaRepository.findOne({ where: { idBahia: id } });
    if (!bahia) throw new NotFoundException(`Bahía con ID ${id} no encontrada`);

    await this.bahiaRepository.manager.update(Sensor, { idBahia: id }, { activo: false });

    await this.bahiaRepository.softDelete(id);

    await this.auditoriaService.create({
      accion: 'ELIMINAR_BAHIA',
      entidad: 'BAHIA',
      idEntidad: id,
      datosAnteriores: { nombreBahia: bahia.nombreBahia, idTipoBahia: bahia.idTipoBahia },
      idUsuario: actor.idUsuario,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    const conteo = await this.obtenerConteoGlobal();
    this.eventosGateway.emitirConteoGlobalDisponibles({
      total: conteo.total,
      ocupados: conteo.ocupados,
      disponibles: conteo.disponibles,
      estadoParqueadero: conteo.estadoParqueadero,
      actualizadoEn: new Date(),
    });

    return { ok: true, idBahia: id };
  }

  async obtenerOcupacion(): Promise<IOcupacionPayload> {
    const parqueadero = await this.getOrCreateParqueaderoEstado();

    const sensoresActivos = await this.bahiaRepository.manager.find(Sensor, {
      where: { activo: true },
    });
    const idsSensorizados = sensoresActivos.map((s) => s.idBahia);

    const bahias = idsSensorizados.length > 0
      ? await this.bahiaRepository.find({
          where: { idBahia: In(idsSensorizados) },
          relations: ['tipoBahia'],
        })
      : [];

    const movimientosActivos = await this.movimientoRepository.find({
      where: { estado: In([EstadoMovimiento.TRANSITO, EstadoMovimiento.ADENTRO]) },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo'],
    });

    const visitasActivas = await this.visitaRepository.count({
      where: { estado: EstadoVisita.ADENTRO },
    });

    const parqueaderoDeshabilitado = Boolean(parqueadero.deshabilitado);

    const bahiasEnServicio = bahias.filter((b) => b.estadoManual !== IotStatusEnum.DISABLED);

    const total = bahiasEnServicio.length;
    const ocupados = movimientosActivos.length + visitasActivas;
    const disponibles = Math.max(total - ocupados, 0);

    const estadoParqueadero: IOcupacionPayload['estadoParqueadero'] = parqueaderoDeshabilitado
      ? 'DESHABILITADO'
      : (total > 0 && ocupados >= total ? 'LLENO' : 'DISPONIBLE');

    const bahiasConEstado = bahias.map((b) => {
      const estadoManual = b.estadoManual ?? null;
      const estadoReconciliado = b.estadoReconciliado ?? BahiaReconciliacionEstadoEnum.LIBRE;

      const estadoFinal = parqueaderoDeshabilitado
        ? IotStatusEnum.DISABLED
        : (estadoManual === IotStatusEnum.AVAILABLE || estadoManual === IotStatusEnum.OCCUPIED || estadoManual === IotStatusEnum.DISABLED)
          ? estadoManual
          : this.mapReconciliacionToSocketEstado(estadoReconciliado) ?? IotStatusEnum.AVAILABLE;

      return {
        idBahia: b.idBahia,
        nombreBahia: b.nombreBahia,
        estado: estadoFinal,
        tipo: b.tipoBahia?.tipoBahia || 'Estándar',
      };
    });

    return {
      total,
      ocupados,
      disponibles,
      parqueaderoDeshabilitado,
      estadoParqueadero,
      bahias: bahiasConEstado,
    };
  }

  async obtenerConteoGlobal() {
    const ocupacion = await this.obtenerOcupacion();
    return {
      total: ocupacion.total,
      ocupados: ocupacion.ocupados,
      disponibles: ocupacion.disponibles,
      parqueaderoDeshabilitado: ocupacion.parqueaderoDeshabilitado,
      estadoParqueadero: ocupacion.estadoParqueadero,
    };
  }

  private async getOrCreateParqueaderoEstado(): Promise<ParqueaderoEstado> {
    const existing = await this.parqueaderoEstadoRepository.findOne({ where: { id: 1 } });
    if (existing) return existing;

    const created = this.parqueaderoEstadoRepository.create({
      id: 1,
      deshabilitado: false,
      motivo: null,
      duracionEstimada: null,
      deshabilitadoDesde: null,
      ultimoUmbralNotificado: 0,
    });
    return await this.parqueaderoEstadoRepository.save(created);
  }

  async actualizarEstadoParqueadero(
    dto: { deshabilitado: boolean; motivo?: string; duracionEstimada?: string },
    actor: { idUsuario: string; nombre: string | null; ip?: string; userAgent?: string },
  ): Promise<ParqueaderoEstado> {
    const parqueadero = await this.getOrCreateParqueaderoEstado();
    const anterior = parqueadero.deshabilitado;
    const motivoAnterior = parqueadero.motivo;
    const duracionAnterior = parqueadero.duracionEstimada;

    const solicitadoDeshabilitar = Boolean(dto.deshabilitado);

    if (solicitadoDeshabilitar) {
      const motivo = String(dto.motivo ?? '').trim();
      if (!motivo.length) {
        throw new BadRequestException({
          message: 'Para deshabilitar el parqueadero debes indicar un motivo.',
          errorCode: 'MOTIVO_OBLIGATORIO',
        });
      }

      parqueadero.deshabilitado = true;
      parqueadero.motivo = motivo;
      parqueadero.duracionEstimada = dto.duracionEstimada ? String(dto.duracionEstimada).trim() : null;
      parqueadero.deshabilitadoDesde = anterior ? parqueadero.deshabilitadoDesde : new Date();
      parqueadero.ultimoUmbralNotificado = 0;
    } else {
      parqueadero.deshabilitado = false;
      parqueadero.motivo = null;
      parqueadero.duracionEstimada = null;
      parqueadero.deshabilitadoDesde = null;
      parqueadero.ultimoUmbralNotificado = 0;
    }

    const guardado = await this.parqueaderoEstadoRepository.save(parqueadero);

    await this.auditoriaService.create({
      accion: 'CAMBIAR_ESTADO_PARQUEADERO',
      entidad: 'PARQUEADERO',
      idEntidad: guardado.id,
      datosAnteriores: {
        deshabilitado: anterior,
        motivo: motivoAnterior,
        duracionEstimada: duracionAnterior,
      },
      datosNuevos: {
        deshabilitado: guardado.deshabilitado,
        motivo: guardado.motivo,
        duracionEstimada: guardado.duracionEstimada,
      },
      idUsuario: actor.idUsuario,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    this.eventosGateway.emitirParqueaderoEstadoActualizado({
      deshabilitado: guardado.deshabilitado,
      motivo: guardado.motivo ?? undefined,
      duracionEstimada: guardado.duracionEstimada ?? undefined,
      deshabilitadoDesde: guardado.deshabilitadoDesde ?? undefined,
      fecha: new Date(),
    });

    if (!anterior && guardado.deshabilitado) {
      const duracionTexto = guardado.duracionEstimada ? ` Duración estimada: ${guardado.duracionEstimada}.` : '';

      this.eventosGateway.emitirAlertaParqueadero({
        tipo: 'PARQUEADERO_DESHABILITADO',
        mensaje: `Parqueadero deshabilitado. Motivo: ${guardado.motivo}.${duracionTexto}`,
        fecha: new Date(),
      });
      this.eventosGateway.emitirAlertaAprendices({
        tipo: 'PARQUEADERO_DESHABILITADO',
        mensaje: `Parqueadero deshabilitado. Motivo: ${guardado.motivo}.${duracionTexto}`,
        fecha: new Date(),
      });

      await this.notificacionesService.registrarParqueaderoDeshabilitadoBroadcast({
        motivo: guardado.motivo ?? 'Sin motivo',
        duracionEstimada: guardado.duracionEstimada,
        actorNombre: actor.nombre,
      });
    }

    const conteo = await this.obtenerConteoGlobal();
    this.eventosGateway.emitirConteoGlobalDisponibles({
      total: conteo.total,
      ocupados: conteo.ocupados,
      disponibles: conteo.disponibles,
      estadoParqueadero: conteo.estadoParqueadero,
      actualizadoEn: new Date(),
    });

    return guardado;
  }

  async validarIngresoPermitido() {
    const estado = await this.getOrCreateParqueaderoEstado();

    if (estado.deshabilitado) {
      const duracionTexto = estado.duracionEstimada ? ` Duración estimada: ${estado.duracionEstimada}.` : '';
      throw new ForbiddenException({
        message: `Parqueadero deshabilitado. Motivo: ${estado.motivo ?? 'No especificado'}.${duracionTexto}`,
        errorCode: 'PARQUEADERO_DESHABILITADO',
      });
    }

    const conteo = await this.obtenerConteoGlobal();

    if (conteo.total > 0 && conteo.ocupados >= conteo.total) {
      try {
        await this.evaluarAlertasOcupacion();
      } catch (_) { /* no bloquear por fallo en notificación */ }

      throw new BadRequestException({
        message: 'Capacidad máxima alcanzada: el parqueadero está lleno. No se permiten más ingresos hasta que ocurra una salida.',
        errorCode: 'PARQUEADERO_LLENO',
      });
    }
  }

  async evaluarAlertasOcupacion() {
    const estado = await this.getOrCreateParqueaderoEstado();
    if (estado.deshabilitado) {
      await this.resetUmbralSiNecesario(estado, 0);
      return;
    }

    const ocupacion = await this.obtenerOcupacion();
    const total = ocupacion.total || 0;
    const ocupados = ocupacion.ocupados || 0;
    const porcentaje = total > 0 ? (ocupados / total) * 100 : 0;

    const nuevoUmbral = porcentaje >= 100 ? 100 : porcentaje >= 80 ? 80 : 0;

    if (nuevoUmbral === 0) {
      await this.resetUmbralSiNecesario(estado, 0);
      return;
    }

    if (estado.ultimoUmbralNotificado >= nuevoUmbral) return;

    estado.ultimoUmbralNotificado = nuevoUmbral;
    await this.parqueaderoEstadoRepository.save(estado);

    if (nuevoUmbral === 80) {
      this.eventosGateway.emitirAlertaParqueadero({
        tipo: 'UMBRAL_80',
        mensaje: `Alerta: el parqueadero alcanzó el 80% de ocupación (${ocupados}/${total}).`,
        fecha: new Date(),
      });
      try {
        await this.notificacionesService.notificarAdmins({
          tipo: 'PARQUEADERO_UMBRAL_80',
          titulo: 'Parqueadero al 80%',
          mensaje: `El parqueadero alcanzó el 80% de ocupación (${ocupados}/${total} bahías ocupadas).`,
          metadata: { ocupados, total, porcentaje: Math.round(porcentaje) },
        });
      } catch (_) { /* no bloquear flujo */ }
      return;
    }

    this.eventosGateway.emitirAlertaParqueadero({
      tipo: 'PARQUEADERO_LLENO',
      mensaje: `Alerta: capacidad máxima alcanzada (${ocupados}/${total}). El parqueadero está lleno.`,
      fecha: new Date(),
    });
    this.eventosGateway.emitirAlertaAprendices({
      tipo: 'PARQUEADERO_LLENO',
      mensaje: `El parqueadero está lleno (${ocupados}/${total}). No hay espacios disponibles en este momento.`,
      fecha: new Date(),
    });
    try {
      await this.notificacionesService.notificarAdmins({
        tipo: 'PARQUEADERO_LLENO',
        titulo: 'Parqueadero LLENO',
        mensaje: `Capacidad máxima alcanzada (${ocupados}/${total} bahías ocupadas). Ya no se permiten más ingresos hasta que ocurra una salida.`,
        metadata: { ocupados, total, porcentaje: 100 },
      });
    } catch (_) { /* no bloquear flujo */ }
    try {
      await this.notificacionesService.registrarParqueaderoLlenoBroadcast({ ocupados, total });
    } catch (_) { /* no bloquear flujo */ }
  }

  private async resetUmbralSiNecesario(estado: ParqueaderoEstado, valor: number) {
    if (estado.ultimoUmbralNotificado === valor) return;
    estado.ultimoUmbralNotificado = valor;
    await this.parqueaderoEstadoRepository.save(estado);
  }

  async forzarEstadoBahia(
    idBahia: number,
    estado: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED' | 'AUTO',
    actor: { idUsuario: string; ip?: string; userAgent?: string },
  ): Promise<Bahia> {
    const bahia = await this.bahiaRepository.findOne({ where: { idBahia }, relations: ['tipoBahia'] });
    if (!bahia) throw new NotFoundException(`Bahía con ID ${idBahia} no encontrada`);

    const anterior = bahia.estadoManual ?? null;
    const siguiente =
      estado === 'AUTO'
        ? null
        : (estado === 'AVAILABLE' ? IotStatusEnum.AVAILABLE : estado === 'OCCUPIED' ? IotStatusEnum.OCCUPIED : IotStatusEnum.DISABLED);

    bahia.estadoManual = siguiente;
    const guardada = await this.bahiaRepository.save(bahia);

    await this.auditoriaService.create({
      accion: 'FORZAR_ESTADO_BAHIA',
      entidad: 'BAHIA',
      idEntidad: guardada.idBahia,
      datosAnteriores: { estadoManual: anterior },
      datosNuevos: { estadoManual: guardada.estadoManual },
      idUsuario: actor.idUsuario,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });

    const conteoForzar = await this.obtenerConteoGlobal();
    this.eventosGateway.emitirConteoGlobalDisponibles({
      total: conteoForzar.total,
      ocupados: conteoForzar.ocupados,
      disponibles: conteoForzar.disponibles,
      estadoParqueadero: conteoForzar.estadoParqueadero,
      actualizadoEn: new Date(),
    });

    const nuevoEstado =
      guardada.estadoManual === IotStatusEnum.DISABLED
        ? BahiaReconciliacionEstadoEnum.DESHABILITADO
        : guardada.estadoManual === IotStatusEnum.OCCUPIED
          ? BahiaReconciliacionEstadoEnum.OCUPADO
          : BahiaReconciliacionEstadoEnum.LIBRE;

    this.eventosGateway.emitirBahiaModificada(
      {
        idBahia: `B-${guardada.idBahia}`,
        nuevoEstado,
        actualizadoEn: new Date(),
      },
      { source: 'ADMIN' },
    );

    return guardada;
  }

  async procesarEscaneoPorteria(usuarioId: string, vehiculoId: string) {
    const idUsuario = String(usuarioId ?? '').trim();
    const placa = String(vehiculoId ?? '').trim().toUpperCase();

    if (!idUsuario) {
      throw new BadRequestException({
        message: 'El usuarioId es obligatorio.',
        errorCode: 'USUARIO_OBLIGATORIO',
      });
    }

    if (!placa) {
      throw new BadRequestException({
        message: 'El vehiculoId es obligatorio.',
        errorCode: 'VEHICULO_OBLIGATORIO',
      });
    }

    await this.validarIngresoPermitido();

    return await this.bahiaRepository.manager.transaction(async (manager) => {
      const registro = await manager.findOne(RegistroVehiculo, {
        where: { idUsuario: idUsuario, idVehiculo: placa },
        lock: { mode: 'pessimistic_write' },
      });

      if (!registro) {
        throw new NotFoundException('No existe vinculación activa entre el usuario y el vehículo.');
      }

      const yaActivo = await manager.findOne(MovimientoVehiculo, {
        where: { idRegistroVehiculo: registro.idRegistroV, estado: EstadoMovimiento.ADENTRO },
        lock: { mode: 'pessimistic_write' },
      });
      if (yaActivo) {
        throw new BadRequestException({
          message: 'El vehículo ya se encuentra registrado dentro del parqueadero.',
          errorCode: 'VEHICULO_YA_ADENTRO',
        });
      }

      const yaTransito = await manager.findOne(MovimientoVehiculo, {
        where: { idRegistroVehiculo: registro.idRegistroV, estado: EstadoMovimiento.TRANSITO },
        lock: { mode: 'pessimistic_write' },
      });
      if (yaTransito) {
        throw new BadRequestException({
          message: 'El vehículo ya tiene un ingreso en tránsito.',
          errorCode: 'VEHICULO_EN_TRANSITO',
        });
      }

      const movimiento = manager.create(MovimientoVehiculo, {
        horaIngreso: new Date(),
        idRegistroVehiculo: registro.idRegistroV,
        idBahia: null,
        estado: EstadoMovimiento.TRANSITO,
        esManual: false,
      });
      const guardado = await manager.save(MovimientoVehiculo, movimiento);

      await this.auditoriaService.create({
        accion: 'PORTERIA_ESCANEO_TRANSITO',
        entidad: 'MOVIMIENTO',
        idEntidad: guardado.idMovimiento,
        idUsuario: 'SISTEMA',
        datosNuevos: {
          idUsuario,
          placa,
          idBahia: null,
          estado: EstadoMovimiento.TRANSITO,
          idMovimiento: guardado.idMovimiento,
        },
      });

      return {
        ok: true,
        estado: 'TRANSITO',
        idBahia: null,
        bahia: 'EN_TRANSITO',
        idMovimiento: guardado.idMovimiento,
      };
    });
  }

  async procesarTelemetriaSensor(sensorId: string, fisicoOcupado: boolean) {
    const codigo = String(sensorId ?? '').trim();
    if (!codigo) {
      throw new BadRequestException({
        message: 'El sensorId es obligatorio.',
        errorCode: 'SENSOR_OBLIGATORIO',
      });
    }

    this.logger.verbose(`[IoT] → procesarTelemetriaSensor  sensor=${codigo}  fisicoOcupado=${fisicoOcupado}`);

    const ejecutarCiclo = () =>
      this.bahiaRepository.manager.transaction(async (manager) => {
        const sensor = await manager.findOne(Sensor, {
          where: { codigo },
          lock: { mode: 'pessimistic_write' },
        });
        if (!sensor) {
          this.logger.error(`[IoT] Sensor ${codigo} NO encontrado en DB — verifica tabla 'sensor'`);
          throw new NotFoundException('Sensor no registrado.');
        }

        const bahia = await manager.findOne(Bahia, {
          where: { idBahia: sensor.idBahia },
          lock: { mode: 'pessimistic_write' },
        });
        if (!bahia) {
          this.logger.error(`[IoT] Bahía idBahia=${sensor.idBahia} NO encontrada (sensor ${codigo})`);
          throw new NotFoundException('Bahía asociada al sensor no encontrada.');
        }

        const ahora = new Date();
        bahia.ultimaTelemetriaAt = ahora;
        bahia.ultimoFisicoOcupado = Boolean(fisicoOcupado);

        const estadoActual = bahia.estadoReconciliado ?? BahiaReconciliacionEstadoEnum.LIBRE;
        this.logger.verbose(
          `[IoT] sensor=${codigo} → bahía ${bahia.idBahia}(${bahia.nombreBahia}) | estado=${estadoActual} | fisicoOcupado=${fisicoOcupado}`,
        );

        if (fisicoOcupado) {
          await this.manejarSensorOcupado(manager, bahia, estadoActual, ahora);
        } else {
          await this.manejarSensorLibre(manager, bahia, estadoActual, ahora);
        }

        const guardada = await manager.save(Bahia, bahia);

        this.logger.log(
          `[IoT] ✓ Bahía ${guardada.idBahia} guardada → estadoReconciliado=${guardada.estadoReconciliado}`,
        );

        this.eventosGateway.emitirBahiaModificada(
          { idBahia: `B-${guardada.idBahia}`, nuevoEstado: guardada.estadoReconciliado, actualizadoEn: new Date() },
          { source: 'IOT' },
        );

        return { ok: true, idBahia: guardada.idBahia, estado: guardada.estadoReconciliado };
      });

    const resultado = await ejecutarCiclo();

    try {
      const conteo = await this.obtenerConteoGlobal();
      this.eventosGateway.emitirConteoGlobalDisponibles({
        total: conteo.total,
        ocupados: conteo.ocupados,
        disponibles: conteo.disponibles,
        estadoParqueadero: conteo.estadoParqueadero,
        actualizadoEn: new Date(),
      });
    } catch (err) {
      this.logger.warn(`[IoT] Error emitiendo conteo global tras evento sensor: ${err instanceof Error ? err.message : err}`);
    }

    return resultado;
  }

  private async manejarSensorOcupado(
    _manager: EntityManager,
    bahia: Bahia,
    estadoActual: BahiaReconciliacionEstadoEnum,
    _ahora: Date,
  ): Promise<void> {
    const TAG = `[IoT:OCCUPIED] Bahía ${bahia.idBahia}(${bahia.nombreBahia}) | estado=${estadoActual}`;

    if (estadoActual === BahiaReconciliacionEstadoEnum.OCUPADO) {
      this.logger.verbose(`${TAG} → ya OCUPADO, sin cambio`);
      return;
    }

    if (estadoActual === BahiaReconciliacionEstadoEnum.DESHABILITADO) {
      this.logger.verbose(`${TAG} → DESHABILITADO (decisión admin), sin cambio`);
      return;
    }

    bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.OCUPADO;
    bahia.transitoDesde = null;
    bahia.discrepanciaDesde = null;
    this.logger.log(`${TAG} → OCUPADO`);
  }

  private async manejarSensorLibre(
    _manager: EntityManager,
    bahia: Bahia,
    estadoActual: BahiaReconciliacionEstadoEnum,
    _ahora: Date,
  ): Promise<void> {
    const TAG = `[IoT:AVAILABLE] Bahía ${bahia.idBahia}(${bahia.nombreBahia}) | estado=${estadoActual}`;

    if (estadoActual === BahiaReconciliacionEstadoEnum.LIBRE) {
      this.logger.debug(`${TAG} → ya LIBRE, sin cambio`);
      return;
    }

    if (estadoActual === BahiaReconciliacionEstadoEnum.DESHABILITADO) {
      this.logger.verbose(`${TAG} → DESHABILITADO (decisión admin), sin cambio`);
      return;
    }

    bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.LIBRE;
    bahia.transitoDesde = null;
    bahia.discrepanciaDesde = null;
    this.logger.log(`${TAG} → LIBRE`);
  }

  async obtenerMetricasSensorizadas(): Promise<{
    totalBahias: number;
    bahiasOcupadas: number;
    bahiasDisponibles: number;
    porcentajeOcupacion: number;
  }> {
    const sensores = await this.bahiaRepository.manager.find(Sensor, {
      where: { activo: true },
    });

    const idsBahias = sensores.map((s) => s.idBahia);

    if (idsBahias.length === 0) {
      return { totalBahias: 0, bahiasOcupadas: 0, bahiasDisponibles: 0, porcentajeOcupacion: 0 };
    }

    const bahiasTodas = await this.bahiaRepository.find({
      where: { idBahia: In(idsBahias) },
    });

    const bahias = bahiasTodas.filter((b) => b.estadoManual !== IotStatusEnum.DISABLED);

    const totalBahias = bahias.length;

    const bahiasOcupadas = bahias.filter(
      (b) =>
        b.estadoReconciliado === BahiaReconciliacionEstadoEnum.OCUPADO ||
        b.estadoReconciliado === BahiaReconciliacionEstadoEnum.DISCREPANCIA,
    ).length;

    const bahiasDisponibles = bahias.filter(
      (b) =>
        b.estadoReconciliado === BahiaReconciliacionEstadoEnum.LIBRE ||
        b.estadoReconciliado === BahiaReconciliacionEstadoEnum.TRANSITO,
    ).length;

    const porcentajeOcupacion =
      totalBahias > 0
        ? parseFloat(((bahiasOcupadas / totalBahias) * 100).toFixed(1))
        : 0;

    return { totalBahias, bahiasOcupadas, bahiasDisponibles, porcentajeOcupacion };
  }

  async marcarBahiaOfflinePorSensor(sensorId: string) {
    const codigo = String(sensorId ?? '').trim();
    if (!codigo) return;

    await this.bahiaRepository.manager.transaction(async (manager) => {
      const sensor = await manager.findOne(Sensor, {
        where: { codigo },
        lock: { mode: 'pessimistic_write' },
      });
      if (!sensor) return;

      const bahia = await manager.findOne(Bahia, {
        where: { idBahia: sensor.idBahia },
        lock: { mode: 'pessimistic_write' },
      });
      if (!bahia) return;

      bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.OFFLINE;
      bahia.ultimaTelemetriaAt = new Date();
      await manager.save(Bahia, bahia);

      this.eventosGateway.emitirBahiaModificada(
        {
          idBahia: `B-${bahia.idBahia}`,
          nuevoEstado: BahiaReconciliacionEstadoEnum.OFFLINE,
          actualizadoEn: new Date(),
        },
        { source: 'IOT' },
      );
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async liberarTransitoVencido() {
    const ahora = new Date();
    const umbral = new Date(ahora.getTime() - 5 * 60 * 1000);

    await this.bahiaRepository.manager.transaction(async (manager) => {
      const vencidas = await manager
        .createQueryBuilder(Bahia, 'bahia')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where('bahia.estado_reconciliado = :estado', { estado: BahiaReconciliacionEstadoEnum.TRANSITO })
        .andWhere('bahia.transito_desde IS NOT NULL')
        .andWhere('bahia.transito_desde <= :umbral', { umbral })
        .andWhere('(bahia.ultimo_fisico_ocupado IS NULL OR bahia.ultimo_fisico_ocupado = false)')
        .getMany();

      for (const bahia of vencidas) {
        bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.LIBRE;
        bahia.transitoDesde = null;
        bahia.discrepanciaDesde = null;
        await manager.save(Bahia, bahia);

        this.eventosGateway.emitirBahiaModificada(
          {
            idBahia: `B-${bahia.idBahia}`,
            nuevoEstado: BahiaReconciliacionEstadoEnum.LIBRE,
            actualizadoEn: new Date(),
          },
          { source: 'ADMIN' },
        );
      }
    });
  }
}
