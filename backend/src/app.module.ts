import * as path from 'path';
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { MailModule } from './mail/mail.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

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

function validateEnv(config: Record<string, unknown>) {
  const missing: string[] = [];

  const getString = (key: string) => {
    const value = config[key];
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  };

  const jwtSecret = getString('JWT_SECRET');
  if (!jwtSecret) missing.push('JWT_SECRET');

  const databaseUrl = getString('DATABASE_URL');
  const dbHost = getString('DB_HOST');
  const dbUsername = getString('DB_USERNAME');
  const dbPassword = getString('DB_PASSWORD');
  const dbName = getString('DB_NAME');
  const dbPortRaw = getString('DB_PORT');

  if (!databaseUrl) {
    if (!dbHost) missing.push('DB_HOST');
    if (!dbUsername) missing.push('DB_USERNAME');
    if (!dbPassword) missing.push('DB_PASSWORD');
    if (!dbName) missing.push('DB_NAME');
  }

  if (dbPortRaw && Number.isNaN(Number.parseInt(dbPortRaw, 10))) {
    missing.push('DB_PORT (inválido)');
  }

  if (missing.length > 0) {
    console.error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`);
    process.exit(1);
  }

  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.resolve(__dirname, '..', '.env'),
      isGlobal: true,
      validate: validateEnv,
    }),

    // Automatización de tareas (Cron Jobs)
    ScheduleModule.forRoot(),

    // SEGURIDAD: Rate Limiting global (Optimizado para Mobile y Dashboards)
    ThrottlerModule.forRoot([{
      name: 'short',
      ttl: 1000,
      limit: 30, // Incrementado de 10 a 30 para soportar ráfagas de carga masiva del dashboard (RF33)
    }, {
      name: 'medium',
      ttl: 10000,
      limit: 100, // Incrementado de 40 a 100 para permitir navegación rápida sin bloqueos
    }, {
      name: 'long',
      ttl: 60000,
      limit: 300, // Máximo 300 peticiones por minuto
    }]),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT') ?? '5432', 10),
        username: configService.get<string>('DB_USERNAME'),
        password: String(configService.get<string>('DB_PASSWORD') ?? ''),
        database: configService.get<string>('DB_NAME'),

        entities: [
          __dirname + '/**/*.entity{.ts,.js}',
        ],

        migrations: [
          __dirname + '/migrations/*{.ts,.js}',
        ],

        synchronize: false,
        migrationsRun: false, // Se deshabilita para evitar conflictos con migraciones antiguas; ejecutar manualmente vía CLI si es necesario
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
