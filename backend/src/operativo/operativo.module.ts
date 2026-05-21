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

// Importa el módulo que contiene y exporta EventosGateway
import { GatewayModule } from '../gateway/gateway.module';

// FIX: 0ryvli - Importadas entidades necesarias para inyección en OperativoService
import { Vehiculo } from '../vehiculos/entities/vehiculo.entity';
import { RegistroVehiculo } from '../vehiculos/entities/registro-vehiculo.entity';
import { MovimientoVehiculo } from '../vehiculos/entities/movimiento-vehiculo.entity';

@Module({
  imports: [
    AuthModule,
    UsuariosModule,
    AuditoriaModule,
    VehiculosModule,
    BahiasModule,
    GatewayModule, // ← necesario para inyectar EventosGateway
    // FIX: Auditoría técnica - registrado TypeOrmModule.forFeature para Vehiculo, RegistroVehiculo y MovimientoVehiculo
    TypeOrmModule.forFeature([Vehiculo, RegistroVehiculo, MovimientoVehiculo]),
  ],
  controllers: [OperativoController],
  providers: [OperativoService],
})
export class OperativoModule {}