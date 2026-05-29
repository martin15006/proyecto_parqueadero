import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Bahia } from './entities/bahia.entity';
import { ParqueaderoEstado } from './entities/parqueadero-estado.entity';
import { TipoBahia } from './entities/tipo-bahia.entity';
import { TipoControl } from './entities/tipo-control.entity';
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
    @InjectRepository(TipoBahia)
    private readonly tipoBahiaRepository: Repository<TipoBahia>,
    @InjectRepository(TipoControl)
    private readonly tipoControlRepository: Repository<TipoControl>,
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
   * Inicializa infraestructura mínima para entornos locales/demo:
   * - Si la tabla `bahia` está vacía, crea 30 bahías (Bahía 01..30).
   * - Si faltan catálogos base (tipo_bahia / tipo_control), crea registros por defecto.
   *
   * Importante:
   * - NO se fuerza `estadoManual=AVAILABLE` en DB, porque ese campo es un override manual.
   *   El estado "DISPONIBLE" se deriva automáticamente al no existir movimientos ADENTRO.
   */
  async onModuleInit() {
    try {
      const totalBahias = await this.bahiaRepository.count();
      if (totalBahias > 0) return;

      const tipoBahia = await this.getOrCreateTipoBahiaDefault();
      const tipoControl = await this.getOrCreateTipoControlDefault();

      const nuevas = Array.from({ length: 30 }, (_, idx) => {
        const numero = idx + 1;
        return this.bahiaRepository.create({
          nombreBahia: `Bahía ${String(numero).padStart(2, '0')}`,
          idTipoBahia: tipoBahia.idTipoB,
          idTipoControl: tipoControl.idTipoC,
          estadoManual: null,
        });
      });

      await this.bahiaRepository.save(nuevas);
      this.logger.log('Infraestructura inicial creada: 30 bahías (Bahía 01..30).');
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Error inicializando infraestructura por defecto de bahías.', stack);
    }
  }

  private async getOrCreateTipoBahiaDefault(): Promise<TipoBahia> {
    const defaultId = 1;
    if (Number.isInteger(defaultId) && defaultId > 0) {
      const byId = await this.tipoBahiaRepository.findOne({ where: { idTipoB: defaultId } });
      if (byId) return byId;
    }

    const [first] = await this.tipoBahiaRepository.find({ take: 1, order: { idTipoB: 'ASC' } });
    if (first) return first;

    return await this.tipoBahiaRepository.save(this.tipoBahiaRepository.create({ tipoBahia: 'Estándar' }));
  }

  private async getOrCreateTipoControlDefault(): Promise<TipoControl> {
    const defaultId = 1;
    if (Number.isInteger(defaultId) && defaultId > 0) {
      const byId = await this.tipoControlRepository.findOne({ where: { idTipoC: defaultId } });
      if (byId) return byId;
    }

    const [first] = await this.tipoControlRepository.find({ take: 1, order: { idTipoC: 'ASC' } });
    if (first) return first;

    return await this.tipoControlRepository.save(this.tipoControlRepository.create({ tipoControl: 'Manual' }));
  }

  /**
   * Retorna todas las bahías registradas con sus metadatos.
   */
  async findAll(): Promise<Bahia[]> {
    return await this.bahiaRepository.find({
      relations: ['tipoBahia', 'tipoControl'],
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

    const movimientosActivos = await this.movimientoRepository.find({
      where: [
        { idBahia: In(idsBahias), estado: EstadoMovimiento.ADENTRO },
        { idBahia: In(idsBahias), estado: EstadoMovimiento.TRANSITO },
      ],
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo'],
    });

    return bahias.map((b) => {
      const sensor = sensores.find((s) => s.idBahia === b.idBahia)!;
      const movimiento = movimientosActivos.find((m) => m.idBahia === b.idBahia);

      const estadoPanel = this.derivarEstadoPanel(b.estadoReconciliado, movimiento);

      return {
        idBahia: b.idBahia,
        nombreBahia: b.nombreBahia,
        tipoBahia: b.tipoBahia?.tipoBahia ?? 'Estándar',
        estadoReconciliado: b.estadoReconciliado,
        estadoSensor: sensor.estadoActual,
        estadoPanel,
        placa: movimiento?.registroVehiculo?.vehiculo?.placa ?? null,
        estadoMovimiento: movimiento?.estado ?? null,
        ultimaTelemetriaAt: b.ultimaTelemetriaAt,
      };
    });
  }

  /** Mapea estado físico + movimiento al valor visual que consume el frontend. */
  private derivarEstadoPanel(
    estadoReconciliado: BahiaReconciliacionEstadoEnum,
    movimiento: MovimientoVehiculo | undefined,
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
        // Bahía libre físicamente pero con movimiento en tránsito de salida.
        if (movimiento?.estado === EstadoMovimiento.TRANSITO && movimiento.idBahia != null) {
          return EstadoPanelEnum.SALIDA_PENDIENTE;
        }
        return EstadoPanelEnum.LIBRE;
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
      relations: ['tipoBahia', 'tipoControl'],
    });
    if (!bahia) throw new NotFoundException(`Bahía con ID ${id} no encontrada`);
    return bahia;
  }

  /**
   * Calcula el estado de ocupación global del parqueadero.
   * Utilizado para dashboards y sincronización realtime.
   */
  async obtenerOcupacion(): Promise<IOcupacionPayload> {
    const parqueadero = await this.getOrCreateParqueaderoEstado();
    const bahias = await this.bahiaRepository.find({
      relations: ['tipoBahia'],
    });
    
    // Obtenemos movimientos activos para cruzar con la infraestructura
    const movimientosActivos = await this.movimientoRepository.find({
      where: { estado: In([EstadoMovimiento.TRANSITO, EstadoMovimiento.ADENTRO]) },
      relations: ['registroVehiculo', 'registroVehiculo.vehiculo'],
    });

    const total = bahias.length;
    const ocupados = movimientosActivos.length;
    const parqueaderoDeshabilitado = Boolean(parqueadero.deshabilitado);
    const disponibles = total - ocupados;
    const estadoParqueadero: IOcupacionPayload['estadoParqueadero'] = parqueaderoDeshabilitado
      ? 'DESHABILITADO'
      : (disponibles <= 0 ? 'LLENO' : 'DISPONIBLE');

    return {
      total,
      ocupados,
      disponibles,
      parqueaderoDeshabilitado,
      estadoParqueadero,
      bahias: bahias.map(b => {
        const movimiento = movimientosActivos.find(m => m.idBahia === b.idBahia);
        
        const estadoAuto = !!movimiento ? IotStatusEnum.OCCUPIED : IotStatusEnum.AVAILABLE;
        const estadoManual = b.estadoManual ?? null;
        const estadoReconciliado = b.estadoReconciliado ?? BahiaReconciliacionEstadoEnum.LIBRE;

        const estadoFinal = parqueaderoDeshabilitado
          ? IotStatusEnum.DISABLED
          : (estadoManual === IotStatusEnum.AVAILABLE || estadoManual === IotStatusEnum.OCCUPIED || estadoManual === IotStatusEnum.DISABLED)
            ? estadoManual
            : this.mapReconciliacionToSocketEstado(estadoReconciliado) ?? estadoAuto;

        return {
          idBahia: b.idBahia,
          nombreBahia: b.nombreBahia,
          estado: estadoFinal,
          tipo: b.tipoBahia?.tipoBahia || 'Estándar',
        };
      }),
    };
  }

  async obtenerConteoGlobal() {
    const parqueadero = await this.getOrCreateParqueaderoEstado();
    const total = await this.bahiaRepository.count({
      where: { deletedAt: IsNull() },
    });

    const ocupados = await this.movimientoRepository.count({
      where: { estado: In([EstadoMovimiento.TRANSITO, EstadoMovimiento.ADENTRO]) },
    });

    const parqueaderoDeshabilitado = Boolean(parqueadero.deshabilitado);
    const disponibles = Math.max(total - ocupados, 0);

    const estadoParqueadero: 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO' = parqueaderoDeshabilitado
      ? 'DESHABILITADO'
      : (disponibles <= 0 ? 'LLENO' : 'DISPONIBLE');

    return {
      total,
      ocupados,
      disponibles,
      parqueaderoDeshabilitado,
      estadoParqueadero,
    };
  }

  private async getOrCreateParqueaderoEstado(): Promise<ParqueaderoEstado> {
    const existing = await this.parqueaderoEstadoRepository.findOne({ where: { id: 1 } }); // DISEÑO: el estado global vive en una fila fija (id=1).
    if (existing) return existing; // DISEÑO: si ya existe, se retorna sin modificar (evita resets accidentales).

    const created = this.parqueaderoEstadoRepository.create({
      id: 1, // DISEÑO: clave fija para un único estado global.
      deshabilitado: false, // RF14: por defecto el parqueadero inicia habilitado.
      motivo: null, // RF14: sin motivo cuando está habilitado.
      duracionEstimada: null, // RF14: sin duración cuando está habilitado.
      deshabilitadoDesde: null, // RF14: no aplica si no está deshabilitado.
      ultimoUmbralNotificado: 0, // RF13/RF39: no hay umbral notificado al iniciar.
    }); // RF14/RF39: inicializa campos necesarios sin romper el contrato existente.
    return await this.parqueaderoEstadoRepository.save(created); // PERSISTENCIA: garantiza que el estado exista para futuras validaciones.
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
    const parqueadero = await this.getOrCreateParqueaderoEstado(); // RF14: cargamos el estado actual antes de aplicar cambios.
    const anterior = parqueadero.deshabilitado; // RF14: guardamos el estado previo para auditoría y reglas de transición.
    const motivoAnterior = parqueadero.motivo; // RF14: guardamos el motivo previo para auditoría (brecha: sin motivo antes).
    const duracionAnterior = parqueadero.duracionEstimada; // RF14: guardamos duración previa para auditoría.

    const solicitadoDeshabilitar = Boolean(dto.deshabilitado); // RF14: normalizamos el booleano de entrada.

    if (solicitadoDeshabilitar) {
      const motivo = String(dto.motivo ?? '').trim(); // RF14: el motivo debe existir y no ser whitespace.
      if (!motivo.length) {
        throw new BadRequestException({ // RF14: se rechaza la operación si el admin no suministra el motivo obligatorio.
          message: 'Para deshabilitar el parqueadero debes indicar un motivo.', // RF14: mensaje semántico para UI.
          errorCode: 'MOTIVO_OBLIGATORIO', // RF14: código técnico para que frontend muestre un error específico.
        }); // RF14: evita deshabilitado “sin explicación” (brecha detectada).
      }

      parqueadero.deshabilitado = true; // RF14: activa bloqueo administrativo global.
      parqueadero.motivo = motivo; // RF14: persiste la razón (requisito explícito).
      parqueadero.duracionEstimada = dto.duracionEstimada ? String(dto.duracionEstimada).trim() : null; // RF14: persiste duración (si fue informada).
      parqueadero.deshabilitadoDesde = anterior ? parqueadero.deshabilitadoDesde : new Date(); // RF14: fija inicio del deshabilitado solo en transición false→true.
      parqueadero.ultimoUmbralNotificado = 0; // RF13/RF39: resetea umbrales porque el estado “operativo” cambia por administración.
    } else {
      parqueadero.deshabilitado = false; // RF14: levanta el bloqueo administrativo.
      parqueadero.motivo = null; // RF14: al habilitar, se limpia el motivo para no confundir a usuarios.
      parqueadero.duracionEstimada = null; // RF14: al habilitar, se limpia duración asociada al deshabilitado.
      parqueadero.deshabilitadoDesde = null; // RF14: ya no aplica.
      parqueadero.ultimoUmbralNotificado = 0; // RF13/RF39: reinicia el motor de alertas tras cambio administrativo.
    }

    const guardado = await this.parqueaderoEstadoRepository.save(parqueadero); // PERSISTENCIA: asegura que motivo/duración queden en BD (RF14).

    await this.auditoriaService.create({
      accion: 'CAMBIAR_ESTADO_PARQUEADERO', // RF37: acción auditada (trazabilidad).
      entidad: 'PARQUEADERO', // RF37: entidad lógica afectada.
      idEntidad: guardado.id, // RF37: referencia al registro global (id=1).
      datosAnteriores: {
        deshabilitado: anterior, // RF37: evidencia del valor anterior.
        motivo: motivoAnterior, // RF14/RF37: evidencia del motivo anterior (si existía).
        duracionEstimada: duracionAnterior, // RF14/RF37: evidencia de duración anterior.
      },
      datosNuevos: {
        deshabilitado: guardado.deshabilitado, // RF37: evidencia del nuevo valor.
        motivo: guardado.motivo, // RF14/RF37: evidencia del nuevo motivo.
        duracionEstimada: guardado.duracionEstimada, // RF14/RF37: evidencia de la nueva duración.
      },
      idUsuario: actor.idUsuario, // RF37: quién ejecutó el cambio (documento interno, no para logs públicos).
      ip: actor.ip, // RNF2: dato técnico para investigación de incidentes.
      userAgent: actor.userAgent, // RNF2: dato técnico para investigación de incidentes.
    });

    this.eventosGateway.emitirParqueaderoEstadoActualizado({
      deshabilitado: guardado.deshabilitado, // RF14: permite que frontends reaccionen (bloqueo/avisos).
      motivo: guardado.motivo ?? undefined, // RF14: se expone motivo al frontend para mostrar al usuario.
      duracionEstimada: guardado.duracionEstimada ?? undefined, // RF14: se expone duración (si existe) para informar.
      deshabilitadoDesde: guardado.deshabilitadoDesde ?? undefined, // RF14: se expone inicio del deshabilitado para contexto.
      fecha: new Date(), // RNF2: timestamp técnico del evento.
    });

    if (!anterior && guardado.deshabilitado) {
      const duracionTexto = guardado.duracionEstimada ? ` Duración estimada: ${guardado.duracionEstimada}.` : ''; // RF14: ensamblaje seguro del mensaje.

      this.eventosGateway.emitirAlertaParqueadero({
        tipo: 'PARQUEADERO_DESHABILITADO', // RF13/RF39: alerta técnica para dashboards (evento websocket).
        mensaje: `Parqueadero deshabilitado. Motivo: ${guardado.motivo}.${duracionTexto}`, // RF14: mensaje listo para UI.
        fecha: new Date(), // RNF2: timestamp de alerta.
      });

      await this.notificacionesService.registrarParqueaderoDeshabilitadoBroadcast({
        motivo: guardado.motivo ?? 'Sin motivo', // RF14/RF25: motivo persistido en bandeja del usuario.
        duracionEstimada: guardado.duracionEstimada, // RF14/RF25: duración persistida (si existe).
        actorNombre: actor.nombre, // RF25: nombre del administrador requerido por criterio de aceptación.
      });
    }

    const [metricas, conteo] = await Promise.all([
      this.obtenerMetricasSensorizadas(),
      this.obtenerConteoGlobal(),
    ]);
    const estadoParqueaderoSocket: 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO' = conteo.parqueaderoDeshabilitado
      ? 'DESHABILITADO'
      : metricas.bahiasDisponibles <= 0 && metricas.totalBahias > 0 ? 'LLENO' : 'DISPONIBLE';
    this.eventosGateway.emitirConteoGlobalDisponibles({
      total: metricas.totalBahias,
      ocupados: metricas.bahiasOcupadas,
      disponibles: metricas.bahiasDisponibles,
      estadoParqueadero: estadoParqueaderoSocket,
      actualizadoEn: new Date(),
    });

    return guardado; // RF14: retorna el estado persistido para confirmación del admin.
  }

  /**
   * RF14/RF39: Valida de forma centralizada si se permite un ingreso (operativo o contingencia).
   * - Si está DESHABILITADO: se rechaza siempre.
   * - Si está LLENO: se rechaza hasta que ocurra una salida.
   *
   * RNF2: el mensaje de error es semántico y no incluye PII (no cédula, no tokens).
   */
  async validarIngresoPermitido() {
    const estado = await this.getOrCreateParqueaderoEstado(); // RF14: obtenemos bandera institucional antes de permitir ingreso.

    if (estado.deshabilitado) {
      const duracionTexto = estado.duracionEstimada ? ` Duración estimada: ${estado.duracionEstimada}.` : ''; // RF14: duración opcional.
      throw new ForbiddenException({ // RF14: bloqueo fulminante, el operativo no puede evadir la decisión administrativa.
        message: `Parqueadero deshabilitado. Motivo: ${estado.motivo ?? 'No especificado'}.${duracionTexto}`, // RF14: mensaje semántico para UI.
        errorCode: 'PARQUEADERO_DESHABILITADO', // RF14: código técnico para frontends.
      }); // RNF2: no incluye PII; solo razón institucional.
    }

    const ocupacion = await this.obtenerOcupacion(); // RF39: calculamos disponibilidad real para bloqueo por 100%.
    if (ocupacion.disponibles <= 0) {
      throw new BadRequestException({ // RF39: bloqueo reactivo cuando el parqueadero está lleno.
        message: 'Capacidad máxima alcanzada: el parqueadero está lleno.', // RF39: mensaje semántico para UI.
        errorCode: 'PARQUEADERO_LLENO', // RF39: código técnico para UI.
      }); // RF39: evita ingresos adicionales hasta que ocurra una salida.
    }
  }

  /**
   * RF13/RF39: Evalúa umbrales 80% y 100% y emite alertas websocket evitando spam.
   * - Se recomienda invocar después de cada ingreso/salida (sincronización de ocupación).
   */
  async evaluarAlertasOcupacion() {
    const estado = await this.getOrCreateParqueaderoEstado(); // RF39: consultamos memoria del último umbral notificado para evitar spam.
    if (estado.deshabilitado) {
      await this.resetUmbralSiNecesario(estado, 0); // RF39: si está deshabilitado, no tiene sentido alertar por ocupación.
      return; // RF39: salida temprana (no emite alertas de ocupación cuando está deshabilitado).
    }

    const ocupacion = await this.obtenerOcupacion(); // RF39: estado actual (total/ocupados/disponibles) ya calculado por backend.
    const total = ocupacion.total || 0; // RF39: total de bahías.
    const ocupados = ocupacion.ocupados || 0; // RF39: cantidad de bahías ocupadas.
    const porcentaje = total > 0 ? (ocupados / total) * 100 : 0; // RF39: porcentaje de ocupación para comparar con umbrales.

    const nuevoUmbral = porcentaje >= 100 ? 100 : porcentaje >= 80 ? 80 : 0; // RF13/RF39: normaliza el estado a 0/80/100.

    if (nuevoUmbral === 0) {
      await this.resetUmbralSiNecesario(estado, 0); // RF39: resetea memoria si bajó de 80%.
      return; // RF39: no emite alerta si no se cumple umbral.
    }

    if (estado.ultimoUmbralNotificado >= nuevoUmbral) return; // RF39: ya se notificó este umbral (evita alertas repetidas).

    estado.ultimoUmbralNotificado = nuevoUmbral; // RF39: persistimos el nuevo umbral notificado para mantener consistencia.
    await this.parqueaderoEstadoRepository.save(estado); // RF39: guardamos en BD para evitar spam tras reinicios.

    if (nuevoUmbral === 80) {
      this.eventosGateway.emitirAlertaParqueadero({
        tipo: 'UMBRAL_80', // RF13/RF39: alerta intermedia (>=80%).
        mensaje: 'Alerta: el parqueadero alcanzó el 80% de ocupación.', // RF13/RF39: mensaje claro para dashboards.
        fecha: new Date(), // RNF2: timestamp técnico.
      });
      return; // RF39: finaliza luego de emitir alerta del 80%.
    }

    this.eventosGateway.emitirAlertaParqueadero({
      tipo: 'PARQUEADERO_LLENO', // RF13/RF39: alerta crítica (100%).
      mensaje: 'Alerta: capacidad máxima alcanzada (100%). El parqueadero está lleno.', // RF13/RF39: mensaje claro para dashboards.
      fecha: new Date(), // RNF2: timestamp técnico.
    });
  }

  private async resetUmbralSiNecesario(estado: ParqueaderoEstado, valor: number) {
    if (estado.ultimoUmbralNotificado === valor) return; // RF39: evita escrituras innecesarias si ya está en el valor esperado.
    estado.ultimoUmbralNotificado = valor; // RF39: resetea o ajusta el umbral notificado.
    await this.parqueaderoEstadoRepository.save(estado); // RF39: persiste para coherencia entre instancias.
  }

  async forzarEstadoBahia(
    idBahia: number,
    estado: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED' | 'AUTO',
    actor: { idUsuario: string; ip?: string; userAgent?: string },
  ): Promise<Bahia> {
    const bahia = await this.bahiaRepository.findOne({ where: { idBahia }, relations: ['tipoBahia', 'tipoControl'] });
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

    const [metricasForzar, conteoForzar] = await Promise.all([
      this.obtenerMetricasSensorizadas(),
      this.obtenerConteoGlobal(),
    ]);
    const estadoForzar: 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO' = conteoForzar.parqueaderoDeshabilitado
      ? 'DESHABILITADO'
      : metricasForzar.bahiasDisponibles <= 0 && metricasForzar.totalBahias > 0 ? 'LLENO' : 'DISPONIBLE';
    this.eventosGateway.emitirConteoGlobalDisponibles({
      total: metricasForzar.totalBahias,
      ocupados: metricasForzar.bahiasOcupadas,
      disponibles: metricasForzar.bahiasDisponibles,
      estadoParqueadero: estadoForzar,
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

      const bahia = await this.seleccionarBahiaLibreParaTransito(manager);

      bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.TRANSITO;
      bahia.transitoDesde = new Date();
      bahia.discrepanciaDesde = null;
      await manager.save(Bahia, bahia);

      const movimiento = manager.create(MovimientoVehiculo, {
        horaIngreso: new Date(),
        idRegistroVehiculo: registro.idRegistroV,
        idBahia: bahia.idBahia,
        estado: EstadoMovimiento.TRANSITO,
        esManual: false,
      });
      const guardado = await manager.save(MovimientoVehiculo, movimiento);

      await this.auditoriaService.create({
        accion: 'PORTERIA_ESCANEO_TRANSITO',
        entidad: 'BAHIA',
        idEntidad: bahia.idBahia,
        idUsuario: 'SISTEMA',
        datosNuevos: {
          idUsuario,
          placa,
          idBahia: bahia.idBahia,
          estado: BahiaReconciliacionEstadoEnum.TRANSITO,
          idMovimiento: guardado.idMovimiento,
        },
      });

      this.eventosGateway.emitirBahiaModificada(
        {
          idBahia: `B-${bahia.idBahia}`,
          nuevoEstado: BahiaReconciliacionEstadoEnum.TRANSITO,
          actualizadoEn: new Date(),
        },
        { source: 'PORTERIA' },
      );

      return {
        ok: true,
        estado: 'TRANSITO',
        idBahia: bahia.idBahia,
        bahia: bahia.nombreBahia,
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

    let resultado = await ejecutarCiclo();

    // Guard de race condition: si una señal OCCUPIED desemboca en DISCREPANCIA en el
    // primer ciclo, es probable que el commit del QR de portería aún no haya terminado
    // (ventana típica: 100-400 ms). Se espera 350 ms FUERA de cualquier transacción
    // (sin locks activos) y se reintenta UNA vez. En el 2.º ciclo la bahía estará en
    // DISCREPANCIA, que está dentro de `puedeVincular`, por lo que si el TRANSITO ya
    // existe en BD se empareja y la bahía pasa a OCUPADO. Si sigue sin haber TRANSITO
    // el estado queda DISCREPANCIA definitiva (vehículo no autorizado).
    if (fisicoOcupado && resultado.estado === BahiaReconciliacionEstadoEnum.DISCREPANCIA) {
      this.logger.warn(
        `[IoT] sensor=${codigo} → bahía ${resultado.idBahia}: DISCREPANCIA en 1.er ciclo ` +
        `— posible race condition QR-portería. Reintentando en 350 ms…`,
      );
      await new Promise<void>((r) => setTimeout(r, 350));
      resultado = await ejecutarCiclo();
      this.logger.log(
        `[IoT] sensor=${codigo} → bahía ${resultado.idBahia}: estado tras reintento = ${resultado.estado}`,
      );
    }

    return resultado;
  }

  /**
   * Maneja la transición cuando el sensor reporta presencia física (OCCUPIED).
   *
   * ### Estados aceptados para vincular un movimiento flotante
   * | Estado bahía | Acción |
   * |---|---|
   * | `LIBRE` | Flujo IoT normal: vincula el TRANSITO flotante más antiguo. |
   * | `TRANSITO` | Bahía pre-reservada (portería legacy); cierra el tránsito. |
   * | `DISCREPANCIA` | Bahía en estado sucio (test anterior): intenta igualmente vincular. |
   * | `OFFLINE` | Sensor reconectado con objeto: DISCREPANCIA. |
   * | `OCUPADO` | Ya procesado; idempotente, no hace nada. |
   *
   * ### Búsqueda del movimiento flotante
   * Usa `findOne` con `IsNull()` de TypeORM (type-safe) en lugar de raw SQL
   * `'mov.id_bahia IS NULL'` que no garantiza traducción por NamingStrategy.
   * Ordena por `horaIngreso ASC` para tomar el más antiguo (FIFO).
   */
  private async manejarSensorOcupado(
    manager: EntityManager,
    bahia: Bahia,
    estadoActual: BahiaReconciliacionEstadoEnum,
    ahora: Date,
  ): Promise<void> {
    const TAG = `[IoT:OCCUPIED] Bahía ${bahia.idBahia}(${bahia.nombreBahia}) | estado=${estadoActual}`;
    this.logger.verbose(`${TAG} → evaluando transición`);

    const puedeVincular =
      estadoActual === BahiaReconciliacionEstadoEnum.LIBRE ||
      estadoActual === BahiaReconciliacionEstadoEnum.TRANSITO ||
      estadoActual === BahiaReconciliacionEstadoEnum.DISCREPANCIA;

    if (estadoActual === BahiaReconciliacionEstadoEnum.OCUPADO) {
      this.logger.verbose(`${TAG} → ya OCUPADO, idempotente — sin cambio`);
      return;
    }

    if (estadoActual === BahiaReconciliacionEstadoEnum.OFFLINE) {
      this.logger.warn(`${TAG} → OFFLINE con presencia física → DISCREPANCIA`);
      bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.DISCREPANCIA;
      bahia.discrepanciaDesde = bahia.discrepanciaDesde ?? ahora;
      return;
    }

    if (!puedeVincular) {
      this.logger.warn(`${TAG} → estado inesperado, sin acción`);
      return;
    }

    // Busca el movimiento flotante más reciente (TRANSITO sin bahía asignada).
    // "Más reciente" = el último QR escaneado en portería, que físicamente es el vehículo
    // que acaba de llegar al sensor. Orden DESC por horaIngreso.
    // IMPORTANTE: IsNull() garantiza traducción correcta por NamingStrategy de TypeORM;
    // raw SQL 'id_bahia IS NULL' puede fallar según la versión del driver.
    const movimientoFlotante = await manager.findOne(MovimientoVehiculo, {
      where: {
        estado: EstadoMovimiento.TRANSITO,
        idBahia: IsNull(),
      },
      order: { horaIngreso: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });

    if (movimientoFlotante) {
      this.logger.verbose(
        `${TAG} → movimiento flotante encontrado id=${movimientoFlotante.idMovimiento} ` +
        `(registroV=${movimientoFlotante.idRegistroVehiculo}) → asignando bahía y pasando a ADENTRO`,
      );

      movimientoFlotante.idBahia = bahia.idBahia;
      movimientoFlotante.estado = EstadoMovimiento.ADENTRO;
      await manager.save(MovimientoVehiculo, movimientoFlotante);

      bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.OCUPADO;
      bahia.transitoDesde = null;
      bahia.discrepanciaDesde = null;

      this.logger.verbose(`${TAG} → ✓ LIBRE→OCUPADO | idMovimiento=${movimientoFlotante.idMovimiento}`);
    } else {
      // Sin QR escaneado previo → vehículo no autorizado
      this.logger.warn(
        `${TAG} → sin movimiento TRANSITO flotante en DB. ` +
        `Posibles causas: (1) QR no escaneado, (2) race condition si el HTTP aún no hizo commit, ` +
        `(3) el movimiento ya fue asignado a otra bahía.`,
      );

      bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.DISCREPANCIA;
      bahia.discrepanciaDesde = bahia.discrepanciaDesde ?? ahora;

      this.eventosGateway.emitirAlertaParqueadero({
        tipo: 'DISCREPANCIA_OCUPACION_SIN_PORTERIA',
        mensaje: `Discrepancia: ${bahia.nombreBahia} ocupada físicamente sin tránsito autorizado en portería.`,
        fecha: ahora,
      });
    }
  }

  /**
   * Maneja la transición cuando el sensor reporta bahía vacía (AVAILABLE).
   *
   * - `OCUPADO` + movimiento ADENTRO → vehículo se retiró; mueve a TRANSITO de salida.
   *   La bahía queda LIBRE de inmediato (fisicamente disponible).
   *   El operario en portería debe confirmar la salida con `registrarSalida`.
   * - `OCUPADO` sin movimiento ADENTRO → reconciliación directa a LIBRE.
   * - `DISCREPANCIA` → se resuelve como LIBRE.
   */
  private async manejarSensorLibre(
    manager: EntityManager,
    bahia: Bahia,
    estadoActual: BahiaReconciliacionEstadoEnum,
    ahora: Date,
  ): Promise<void> {
    const TAG = `[IoT:AVAILABLE] Bahía ${bahia.idBahia}(${bahia.nombreBahia}) | estado=${estadoActual}`;
    this.logger.verbose(`${TAG} → evaluando transición`);

    if (estadoActual === BahiaReconciliacionEstadoEnum.OCUPADO) {
      const movimientoAdentro = await manager.findOne(MovimientoVehiculo, {
        where: { idBahia: bahia.idBahia, estado: EstadoMovimiento.ADENTRO },
        lock: { mode: 'pessimistic_write' },
      });

      if (movimientoAdentro) {
        this.logger.verbose(
          `${TAG} → vehículo retirado físicamente (idMovimiento=${movimientoAdentro.idMovimiento}) → OCUPADO→LIBRE + movimiento→TRANSITO salida`,
        );
        movimientoAdentro.estado = EstadoMovimiento.TRANSITO;
        await manager.save(MovimientoVehiculo, movimientoAdentro);

        this.eventosGateway.emitirAlertaParqueadero({
          tipo: 'SALIDA_FISICA_PENDIENTE_CONFIRMACION',
          mensaje: `${bahia.nombreBahia}: vehículo retirado físicamente, pendiente confirmación en portería.`,
          fecha: ahora,
        });
      } else {
        this.logger.verbose(`${TAG} → OCUPADO sin movimiento ADENTRO → reconciliación directa a LIBRE`);
      }

      bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.LIBRE;
      bahia.discrepanciaDesde = null;
    } else if (estadoActual === BahiaReconciliacionEstadoEnum.DISCREPANCIA) {
      this.logger.log(`${TAG} → DISCREPANCIA resuelta → LIBRE`);
      bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.LIBRE;
      bahia.discrepanciaDesde = null;
    } else if (estadoActual === BahiaReconciliacionEstadoEnum.TRANSITO) {
      this.logger.log(`${TAG} → TRANSITO sin confirmación física → LIBRE (vehículo abandonó)`);
      bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.LIBRE;
      bahia.transitoDesde = null;
    } else {
      this.logger.debug(`${TAG} → sin transición (${estadoActual} es idempotente en AVAILABLE)`);
    }
    // LIBRE y OFFLINE no se modifican.
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

        const movimientoTransito = await manager.findOne(MovimientoVehiculo, {
          where: { idBahia: bahia.idBahia, estado: EstadoMovimiento.TRANSITO },
          order: { horaIngreso: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        });
        if (movimientoTransito) {
          movimientoTransito.estado = EstadoMovimiento.ANULADO;
          movimientoTransito.horaSalida = ahora;
          await manager.save(MovimientoVehiculo, movimientoTransito);
        }

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

  private async seleccionarBahiaLibreParaTransito(manager: EntityManager): Promise<Bahia> {
    const disponible = await manager
      .createQueryBuilder(Bahia, 'bahia')
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked')
      .where('bahia.deleted_at IS NULL')
      .andWhere('(bahia.estado_manual IS NULL OR bahia.estado_manual <> :manualDisabled)', { manualDisabled: IotStatusEnum.DISABLED })
      .andWhere('bahia.estado_reconciliado = :estado', { estado: BahiaReconciliacionEstadoEnum.LIBRE })
      .andWhere((qb: any) => {
        const subQuery = qb
          .subQuery()
          .select('mov.id_bahia')
          .from(MovimientoVehiculo, 'mov')
          .where('mov.estado IN (:...estados)', { estados: [EstadoMovimiento.TRANSITO, EstadoMovimiento.ADENTRO] })
          .andWhere('mov.deleted_at IS NULL')
          .getQuery();
        return 'bahia.id_bahia NOT IN ' + subQuery;
      })
      .getOne();

    if (!disponible) {
      throw new BadRequestException({
        message: 'Capacidad máxima alcanzada: no hay bahías disponibles para tránsito.',
        errorCode: 'SIN_BAHIAS_DISPONIBLES',
      });
    }

    return disponible;
  }

}
