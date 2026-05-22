import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { ISensorDataPayload, IAlertaPayload } from '../common/interfaces/socket-payloads.interface';
import { Server, Socket } from 'socket.io';

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
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((v): v is string => Boolean(v));

  return new Set(corsOrigins);
};

@WebSocketGateway({
  namespace: 'telemetria',
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
  pingTimeout: 10000,
  pingInterval: 5000,
})
/**
 * Gateway de WebSocket para telemetría (namespace: telemetria).
 */
export class TelemetriaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TelemetriaGateway.name);

  @WebSocketServer()
  server: Server;

  /**
   * Maneja la conexión de un cliente al namespace de telemetría.
   * @param client Cliente Socket.IO conectado.
   */
  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  /**
   * Maneja la desconexión de un cliente del namespace de telemetría.
   * @param client Cliente Socket.IO desconectado.
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * Recibe datos de sensor y los retransmite a los suscriptores.
   * @param client Cliente que emite el evento.
   * @param payload Datos de sensor.
   */
  @SubscribeMessage('sensor_data')
  handleSensorData(client: Socket, payload: ISensorDataPayload) {
    const debugWs =
      String(process.env.DEBUG_WS ?? '').toLowerCase() === '1' ||
      String(process.env.DEBUG_WS ?? '').toLowerCase() === 'true';

    if (debugWs) {
      this.logger.log(`sensor_data: ${payload.codigo} (client: ${client.id})`);
    }
    this.server.emit('broadcast_sensor', payload);
  }

  /**
   * Emite una alerta a los clientes conectados.
   * @param alerta Payload de alerta.
   */
  emitirAlerta(alerta: IAlertaPayload) {
    this.server.emit('alerta_sensor', alerta);
  }
}
