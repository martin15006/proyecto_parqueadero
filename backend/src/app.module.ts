import * as path from 'path';
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      // Si tu archivo .env está en backend/.env
      envFilePath: path.resolve(__dirname, '..', '.env'),
      isGlobal: true,
    }),

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
          Auditoria,
          Contingencia,
          Visitante,
          Sensor,
          TelemetriaEvento,
          AlertaSistema,
        ],

        synchronize: false,
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
  ],

  controllers: [AppController],

  providers: [
    AppService,

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