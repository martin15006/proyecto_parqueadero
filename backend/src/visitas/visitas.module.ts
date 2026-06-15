import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Visita } from './entities/visita.entity';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';

import { MovimientoVehiculo } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { BahiasModule } from '../bahias/bahias.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { GatewayModule } from '../gateway/gateway.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Visita, MovimientoVehiculo]),
    BahiasModule, // aforo + conteo + alertas de ocupación
    AuditoriaModule,
    GatewayModule,
    AuthModule, // para que JwtAuthGuard inyecte AuthService en el controlador
  ],
  controllers: [VisitasController],
  providers: [VisitasService],
})
export class VisitasModule {}
