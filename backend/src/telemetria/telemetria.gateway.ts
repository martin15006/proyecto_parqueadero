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

@WebSocketGateway({
  namespace: 'telemetria',
  cors: {
    origin: '*',
  },
})
export class TelemetriaGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TelemetriaGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Sensor/Dispositivo conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Sensor/Dispositivo desconectado: ${client.id}`);
  }

  // FIX: Canal especializado para telemetría de sensores (ESP32) con tipado estricto
  @SubscribeMessage('sensor_data')
  handleSensorData(client: Socket, payload: ISensorDataPayload) {
    this.logger.log(`Datos recibidos del sensor ${payload.codigo}: ${JSON.stringify(payload.valor)}`);
    // Aquí se podría integrar con TelemetriaService directamente
    this.server.emit('broadcast_sensor', payload);
  }

  emitirAlerta(alerta: IAlertaPayload) {
    this.server.emit('alerta_sensor', alerta);
  }
}
