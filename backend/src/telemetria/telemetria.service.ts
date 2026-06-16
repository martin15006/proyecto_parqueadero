import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Sensor } from './entities/sensor.entity';
import { TelemetriaEvento } from './entities/telemetria-evento.entity';
import { AlertaSistema } from './entities/alerta-sistema.entity';
import { Bahia } from '../bahias/entities/bahia.entity';
import { EventosGateway } from '../gateway/eventos.gateway';
import { BahiasService } from '../bahias/bahias.service';
import { TelemetryPayloadDto } from './dto/telemetry-payload.dto';
import { IotStatusEnum } from '../common/enums/iot-status.enum';

@Injectable()
export class TelemetriaService {
  private readonly logger = new Logger(TelemetriaService.name);

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
      sensor.estadoActual = status;
    }

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

  private async emitirConteoGlobal() {
    const conteo = await this.bahiasService.obtenerConteoGlobal();
    this.gateway.emitirConteoGlobalDisponibles({
      total: conteo.total,
      ocupados: conteo.ocupados,
      disponibles: conteo.disponibles,
      estadoParqueadero: conteo.estadoParqueadero,
      actualizadoEn: new Date(),
    });
  }

  private async asegurarBahiaSinOtroSensorActivo(idBahia: number, exceptoIdSensor?: number) {
    const otro = await this.sensorRepository.findOne({
      where: exceptoIdSensor
        ? { idBahia, activo: true, idSensor: Not(exceptoIdSensor) }
        : { idBahia, activo: true },
    });
    if (otro) {
      throw new BadRequestException({
        message: `La bahía ya tiene un sensor activo (${otro.codigo}). Desactívalo o reasígnalo primero.`,
        errorCode: 'BAHIA_CON_SENSOR_ACTIVO',
      });
    }
  }

  async crearSensor(dto: { codigo: string; idBahia: number; activo?: boolean }) {
    const codigo = String(dto.codigo ?? '').trim();
    if (!codigo) {
      throw new BadRequestException({
        message: 'El código del sensor es obligatorio.',
        errorCode: 'CODIGO_OBLIGATORIO',
      });
    }

    const existe = await this.sensorRepository.findOne({ where: { codigo }, withDeleted: true });
    if (existe) {
      throw new BadRequestException({
        message: `Ya existe un sensor con el código "${codigo}".`,
        errorCode: 'SENSOR_DUPLICADO',
      });
    }

    const bahia = await this.sensorRepository.manager.findOne(Bahia, {
      where: { idBahia: dto.idBahia },
    });
    if (!bahia) {
      throw new BadRequestException({
        message: 'La bahía indicada no existe.',
        errorCode: 'BAHIA_INVALIDA',
      });
    }

    const activo = dto.activo ?? true;
    if (activo) {
      await this.asegurarBahiaSinOtroSensorActivo(dto.idBahia);
    }

    const creado = await this.sensorRepository.save(
      this.sensorRepository.create({
        codigo,
        idBahia: dto.idBahia,
        activo,
        estadoActual: IotStatusEnum.OFFLINE,
      }),
    );

    await this.emitirConteoGlobal();
    return creado;
  }

  async actualizarSensor(id: number, dto: { codigo?: string; idBahia?: number; activo?: boolean }) {
    const sensor = await this.sensorRepository.findOne({ where: { idSensor: id } });
    if (!sensor) throw new NotFoundException('Sensor no encontrado');

    if (dto.codigo !== undefined) {
      const codigo = String(dto.codigo).trim();
      if (!codigo) {
        throw new BadRequestException({
          message: 'El código del sensor no puede quedar vacío.',
          errorCode: 'CODIGO_OBLIGATORIO',
        });
      }
      if (codigo !== sensor.codigo) {
        const dup = await this.sensorRepository.findOne({ where: { codigo }, withDeleted: true });
        if (dup) {
          throw new BadRequestException({
            message: `Ya existe un sensor con el código "${codigo}".`,
            errorCode: 'SENSOR_DUPLICADO',
          });
        }
        sensor.codigo = codigo;
      }
    }

    if (dto.idBahia !== undefined && dto.idBahia !== sensor.idBahia) {
      const bahia = await this.sensorRepository.manager.findOne(Bahia, {
        where: { idBahia: dto.idBahia },
      });
      if (!bahia) {
        throw new BadRequestException({
          message: 'La bahía indicada no existe.',
          errorCode: 'BAHIA_INVALIDA',
        });
      }
      sensor.idBahia = dto.idBahia;
    }

    if (dto.activo !== undefined) {
      sensor.activo = Boolean(dto.activo);
    }

    if (sensor.activo) {
      await this.asegurarBahiaSinOtroSensorActivo(sensor.idBahia, sensor.idSensor);
    }

    const guardado = await this.sensorRepository.save(sensor);
    await this.emitirConteoGlobal();
    return guardado;
  }

  async eliminarSensor(id: number) {
    const sensor = await this.sensorRepository.findOne({ where: { idSensor: id } });
    if (!sensor) throw new NotFoundException('Sensor no encontrado');

    await this.sensorRepository.softDelete(id);
    await this.emitirConteoGlobal();
    return { ok: true, idSensor: id };
  }
}
