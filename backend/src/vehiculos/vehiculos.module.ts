import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiculosService } from './vehiculos.service';
import { VehiculosController } from './vehiculos.controller';
import { AdminVehiculosController } from './admin-vehiculos.controller';
import { Vehiculo } from './entities/vehiculo.entity';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';
import { RegistroVehiculo } from './entities/registro-vehiculo.entity';
import { MovimientoVehiculo } from './entities/movimiento-vehiculo.entity';
import { Compartir } from './entities/compartir.entity';
import { SolicitudVehiculo } from './entities/solicitud-vehiculo.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AuthModule } from '../auth/auth.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vehiculo,
      TipoVehiculo,
      RegistroVehiculo,
      MovimientoVehiculo,
      Compartir,
      SolicitudVehiculo,
    ]),
    forwardRef(() => UsuariosModule),
    AuditoriaModule,
    AuthModule,
    NotificacionesModule,
  ],
  controllers: [VehiculosController, AdminVehiculosController],
  providers: [VehiculosService],
  exports: [VehiculosService],
})
export class VehiculosModule {}
