import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelemetriaService } from './telemetria.service';
import { Sensor } from './entities/sensor.entity';
import { TelemetriaEvento } from './entities/telemetria-evento.entity';
import { AlertaSistema } from './entities/alerta-sistema.entity';
import { GatewayModule } from '../gateway/gateway.module';
import { BahiasModule } from '../bahias/bahias.module';
import { AuthModule } from '../auth/auth.module';

import { TelemetriaController } from './telemetria.controller';
import { TelemetriaGateway } from './telemetria.gateway';
import { SerialBridgeService } from './serial-bridge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sensor, TelemetriaEvento, AlertaSistema]),
    GatewayModule,
    BahiasModule,
    AuthModule,
  ],
  controllers: [TelemetriaController],
  providers: [TelemetriaService, TelemetriaGateway, SerialBridgeService],
  exports: [TelemetriaService, TelemetriaGateway],
})
export class TelemetriaModule {}
