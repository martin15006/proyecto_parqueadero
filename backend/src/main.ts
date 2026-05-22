import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const normalizeOrigin = (value: string) => {
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.host}`;
    } catch {
      return null;
    }
  };

  const isDev = process.env.NODE_ENV !== 'production';
  const devAllowedHosts = new Set(['localhost', '127.0.0.1']);
  const devAllowedPorts = new Set(['3000', '3001', '4200', '5173', '5174']);

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((v): v is string => Boolean(v));

  const corsOriginsSet = new Set(corsOrigins);

  // SEGURIDAD: Helmet para headers seguros con configuración recomendada para producción
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // SEGURIDAD: CORS configurado para permitir el frontend y manejar credenciales
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(origin);
      if (normalized && corsOriginsSet.has(normalized)) {
        callback(null, true);
        return;
      }

      if (isDev) {
        try {
          const url = new URL(origin);
          const hostOk = devAllowedHosts.has(url.hostname);
          const portOk = Boolean(url.port) && devAllowedPorts.has(url.port);
          const protocolOk = url.protocol === 'http:' || url.protocol === 'https:';

          if (hostOk && portOk && protocolOk) {
            callback(null, true);
            return;
          }
        } catch {
          callback(new Error('Not allowed by CORS'));
          return;
        }
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'x-iot-api-key'],
  });

  // Versionamiento de API
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Filtros y Pipes globales
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Sistema de Parqueadero Inteligente - Backend Seguro')
    .setDescription('API endurecida para gestión de parqueaderos con auditoría y seguridad avanzada')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Servidor corriendo en puerto ${port}`);
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Fallo al iniciar la aplicación', error?.stack || String(error));
  process.exit(1);
});
