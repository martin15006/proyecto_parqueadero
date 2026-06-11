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

  // Almacena en memoria el último estado reportado por cada sensor (anti-saturación)
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

    const ultimaLectura = this.cacheLecturas.get(sensorId);
    const tiempoTranscurrido = ultimaLectura ? Date.now() - ultimaLectura.timestamp : Infinity;
    const mismoEstado = ultimaLectura?.status === status;
    const dentroVentana = tiempoTranscurrido < 30_000;
    const omitirDbSensor = mismoEstado && dentroVentana;

    this.logger.debug(
      `[Telemetría] ${sensorId} | ${status} | mismo=${mismoEstado} | ${Math.round(tiempoTranscurrido / 1000)}s | omitirDB=${omitirDbSensor}`,
    );

    const sensor = await this.sensorRepository.findOne({ where: { codigo: sensorId } });
    if (!sensor) {
      this.logger.error(`[IOT ERROR] Sensor no registrado: ${sensorId}`);
      throw new BadRequestException('Dispositivo IoT no reconocido');
    }

    if (!omitirDbSensor) {
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

  private async gestionarImpactoOperativo(sensor: Sensor, status: IotStatusEnum) {
    await this.bahiasService.procesarTelemetriaSensor(
      sensor.codigo,
      status === IotStatusEnum.OCCUPIED,
    );

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

  private async registrarAlertaSistema(tipo: string, mensaje: string) {
    const alerta = this.alertaRepository.create({ tipo, mensaje });
    await this.alertaRepository.save(alerta);
  }

  /**
   * Simulador (DEMO): registra una alerta y la emite en tiempo real.
   * Se utiliza para presentaciones locales cuando no hay hardware conectado.
   */
  async simularAlertaSistema(tipo: string, mensaje: string) {
    await this.registrarAlertaSistema(tipo, mensaje);
    this.gateway.emitirAlertaParqueadero({
      tipo,
      mensaje,
      fecha: new Date(),
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorizarSensores() {
    this.logger.log('Iniciando monitoreo de salud de sensores IoT...');

    const umbral = new Date();
    umbral.setSeconds(umbral.getSeconds() - 60);

     const sensoresInactivos = await this.sensorRepository.find({
       where: {
         ultimaLectura: LessThan(umbral),
         estadoActual: Not(IotStatusEnum.OFFLINE),
       },
     });

    if (sensoresInactivos.length === 0) {
      this.logger.log('Todos los sensores están reportando correctamente.');
      return { ok: true, mensaje: 'Salud de infraestructura óptima' };
    }

    this.logger.warn(`Se detectaron ${sensoresInactivos.length} sensores sin reporte. Marcando como OFFLINE.`);

    for (const sensor of sensoresInactivos) {
      const estadoAnterior = sensor.estadoActual;

      sensor.estadoActual = IotStatusEnum.OFFLINE;
      await this.sensorRepository.save(sensor);

      await this.bahiasService.marcarBahiaOfflinePorSensor(sensor.codigo);

      this.gateway.emitirSensorOffline({
        idBahia: sensor.idBahia,
        sensorId: sensor.codigo,
        fecha: new Date(),
      });

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

  async findAllSensores() {
    return await this.sensorRepository.find();
  }
}
