// src/operativo/operativo.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OperativoController } from './operativo.controller';
import { OperativoService } from './operativo.service';

import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { VehiculosModule } from '../vehiculos/vehiculos.module';
import { BahiasModule } from '../bahias/bahias.module';
import { MailModule } from '../mail/mail.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

// Importa el módulo que contiene y exporta EventosGateway
import { GatewayModule } from '../gateway/gateway.module';

// FIX: 0ryvli - Importadas entidades necesarias para inyección en OperativoService
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';
import { MovimientoVehiculo } from '../vehiculos/entities/movimiento-vehiculo.entity';
import { Contingencia } from '../contingencia/entities/contingencia.entity';
import { AdminMovimientosController } from './admin-movimientos.controller';
import { AlertaSistema } from '../telemetria/entities/alerta-sistema.entity';

@Module({
  imports: [
    AuthModule,
    UsuariosModule,
    AuditoriaModule,
    VehiculosModule,
    BahiasModule,
    MailModule,
    NotificacionesModule,
    GatewayModule, // ← necesario para inyectar EventosGateway
    // FIX: Auditoría técnica - registrado TypeOrmModule.forFeature para Vehiculo, RegistroVehiculo y MovimientoVehiculo
    TypeOrmModule.forFeature([Vehiculo, RegistroVehiculo, MovimientoVehiculo, Contingencia, AlertaSistema]), // RF35: permite consultar alertas técnicas recientes en el resumen operativo.
  ],
  controllers: [OperativoController, AdminMovimientosController],
  providers: [OperativoService],
})
export class OperativoModule {}
