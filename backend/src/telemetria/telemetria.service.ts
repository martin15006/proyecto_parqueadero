import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Sensor } from './entities/sensor.entity';
import { TelemetriaEvento } from './entities/telemetria-evento.entity';
import { AlertaSistema } from './entities/alerta-sistema.entity';
import { EventosGateway } from '../gateway/eventos.gateway';
import { BahiasService } from '../bahias/bahias.service';
import { TelemetryPayloadDto } from './dto/telemetry-payload.dto';
import { IotStatusEnum } from '../common/enums/iot-status.enum';

@Injectable()
export class TelemetriaService {
  private readonly logger = new Logger(TelemetriaService.name);
  
  // ESTRATEGIA ANTI-SATURACIÓN: Almacena en memoria el último estado reportado por cada sensor
  private cacheLecturas: Map<string, { status: IotStatusEnum; timestamp: number }> = new Map();

  constructor(
    @InjectRepository(Sensor)
    private readonly sensorRepository: Repository<Sensor>,
    @InjectRepository(TelemetriaEvento)
    private readonly eventoRepository: Repository<TelemetriaEvento>,
    @InjectRepository(AlertaSistema)
    private readonly alertaRepository: Repository<AlertaSistema>,
    private readonly gateway: EventosGateway,
    private readonly bahiasService: BahiasService,
  ) {}

  /**
   * Procesa la telemetría enviada por el hardware.
   *
   * ### Separación throttle / lógica de negocio (FIX crítico)
   *
   * El throttle **solo suprime la escritura del sensor en DB** cuando el estado
   * no cambia en menos de 30 s.  La llamada a `gestionarImpactoOperativo` ocurre
   * **siempre**, porque el estado de la bahía puede haber cambiado a nivel lógico
   * (p. ej. QR escaneado mientras el sensor ya estaba en OCCUPIED en caché) y la
   * máquina de estados de `BahiasService` necesita verlo para vincular el movimiento
   * flotante al espacio físico.
   *
   * Sin esta separación el pipeline queda mudo en cualquier test repetido dentro de
   * la ventana de 30 s.
   */
  async procesarLectura(dto: TelemetryPayloadDto) {
    const { sensorId, status, battery, rssi } = dto;

    // Throttle: ¿escribir en DB el registro del sensor?
    const ultimaLectura = this.cacheLecturas.get(sensorId);
    const tiempoTranscurrido = ultimaLectura ? Date.now() - ultimaLectura.timestamp : Infinity;
    const mismoEstado = ultimaLectura?.status === status;
    const dentroVentana = tiempoTranscurrido < 30_000;
    const omitirDbSensor = mismoEstado && dentroVentana;

    this.logger.debug(
      `[Telemetría] ${sensorId} | ${status} | mismo=${mismoEstado} | ${Math.round(tiempoTranscurrido / 1000)}s | omitirDB=${omitirDbSensor}`,
    );

    // Localizar sensor siempre (necesario para `gestionarImpactoOperativo`)
    const sensor = await this.sensorRepository.findOne({ where: { codigo: sensorId } });
    if (!sensor) {
      this.logger.error(`[IOT ERROR] Sensor no registrado: ${sensorId}`);
      throw new BadRequestException('Dispositivo IoT no reconocido');
    }

    if (!omitirDbSensor) {
      // Escribir en DB solo cuando hay cambio real o venció la ventana
      const estadoAnterior = sensor.estadoActual;
      sensor.estadoActual = status;
      sensor.bateria = battery ?? sensor.bateria;
      sensor.ultimaLectura = new Date();
      sensor.metadata = { ...sensor.metadata, rssi, lastUpdate: sensor.ultimaLectura };
      await this.sensorRepository.save(sensor);

      this.cacheLecturas.set(sensorId, { status, timestamp: Date.now() });

      const evento = this.eventoRepository.create({
        idSensor: sensor.idSensor,
        tipoEvento: status,
        payload: { battery, rssi, previousStatus: estadoAnterior },
      });
      await this.eventoRepository.save(evento);
    } else {
      // Actualizamos el objeto en memoria para que gestionarImpactoOperativo tenga el estado correcto
      sensor.estadoActual = status;
    }

    // Lógica de negocio SIEMPRE: permite detectar nuevos movimientos flotantes
    // incluso cuando el status del sensor no cambió (OCCUPIED repetido con nuevo QR escaneado)
    await this.gestionarImpactoOperativo(sensor, status);

    return { ok: true, mensaje: omitirDbSensor ? 'Telemetría procesada (DB omitida por throttle)' : 'Telemetría procesada exitosamente' };
  }

  /**
   * Determina las acciones a tomar según el nuevo estado del sensor.
   * REALTIME_EMIT: Notifica al frontend sobre cambios críticos.
   */
  private async gestionarImpactoOperativo(sensor: Sensor, status: IotStatusEnum) {
    await this.bahiasService.procesarTelemetriaSensor(
      sensor.codigo,
      status === IotStatusEnum.OCCUPIED,
    );

    // REALTIME_EMIT: Alertas críticas por falla de hardware
    if (status === IotStatusEnum.ERROR) {
      const mensaje = `¡ALERTA TÉCNICA! El sensor ${sensor.codigo} (Bahía ${sensor.idBahia}) reporta un error crítico.`;
      
      await this.registrarAlertaSistema('FALLA_HARDWARE', mensaje);
      
      this.gateway.emitirAlertaParqueadero({
        tipo: 'ERROR_IOT',
        mensaje,
        fecha: new Date(),
      });
    }

    return;
  }

  /**
   * Persiste una alerta crítica en el historial del sistema.
   */
  private async registrarAlertaSistema(tipo: string, mensaje: string) {
    const alerta = this.alertaRepository.create({ tipo, mensaje });
    await this.alertaRepository.save(alerta);
  }

  /**
   * Simulador (DEMO): Registra una alerta y la emite en tiempo real.
   * Se utiliza para presentaciones locales cuando no hay hardware conectado, pero se desea demostrar RF14.
   */
  async simularAlertaSistema(tipo: string, mensaje: string) {
    await this.registrarAlertaSistema(tipo, mensaje);
    this.gateway.emitirAlertaParqueadero({
      tipo,
      mensaje,
      fecha: new Date(),
    });
  }

  /**
   * Tarea programada para detectar dispositivos que han dejado de reportar.
   * REALTIME_EMIT: Notifica cuando un sensor pasa a estado OFFLINE.
   */
  /**
   * Monitorización automática de salud de sensores.
   * PERFORMANCE: Se ejecuta cada minuto para detectar dispositivos desconectados.
   * Compara la última lectura con el tiempo actual menos 60 segundos.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async monitorizarSensores() {
    this.logger.log('Iniciando monitoreo de salud de sensores IoT...');

    // 1. Definir el umbral de desconexión (60 segundos)
    const umbral = new Date();
    umbral.setSeconds(umbral.getSeconds() - 60);

    // 2. Buscar sensores que no han reportado en el último minuto y están ONLINE o OCCUPIED
     const sensoresInactivos = await this.sensorRepository.find({
       where: {
         ultimaLectura: LessThan(umbral),
         estadoActual: Not(IotStatusEnum.OFFLINE), // Solo sensores que estaban activos
       },
     });

    if (sensoresInactivos.length === 0) {
      this.logger.log('Todos los sensores están reportando correctamente.');
      return { ok: true, mensaje: 'Salud de infraestructura óptima' };
    }

    this.logger.warn(`Se detectaron ${sensoresInactivos.length} sensores sin reporte. Marcando como OFFLINE.`);

    // 3. Procesar desconexiones de forma controlada
    for (const sensor of sensoresInactivos) {
      const estadoAnterior = sensor.estadoActual;
      
      // Actualizar estado en DB
      sensor.estadoActual = IotStatusEnum.OFFLINE;
      await this.sensorRepository.save(sensor);

      await this.bahiasService.marcarBahiaOfflinePorSensor(sensor.codigo);

      // REALTIME_EMIT: Notificar al frontend sobre la desconexión específica
      this.gateway.emitirSensorOffline({
        idBahia: sensor.idBahia,
        sensorId: sensor.codigo,
        fecha: new Date(),
      });

      // Auditoría Técnica: Registro del evento de desconexión
      const evento = this.eventoRepository.create({
        idSensor: sensor.idSensor,
        tipoEvento: IotStatusEnum.OFFLINE,
        payload: { 
          motivo: 'Timeout de lectura (>60s)', 
          estadoAnterior,
          ultimaLectura: sensor.ultimaLectura 
        },
      });
      await this.eventoRepository.save(evento);
    }

    return { 
      ok: true, 
      mensaje: 'Chequeo de salud completado', 
      desconectados: sensoresInactivos.length 
    };
  }

  /**
   * Obtiene todos los sensores registrados.
   */
  async findAllSensores() {
    return await this.sensorRepository.find();
  }
}
