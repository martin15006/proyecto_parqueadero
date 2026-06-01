import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TipoBahia } from './entities/tipo-bahia.entity';
import { TipoControl } from './entities/tipo-control.entity';
import { Bahia } from './entities/bahia.entity';
import { Sensor } from '../telemetria/entities/sensor.entity';
import { IotStatusEnum } from '../common/enums/iot-status.enum';
import { BahiaReconciliacionEstadoEnum } from '../common/enums/bahia-reconciliacion-estado.enum';

@Injectable()
export class InfraestructuraSeedService implements OnModuleInit {
  private readonly logger = new Logger(InfraestructuraSeedService.name);

  constructor(
    @InjectRepository(TipoBahia)
    private readonly tipoBahiaRepo: Repository<TipoBahia>,
    @InjectRepository(TipoControl)
    private readonly tipoControlRepo: Repository<TipoControl>,
    @InjectRepository(Bahia)
    private readonly bahiaRepo: Repository<Bahia>,
    @InjectRepository(Sensor)
    private readonly sensorRepo: Repository<Sensor>,
  ) {}

  async onModuleInit() {
    await this.seedTipos();
    await this.seedBahiasYSensores();
  }

  private async seedTipos() {
    for (const nombre of ['Carro', 'Moto', 'Discapacitado']) {
      const existe = await this.tipoBahiaRepo.findOne({ where: { tipoBahia: nombre }, withDeleted: true });
      if (!existe) {
        try {
          await this.tipoBahiaRepo.save({ tipoBahia: nombre });
          this.logger.log(`TipoBahia creado: ${nombre}`);
        } catch {
          this.logger.warn(`TipoBahia '${nombre}' ya existe en BD, omitido`);
        }
      }
    }

    for (const nombre of ['Sensor IoT', 'Manual']) {
      const existe = await this.tipoControlRepo.findOne({ where: { tipoControl: nombre }, withDeleted: true });
      if (!existe) {
        try {
          await this.tipoControlRepo.save({ tipoControl: nombre });
          this.logger.log(`TipoControl creado: ${nombre}`);
        } catch {
          this.logger.warn(`TipoControl '${nombre}' ya existe en BD, omitido`);
        }
      }
    }
  }

  private async seedBahiasYSensores() {
    const tipoCarro = await this.tipoBahiaRepo.findOne({ where: { tipoBahia: 'Carro' } });
    const tipoSensor = await this.tipoControlRepo.findOne({ where: { tipoControl: 'Sensor IoT' } });

    if (!tipoCarro || !tipoSensor) {
      this.logger.error('No se encontraron tipos base para crear bahías');
      return;
    }

    const bahiasConfig = [
      { nombre: 'B-001', sensorId: 'SN-001' },
      { nombre: 'B-002', sensorId: 'SN-002' },
      { nombre: 'B-003', sensorId: 'SN-003' },
    ];

    for (const config of bahiasConfig) {
      let bahia = await this.bahiaRepo.findOne({ where: { nombreBahia: config.nombre }, withDeleted: true });

      if (!bahia) {
        try {
          bahia = await this.bahiaRepo.save({
            nombreBahia: config.nombre,
            idTipoBahia: tipoCarro.idTipoB,
            idTipoControl: tipoSensor.idTipoC,
            estadoReconciliado: BahiaReconciliacionEstadoEnum.LIBRE,
          });
          this.logger.log(`Bahía creada: ${config.nombre} (id=${bahia.idBahia})`);
        } catch {
          bahia = await this.bahiaRepo.findOne({ where: { nombreBahia: config.nombre } });
          if (!bahia) {
            this.logger.error(`No se pudo crear ni encontrar bahía ${config.nombre}`);
            continue;
          }
        }
      }

      const sensorExiste = await this.sensorRepo.findOne({ where: { codigo: config.sensorId } });
      if (!sensorExiste) {
        try {
          await this.sensorRepo.save({
            codigo: config.sensorId,
            idBahia: bahia.idBahia,
            activo: true,
            estadoActual: IotStatusEnum.OFFLINE,
          });
          this.logger.log(`Sensor creado: ${config.sensorId} → Bahía ${config.nombre}`);
        } catch {
          this.logger.warn(`Sensor ${config.sensorId} ya existe, omitido`);
        }
      }
    }
  }
}
