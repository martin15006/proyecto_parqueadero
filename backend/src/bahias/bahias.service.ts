import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Bahia } from './entities/bahia.entity';
import { ParqueaderoEstado } from './entities/parqueadero-estado.entity';
import { MovimientoVehiculo, EstadoMovimiento } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { IOcupacionPayload } from '../common/interfaces/socket-payloads.interface';
import { IotStatusEnum } from '../common/enums/iot-status.enum';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EventosGateway } from '../gateway/eventos.gateway';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { Sensor } from '../telemetria/entities/sensor.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';
import { BahiaReconciliacionEstadoEnum } from '../common/enums/bahia-reconciliacion-estado.enum';

/**
 * Estado visual calculado para cada bahía sensorizada en el Panel Operativo.
 * Combina el estado físico del sensor con el estado lógico del movimiento activo.
 */
export enum EstadoPanelEnum {
  /** Bahía vacía y sensor operativo. */
  LIBRE = 'LIBRE',
  /** Vehículo físicamente presente y movimiento ADENTRO registrado. */
  OCUPADO = 'OCUPADO',
  /** Vehículo retirado físicamente; operario aún no confirmó salida en portería. */
  SALIDA_PENDIENTE = 'SALIDA_PENDIENTE',
  /** Inconsistencia entre sensor e historial lógico. */
  DISCREPANCIA = 'DISCREPANCIA',
  /** Sensor sin reporte (heartbeat fallido). */
  OFFLINE = 'OFFLINE',
  /** Bahía deshabilitada manualmente por administración. */
  DESHABILITADO = 'DESHABILITADO',
}

/** Shape tipado de cada bahía devuelta por `obtenerBahiasSensorizadas`. */
export interface BahiaSensorizadaDto {
  idBahia: number;
  nombreBahia: string;
  tipoBahia: string;
  estadoReconciliado: BahiaReconciliacionEstadoEnum;
  estadoSensor: IotStatusEnum;
  /** Estado calculado listo para renderizar en el panel sin lógica adicional. */
  estadoPanel: EstadoPanelEnum;
  /** Placa del vehículo asociado al movimiento activo (null si la bahía está libre). */
  placa: string | null;
  /** Estado del movimiento vigente (null si no hay movimiento activo). */
  estadoMovimiento: EstadoMovimiento | null;
  ultimaTelemetriaAt: Date | null;
}

/**
 * Servicio encargado de la gestión de la infraestructura física (Bahías).
 * Proporciona información de disponibilidad y ocupación en tiempo real.
 */
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

  /**
   * Mantenimiento en el arranque: cierra movimientos ADENTRO huérfanos de sesiones
   * anteriores. Las bahías sensorizadas (B-001..B-003) las siembra InfraestructuraSeedService.
   */
  async onModuleInit() {
    try {
      // Cerrar movimientos ADENTRO sin bahía asignada que lleven más de 8 horas activos.
      // Estos son registros huérfanos de sesiones anteriores (reinicio del servidor,
      // salida sin escaneo de QR). Evita que bloqueen re-ingresos en la sesión actual.
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

  /**
   * Retorna todas las bahías registradas con sus metadatos.
   */
  async findAll(): Promise<Bahia[]> {
    return await this.bahiaRepository.find({
      relations: ['tipoBahia'],
    });
  }

  /**
   * Devuelve únicamente las bahías que tienen un sensor **activo** asociado,
   * enriquecidas con el estado del movimiento vigente.
   *
   * Es la fuente de verdad que debe usar el Panel Operativo para renderizar el
   * mapa físico del parqueadero, ya que filtra las bahías manuales o sin hardware.
   *
   * ### Cálculo del `estadoPanel`
   * | `estadoReconciliado` | Movimiento activo | `estadoPanel` |
   * |---|---|---|
   * | `OCUPADO` | `ADENTRO` | `'OCUPADO'` |
   * | `LIBRE` | `TRANSITO` (con bahía) | `'SALIDA_PENDIENTE'` |
   * | `LIBRE` | ninguno | `'LIBRE'` |
   * | `OFFLINE` / `DISCREPANCIA` / `DESHABILITADO` | cualquiera | refleja el estado |
   */
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
      const estadoPanel = this.derivarEstadoPanel(b.estadoReconciliado);

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

  /** Mapea estado físico al valor visual que consume el frontend. */
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

  /**
   * Busca una bahía específica por su ID.
   */
  async findOne(id: number): Promise<Bahia> {
    const bahia = await this.bahiaRepository.findOne({
      where: { idBahia: id },
      relations: ['tipoBahia'],
    });
    if (!bahia) throw new NotFoundException(`Bahía con ID ${id} no encontrada`);
    return bahia;
  }

  /**
   * Calcula el estado de ocupación global del parqueadero.
   *
   * Reglas:
   *  - `total`     = bahías físicas (con sensor activo). Cupo máximo real.
   *  - `ocupados`  = cantidad de QRs escaneados ACTIVOS (movimientos
   *                  con estado ADENTRO o TRANSITO).
   *                  Al escanear QR de entrada se crea un movimiento → sube.
   *                  Al escanear QR de salida se cierra el movimiento → baja.
   *  - `disponibles` = total - ocupados (mínimo 0).
   *  - `LLENO`     = ocupados >= total.
   *
   * Nota: los sensores físicos NO afectan el contador de ocupados;
   *       solo se usan para el mapa visual y para definir el total real.
   */
  async obtenerOcupacion(): Promise<IOcupacionPayload> {
    const parqueadero = await this.getOrCreateParqueaderoEstado();

    // Total = solo bahías con sensor activo (cupo físico real).
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

    // Movimientos activos = QRs escaneados que aún no han salido.
    const movimientosActivos = await this.movimientoRepository.find({
      where: { estado: In([EstadoMovimiento.TRANSITO, EstadoMovimiento.ADENTRO]) },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo'],
    });

    const parqueaderoDeshabilitado = Boolean(parqueadero.deshabilitado);

    const total = bahias.length;
    const ocupados = movimientosActivos.length;
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
    // Reutilizamos obtenerOcupacion() para mantener una única fuente de verdad:
    // ocupados = bahías físicamente ocupadas (sensores), no QRs escaneados.
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
    // El estado global vive en una fila fija (id=1); si ya existe se retorna sin
    // modificar para evitar resets accidentales.
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

  /**
   * RF14: Actualiza el estado global del parqueadero (habilitado/deshabilitado) con motivo y duración.
   *
   * Reglas RF14:
   * - Si se deshabilita, el `motivo` es obligatorio.
   * - La `duracionEstimada` es opcional, pero si viene se persiste y se comunica.
   *
   * Reglas RF25:
   * - Si se deshabilita, se registra una notificación visible para aprendices incluyendo el nombre del admin.
   */
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
      // Fija el inicio del deshabilitado solo en la transición false→true.
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

  /**
   * Valida si se permite un ingreso.
   * - Si está DESHABILITADO: se rechaza siempre.
   * - Si la cantidad de QRs escaneados activos (movimientos ADENTRO/TRANSITO)
   *   iguala o supera el total de bahías: se rechaza con alerta de "lleno".
   *
   * Esto controla la ocupación por CONTEO DE QR, no por sensores físicos:
   * cada ingreso suma 1, cada salida resta 1. Cuando llega al 100%, no entra nadie.
   */
  async validarIngresoPermitido() {
    const estado = await this.getOrCreateParqueaderoEstado();

    if (estado.deshabilitado) {
      const duracionTexto = estado.duracionEstimada ? ` Duración estimada: ${estado.duracionEstimada}.` : '';
      throw new ForbiddenException({
        message: `Parqueadero deshabilitado. Motivo: ${estado.motivo ?? 'No especificado'}.${duracionTexto}`,
        errorCode: 'PARQUEADERO_DESHABILITADO',
      });
    }

    // Conteo basado en QRs escaneados activos (movimientos ADENTRO/TRANSITO).
    // Cada QR de entrada suma 1 al contador, cada QR de salida resta 1.
    const conteo = await this.obtenerConteoGlobal();

    if (conteo.total > 0 && conteo.ocupados >= conteo.total) {
      // Disparar alerta de ocupación máxima inmediatamente (antes de rechazar)
      try {
        await this.evaluarAlertasOcupacion();
      } catch (_) { /* no bloquear por fallo en notificación */ }

      throw new BadRequestException({
        message: 'Capacidad máxima alcanzada: el parqueadero está lleno. No se permiten más ingresos hasta que ocurra una salida.',
        errorCode: 'PARQUEADERO_LLENO',
      });
    }
  }

  /**
   * RF13/RF39: Evalúa umbrales 80% y 100% y emite alertas websocket evitando spam.
   * - Se recomienda invocar después de cada ingreso/salida (sincronización de ocupación).
   */
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

    // Memoria del último umbral notificado: evita re-emitir el mismo umbral (anti-spam),
    // persistida en BD para sobrevivir reinicios.
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
    try {
      await this.notificacionesService.notificarAdmins({
        tipo: 'PARQUEADERO_LLENO',
        titulo: 'Parqueadero LLENO',
        mensaje: `Capacidad máxima alcanzada (${ocupados}/${total} bahías ocupadas). Ya no se permiten más ingresos hasta que ocurra una salida.`,
        metadata: { ocupados, total, porcentaje: 100 },
      });
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

  /**
   * Punto de entrada de toda señal IoT proveniente del `SerialBridgeService`.
   *
   * ## Máquina de estados (flujo IoT completo)
   *
   * ### Ingreso
   * ```
   * QR scan → MovimientoVehiculo(TRANSITO, idBahia=null)
   *   ↓  sensor dispara OCCUPIED
   * procesarTelemetriaSensor(LIBRE → ocupado)
   *   → vincula movimiento flotante más antiguo a esta bahía
   *   → Movimiento: TRANSITO → ADENTRO
   *   → Bahía:      LIBRE    → OCUPADO
   * ```
   *
   * ### Salida
   * ```
   * Vehículo se retira físicamente
   *   ↓  sensor dispara AVAILABLE
   * procesarTelemetriaSensor(OCUPADO → libre)
   *   → Movimiento: ADENTRO → TRANSITO  (idBahia conservado — señal para operario)
   *   → Bahía:      OCUPADO → LIBRE     (el espacio queda físicamente disponible)
   *   ↓  operario escanea en portería → registrarSalida()
   *   → Movimiento: TRANSITO → SALIDA
   * ```
   *
   * @param sensorId      Código del sensor (p.ej. `SN-001`).
   * @param fisicoOcupado `true` cuando la distancia cae en `[3, 12)` cm (OCCUPIED),
   *                      `false` cuando supera los 12 cm (AVAILABLE).
   *                      Los rangos exactos los calcula {@link SerialBridgeService.handleLine}.
   */
  async procesarTelemetriaSensor(sensorId: string, fisicoOcupado: boolean) {
    const codigo = String(sensorId ?? '').trim();
    if (!codigo) {
      throw new BadRequestException({
        message: 'El sensorId es obligatorio.',
        errorCode: 'SENSOR_OBLIGATORIO',
      });
    }

    this.logger.verbose(`[IoT] → procesarTelemetriaSensor  sensor=${codigo}  fisicoOcupado=${fisicoOcupado}`);

    /**
     * Cierre reutilizable que encapsula un ciclo completo de la máquina de estados:
     * - Lectura con lock pesimista de sensor + bahía.
     * - Transición de estado vía `manejarSensorOcupado` / `manejarSensorLibre`.
     * - Persistencia y emisión WebSocket.
     *
     * Se llama dos veces cuando se detecta un posible race condition entre el
     * escaneo de QR en portería (HTTP) y la señal OCCUPIED del sensor (serial):
     *   1.er ciclo → DISCREPANCIA (TRANSITO aún no committed)
     *   350 ms de espera FUERA de la transacción (sin locks activos)
     *   2.º ciclo → OCUPADO (TRANSITO ya disponible en BD) o DISCREPANCIA definitiva
     */
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

    // Emitir conteo global sensorizado tras cada evento de sensor para que los KPIs
    // del panel se actualicen sin esperar a una operación de portería.
    // El gateway deduplica `bahia_modificada` por estado; aquí siempre emitimos el
    // conteo porque un cambio de estado de bahía puede no coincidir con operaciones
    // de portería y el frontend necesita los KPIs actualizados.
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

  /**
   * Sensor reporta presencia física (OCCUPIED).
   *
   * El sensor es la fuente de verdad exclusiva del estado físico de la bahía.
   * No existe vinculación con movimientos: QR de portería y sensor son independientes.
   *
   * Transiciones:
   * - `OCUPADO`      → idempotente, sin cambio.
   * - `DESHABILITADO`→ el admin tiene prioridad, sin cambio.
   * - cualquier otro → `OCUPADO`.
   */
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

  /**
   * Sensor reporta bahía vacía (AVAILABLE).
   *
   * El sensor es la fuente de verdad exclusiva del estado físico de la bahía.
   * No existe vinculación con movimientos: QR de portería y sensor son independientes.
   *
   * Transiciones:
   * - `LIBRE`        → idempotente, sin cambio.
   * - `DESHABILITADO`→ el admin tiene prioridad, sin cambio.
   * - cualquier otro → `LIBRE`.
   */
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

  /**
   * Calcula las métricas de ocupación basadas **únicamente** en las bahías que
   * tienen un sensor activo registrado en la tabla `sensor`.
   *
   * Fórmulas:
   * - `totalBahias`          = COUNT bahías con sensor activo.
   * - `bahiasOcupadas`       = bahías en estado `OCUPADO` o `DISCREPANCIA`.
   * - `bahiasDisponibles`    = bahías en estado `LIBRE` o `TRANSITO`.
   * - `porcentajeOcupacion`  = (ocupadas / total) × 100, redondeado a 1 decimal.
   */
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

    const bahias = await this.bahiaRepository.find({
      where: { idBahia: In(idsBahias) },
    });

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
