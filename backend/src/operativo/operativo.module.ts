// src/operativo/operativo.module.ts

import { Module } from '@nestjs/common';

import { OperativoController } from './operativo.controller';
import { OperativoService } from './operativo.service';

import { AuthModule } from '../auth/auth.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

// Importa el módulo que contiene y exporta EventosGateway
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    AuthModule,
    UsuariosModule,
    AuditoriaModule,
    GatewayModule, // ← necesario para inyectar EventosGateway
  ],
  controllers: [OperativoController],
  providers: [OperativoService],
})
export class OperativoModule {}