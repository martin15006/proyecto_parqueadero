import * as path from 'path';
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

// Guard global de roles
import { RolesGuard } from './common/guards/roles.guard';

// Módulo de auditoría (ruta correcta)
import { AuditoriaModule } from './auditoria/auditoria.module';

// Entidades adicionales
import { Auditoria } from './auditoria/entities/auditoria.entity';
import { Contingencia } from './contingencia/entities/contingencia.entity';
import { Visitante } from './visitantes/entities/visitante.entity';
import { Sensor } from './telemetria/entities/sensor.entity';
import { TelemetriaEvento } from './telemetria/entities/telemetria-evento.entity';
import { AlertaSistema } from './telemetria/entities/alerta-sistema.entity';

// Módulo de WebSocket
import { GatewayModule } from './gateway/gateway.module';
import { OperativoModule } from './operativo/operativo.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TelemetriaModule } from './telemetria/telemetria.module';

import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.resolve(__dirname, '..', '.env'),
      isGlobal: true,
    }),

    // SEGURIDAD: Rate Limiting global (Optimizado para Mobile)
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 3, // Máximo 3 peticiones por segundo
    }, {
      name: 'medium',
      ttl: 10000,
      limit: 20, // Máximo 20 peticiones cada 10 segundos
    }, {
      name: 'long',
      ttl: 60000,
      limit: 100, // Máximo 100 peticiones por minuto
    }]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') ?? '5432', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: String(configService.get<string>('DB_PASSWORD') ?? ''),
        database: configService.get<string>('DB_NAME'),

        entities: [
          __dirname + '/**/*.entity{.ts,.js}',
        ],

        synchronize: false,
        namingStrategy: new SnakeNamingStrategy(),
      }),
    }),

    // Módulos principales
    UsuariosModule,
    AuthModule,
    MailModule,
    VehiculosModule,
    CloudinaryModule,
    // Módulo de WebSocket
    GatewayModule,
    // Fase 3: Auditoría
    AuditoriaModule,
    OperativoModule,
    DashboardModule,
    TelemetriaModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    // SEGURIDAD: ThrottlerGuard global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Guard global para control de roles
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit() {
    if (this.dataSource.isInitialized) {
      this.logger.log('Conexión a la base de datos establecida');
    } else {
      this.logger.error('Error al conectar con la base de datos');
    }
  }
}