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
  // CORRECCIÓN 1: Agregar patrones comunes de IP local o permitir la IP del Wi-Fi en desarrollo
  const devAllowedHosts = new Set(['localhost', '127.0.0.1', '192.168.137.225']);

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((v): v is string => Boolean(v));

  const corsOriginsSet = new Set(corsOrigins);

  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

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
          
          // CORRECCIÓN 2: Flexibilidad total en entorno de desarrollo local para pruebas móviles
          const hostOk = devAllowedHosts.has(url.hostname) || url.hostname.startsWith('192.168.');
          const protocolOk = url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'exp:';

          if (protocolOk && hostOk) {
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

  const port = Number(process.env.PORT ?? 3000);
  
  // CORRECCIÓN 3: Escuchar explícitamente en '0.0.0.0' para abrir los puertos a la red Wi-Fi
  try {
    await app.listen(port, '0.0.0.0');
  } catch (error: any) {
    if (error?.code === 'EADDRINUSE') {
      logger.error(`El puerto ${port} ya está en uso. Detén el proceso que lo está ocupando o inicia el backend con PORT=${port + 1}.`);
      await app.close().catch(() => undefined);
      process.exit(1);
    }
    throw error;
  }
  logger.log(`Servidor corriendo en red local. Accesible en http://192.168.137.225:${port}`);
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Fallo al iniciar la aplicación', error?.stack || String(error));
  process.exit(1);
});
