import { 
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import type { 
  IVehiculoEventoPayload, 
  IOcupacionPayload, 
  IAlertaPayload, 
  ISensorOfflinePayload,
  IBahiaActualizadaPayload
} from '../common/interfaces/socket-payloads.interface';

const normalizeOrigin = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
};

const buildCorsOriginsSet = () => {
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((v): v is string => Boolean(v));

  return new Set(corsOrigins);
};

/**
 * Gateway central de WebSockets.
 * MOBILE_API: Configurado con Heartbeat agresivo para detectar cambios de red (WiFi/Datos) en milisegundos.
 */
@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalized = normalizeOrigin(origin);
      const corsOriginsSet = buildCorsOriginsSet();

      if (!normalized || corsOriginsSet.size === 0 || !corsOriginsSet.has(normalized)) {
        callback(new Error('Not allowed by CORS'));
        return;
      }

      callback(null, true);
    },
  },
  pingTimeout: 10000, // MOBILE_API: Tiempo de gracia para reconexión tras micro-cortes
  pingInterval: 5000,  // MOBILE_API: Latido constante para mantener el socket activo en segundo plano
})
export class EventosGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventosGateway.name);

  @WebSocketServer()
  server: Server;

  private clients: Map<string, { lastSeen: number }> = new Map();

  constructor(private readonly jwtService: JwtService) {
    // MOBILE_API: Limpieza de clientes inactivos para optimizar memoria en el servidor
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((val, id) => {
        if (now - val.lastSeen > 60000) {
          this.clients.delete(id);
        }
      });
    }, 30000);
  }

  /**
   * MOBILE_API: Gestiona la conexión inicial del dispositivo móvil.
   * El cliente debe enviar el token en el objeto 'auth' de la configuración de Socket.io.
   */
  async handleConnection(client: Socket) {
    const token =
      this.extraerTokenDeHandshake(client) ??
      this.extraerTokenDeAuthHeader(client);

    if (!token) {
      this.logger.warn(`Conexión WebSocket rechazada (sin token): ${client.id}`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;

      this.logger.log(`Dispositivo conectado: ${client.id}`);
      this.clients.set(client.id, { lastSeen: Date.now() });
    } catch {
      this.logger.warn(`Conexión WebSocket rechazada (token inválido/expirado): ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
    this.clients.delete(client.id);
  }

  // FIX: Heartbeat listener decorado correctamente
  @SubscribeMessage('heartbeat')
  handleHeartbeat(client: Socket) {
    if (this.clients.has(client.id)) {
      this.clients.get(client.id)!.lastSeen = Date.now();
    }
  }

  /**
   * Método base para emisión de eventos con tipado genérico.
   */
  private emitirEvento<T>(evento: string, payload: T) {
    this.server.emit(evento, payload);
    this.logger.log(`Evento emitido: ${evento}`);
  }

  private extraerTokenDeAuthHeader(client: Socket): string | null {
    const authHeader = client.handshake.headers?.authorization;
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (!headerValue) return null;

    const value = headerValue.trim();
    if (!value) return null;

    const lower = value.toLowerCase();
    if (lower.startsWith('bearer ')) {
      const token = value.slice(7).trim();
      return token.length ? token : null;
    }

    return value;
  }

  private extraerTokenDeHandshake(client: Socket): string | null {
    const token = client.handshake.auth?.token;
    if (typeof token !== 'string') return null;
    const trimmed = token.trim();
    return trimmed.length ? trimmed : null;
  }

  emitirVehiculoIngresado(payload: IVehiculoEventoPayload) {
    this.emitirEvento('vehiculo_ingresado', payload);
  }

  emitirVehiculoRetirado(payload: IVehiculoEventoPayload) {
    this.emitirEvento('vehiculo_retirado', payload);
  }

  emitirOcupacionActualizada(payload: IOcupacionPayload) {
    this.emitirEvento('ocupacion_actualizada', payload);
  }

  emitirAlertaParqueadero(payload: IAlertaPayload) {
    this.emitirEvento('alerta_parqueadero', payload);
  }

  emitirSensorOffline(payload: ISensorOfflinePayload) {
    this.emitirEvento('sensor_offline', payload);
  }

  emitirBahiaActualizada(payload: IBahiaActualizadaPayload) {
    this.emitirEvento('bahia_actualizada', payload);
  }
}
