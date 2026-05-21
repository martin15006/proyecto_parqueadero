import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard de Seguridad para Dispositivos IoT.
 * Valida que la trama de hardware incluya una API Key válida en los headers.
 * SECURITY: Previene que atacantes externos inyecten telemetría falsa.
 */
@Injectable()
export class IotAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-iot-api-key'];

    const validApiKey = this.configService.get<string>('IOT_API_KEY');

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('Acceso denegado: API Key IoT inválida o ausente');
    }

    return true;
  }
}
