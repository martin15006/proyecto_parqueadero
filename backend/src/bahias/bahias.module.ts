import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BahiasService } from './bahias.service';
import { Bahia } from './entities/bahia.entity';
import { ParqueaderoEstado } from './entities/parqueadero-estado.entity';
import { TipoBahia } from './entities/tipo-bahia.entity';
import { MovimientoVehiculo } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { Sensor } from '../telemetria/entities/sensor.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';
import { Visita } from '../visitas/entities/visita.entity';
import { BahiasController } from './bahias.controller';
import { BahiasAdminController } from './bahias-admin.controller';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { GatewayModule } from '../gateway/gateway.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthModule } from '../auth/auth.module';
import { InfraestructuraSeedService } from './infraestructura-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bahia, ParqueaderoEstado, TipoBahia, MovimientoVehiculo, Sensor, RegistroVehiculo, Visita]),
    AuditoriaModule,
    GatewayModule,
    NotificacionesModule,
    UsuariosModule,
    AuthModule, // necesario para que JwtAuthGuard inyecte AuthService correctamente en BahiasController.
  ],
  controllers: [BahiasController, BahiasAdminController],
  providers: [BahiasService, InfraestructuraSeedService],
  exports: [BahiasService, TypeOrmModule],
})
export class BahiasModule {}
