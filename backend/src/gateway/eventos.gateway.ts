import { 
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { 
  IVehiculoEventoPayload, 
  IOcupacionPayload, 
  IAlertaPayload, 
  ISensorOfflinePayload,
  IBahiaActualizadaPayload
} from '../common/interfaces/socket-payloads.interface';

/**
 * Gateway central de WebSockets.
 * MOBILE_API: Configurado con Heartbeat agresivo para detectar cambios de red (WiFi/Datos) en milisegundos.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
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

  constructor() {
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
  handleConnection(client: Socket) {
    this.logger.log(`Dispositivo conectado: ${client.id}`);
    this.clients.set(client.id, { lastSeen: Date.now() });

    const token = client.handshake.auth?.token;
    if (token) {
      // MOBILE_API: El token permite al servidor asignar al dispositivo a rooms de interés
      // ej: client.join(`user_${userId}`);
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
