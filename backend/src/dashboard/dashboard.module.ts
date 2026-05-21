import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { MovimientoVehiculo } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { Bahia } from '../bahias/entities/bahia.entity';
import { BahiasModule } from '../bahias/bahias.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Vehiculo, MovimientoVehiculo, Bahia]),
    BahiasModule,
    AuditoriaModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
