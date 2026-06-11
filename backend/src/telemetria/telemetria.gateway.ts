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
import { TelemetriaService } from './telemetria.service';
import { IotStatusEnum } from '../common/enums/iot-status.enum';

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

      if (normalized && corsOriginsSet.has(normalized)) {
        callback(null, true);
        return;
      }

      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev) {
        try {
          const url = new URL(origin);
          const devAllowedHosts = new Set(['localhost', '127.0.0.1']);
          const devAllowedPorts = new Set(['3000', '3001', '4200', '5173', '5174']);
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
  },
  pingTimeout: 10000,
  pingInterval: 5000,
})
export class TelemetriaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TelemetriaGateway.name);

  @WebSocketServer()
  server: Server;
  
  constructor(private readonly telemetriaService: TelemetriaService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('sensor_data')
  async handleSensorData(client: Socket, payload: ISensorDataPayload) {
    const debugWs =
      String(process.env.DEBUG_WS ?? '').toLowerCase() === '1' ||
      String(process.env.DEBUG_WS ?? '').toLowerCase() === 'true';

    if (debugWs) {
      this.logger.log(`sensor_data: ${payload.codigo} (client: ${client.id})`);
    }
    
    const sensorId = String(payload?.codigo ?? '').trim();
    const ocupado = Boolean(payload?.valor?.ocupado);
    const battery = payload?.valor?.bateria;
    const rssi = payload?.valor?.rssi;

    if (sensorId.length) {
      try {
        await this.telemetriaService.procesarLectura({
          sensorId,
          status: ocupado ? IotStatusEnum.OCCUPIED : IotStatusEnum.AVAILABLE,
          battery,
          rssi,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.warn(`Error procesando telemetría por WS (sensorId=${sensorId}): ${message}`);
      }
    }

    this.server.emit('broadcast_sensor', payload);
  }

  emitirAlerta(alerta: IAlertaPayload) {
    this.server.emit('alerta_sensor', alerta);
  }
}
