import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AdminReportesController } from './admin-reportes.controller';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { MovimientoVehiculo } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { Bahia } from '../bahias/entities/bahia.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';
import { BahiasModule } from '../bahias/bahias.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Vehiculo, MovimientoVehiculo, Bahia, RegistroVehiculo]),
    BahiasModule,
    AuditoriaModule,
    AuthModule,
  ],
  controllers: [DashboardController, AdminReportesController, ReportesController],
  providers: [DashboardService, ReportesService],
})
export class DashboardModule {}
