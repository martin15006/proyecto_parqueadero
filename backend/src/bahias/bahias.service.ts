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

    const conteo = await this.obtenerConteoGlobal();
    this.eventosGateway.emitirConteoGlobalDisponibles({
      ...conteo,
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

    const conteo = await this.obtenerConteoGlobal();
    this.eventosGateway.emitirConteoGlobalDisponibles({
      ...conteo,
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

  async procesarTelemetriaSensor(sensorId: string, fisicoOcupado: boolean) {
    const codigo = String(sensorId ?? '').trim();
    if (!codigo) {
      throw new BadRequestException({
        message: 'El sensorId es obligatorio.',
        errorCode: 'SENSOR_OBLIGATORIO',
      });
    }

    return await this.bahiaRepository.manager.transaction(async (manager) => {
      const sensor = await manager.findOne(Sensor, {
        where: { codigo },
        lock: { mode: 'pessimistic_write' },
      });
      if (!sensor) {
        throw new NotFoundException('Sensor no registrado.');
      }

      const bahia = await manager.findOne(Bahia, {
        where: { idBahia: sensor.idBahia },
        lock: { mode: 'pessimistic_write' },
      });
      if (!bahia) {
        throw new NotFoundException('Bahía asociada al sensor no encontrada.');
      }

      const ahora = new Date();
      bahia.ultimaTelemetriaAt = ahora;
      bahia.ultimoFisicoOcupado = Boolean(fisicoOcupado);

      const estadoActual = bahia.estadoReconciliado ?? BahiaReconciliacionEstadoEnum.LIBRE;

      if (fisicoOcupado) {
        if (estadoActual === BahiaReconciliacionEstadoEnum.TRANSITO) {
          bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.OCUPADO;
          bahia.transitoDesde = null;

          const movimientoTransito = await manager.findOne(MovimientoVehiculo, {
            where: { idBahia: bahia.idBahia, estado: EstadoMovimiento.TRANSITO },
            order: { horaIngreso: 'DESC' },
            lock: { mode: 'pessimistic_write' },
          });

          if (movimientoTransito) {
            movimientoTransito.estado = EstadoMovimiento.ADENTRO;
            await manager.save(MovimientoVehiculo, movimientoTransito);
          }
        } else if (estadoActual === BahiaReconciliacionEstadoEnum.LIBRE) {
          bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.DISCREPANCIA;
          bahia.discrepanciaDesde = bahia.discrepanciaDesde ?? ahora;

          this.eventosGateway.emitirAlertaParqueadero({
            tipo: 'DISCREPANCIA_OCUPACION_SIN_PORTERIA',
            mensaje: `Discrepancia detectada: Bahía ${bahia.nombreBahia} ocupada físicamente sin registro de portería.`,
            fecha: ahora,
          });
        } else if (estadoActual === BahiaReconciliacionEstadoEnum.OFFLINE) {
          bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.DISCREPANCIA;
          bahia.discrepanciaDesde = bahia.discrepanciaDesde ?? ahora;
        }
      } else {
        if (estadoActual === BahiaReconciliacionEstadoEnum.OCUPADO) {
          const activoLogico = await manager.findOne(MovimientoVehiculo, {
            where: { idBahia: bahia.idBahia, estado: EstadoMovimiento.ADENTRO },
            lock: { mode: 'pessimistic_write' },
          });

          if (activoLogico) {
            bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.DISCREPANCIA;
            bahia.discrepanciaDesde = bahia.discrepanciaDesde ?? ahora;

            this.eventosGateway.emitirAlertaParqueadero({
              tipo: 'DISCREPANCIA_SALIDA_FISICA_SIN_PORTERIA',
              mensaje: `Discrepancia detectada: Bahía ${bahia.nombreBahia} quedó libre físicamente sin salida registrada en portería.`,
              fecha: ahora,
            });
          } else {
            bahia.estadoReconciliado = BahiaReconciliacionEstadoEnum.LIBRE;
            bahia.discrepanciaDesde = null;
          }
        }
      }

      const guardada = await manager.save(Bahia, bahia);

      this.eventosGateway.emitirBahiaModificada(
        {
          idBahia: `B-${guardada.idBahia}`,
          nuevoEstado: guardada.estadoReconciliado,
          actualizadoEn: new Date(),
        },
        { source: 'IOT' },
      );

      return {
        ok: true,
        idBahia: guardada.idBahia,
        estado: guardada.estadoReconciliado,
      };
    });
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
