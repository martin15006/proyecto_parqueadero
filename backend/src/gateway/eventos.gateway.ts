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
  IBahiaActualizadaPayload,
  IParqueaderoEstadoPayload,
  IBahiaModificadaPayload,
  IConteoGlobalDisponiblesPayload
} from '../common/interfaces/socket-payloads.interface';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';

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
  private bahiaDebounce: Map<string, { timer: NodeJS.Timeout | null; pending: IBahiaModificadaPayload; lastEmitState: IBahiaModificadaPayload['nuevoEstado'] | null }> = new Map();

  private readonly ROOMS = {
    OPERATIVOS_ALERTAS: 'operativos_alertas',
    PARQUEADERO_BAHIAS: 'parqueadero_bahias',
    APRENDICES_CONTEO: 'aprendices_conteo_global',
    ADMINS_FULL: 'admins_full',
  } as const;

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

      const idTipoUsr = Number(payload?.idTipoUsr);
      if (idTipoUsr === TipoUsuarioEnum.APRENDIZ) {
        client.join(this.ROOMS.APRENDICES_CONTEO);
      } else if (idTipoUsr === TipoUsuarioEnum.OPERATIVO) {
        client.join(this.ROOMS.OPERATIVOS_ALERTAS);
        client.join(this.ROOMS.PARQUEADERO_BAHIAS);
      } else if (idTipoUsr === TipoUsuarioEnum.ADMIN) {
        client.join(this.ROOMS.OPERATIVOS_ALERTAS);
        client.join(this.ROOMS.PARQUEADERO_BAHIAS);
        client.join(this.ROOMS.ADMINS_FULL);
      }

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

  private emitirEvento<T>(evento: string, payload: T, room?: string) {
    if (room) {
      this.server.to(room).emit(evento, payload);
    } else {
      this.server.emit(evento, payload);
    }
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
    this.emitirEvento('vehiculo_ingresado', payload, this.ROOMS.PARQUEADERO_BAHIAS);
  }

  emitirVehiculoRetirado(payload: IVehiculoEventoPayload) {
    this.emitirEvento('vehiculo_retirado', payload, this.ROOMS.PARQUEADERO_BAHIAS);
  }

  emitirOcupacionActualizada(payload: IOcupacionPayload) {
    this.emitirEvento('ocupacion_actualizada', payload, this.ROOMS.ADMINS_FULL);
  }

  emitirAlertaParqueadero(payload: IAlertaPayload) {
    this.emitirEvento('alerta_parqueadero', payload, this.ROOMS.OPERATIVOS_ALERTAS);
  }

  emitirSensorOffline(payload: ISensorOfflinePayload) {
    this.emitirEvento('sensor_offline', payload, this.ROOMS.OPERATIVOS_ALERTAS);
  }

  emitirBahiaActualizada(payload: IBahiaActualizadaPayload) {
    this.emitirEvento('bahia_actualizada', payload, this.ROOMS.PARQUEADERO_BAHIAS);
  }

  emitirParqueaderoEstadoActualizado(payload: IParqueaderoEstadoPayload) {
    this.emitirEvento('parqueadero_estado_actualizado', payload, this.ROOMS.OPERATIVOS_ALERTAS);
    this.emitirEvento('parqueadero_estado_actualizado', payload, this.ROOMS.ADMINS_FULL);
  }

  emitirConteoGlobalDisponibles(payload: IConteoGlobalDisponiblesPayload) {
    this.emitirEvento('conteo_global_disponibles', payload, this.ROOMS.APRENDICES_CONTEO);
    this.emitirEvento('conteo_global_disponibles', payload, this.ROOMS.PARQUEADERO_BAHIAS);
    this.emitirEvento('conteo_global_disponibles', payload, this.ROOMS.ADMINS_FULL);
  }

  /**
   * Notifica a los administradores que la lista de solicitudes cambió
   * (nueva solicitud desde el móvil, o una aprobada/rechazada). El panel
   * de Solicitudes escucha este evento y recarga en tiempo real.
   */
  emitirSolicitudesActualizadas(payload: { tipo: 'NUEVA' | 'RESUELTA'; idSolicitud?: number }) {
    this.emitirEvento('solicitudes_actualizadas', payload, this.ROOMS.ADMINS_FULL);
  }

  emitirBahiaModificada(payload: IBahiaModificadaPayload, opts?: { source?: 'IOT' | 'PORTERIA' | 'ADMIN' }) {
    const key = payload.idBahia;
    const current = this.bahiaDebounce.get(key);
    const lastEmitState = current?.lastEmitState ?? null;

    // Si el estado no cambió respecto al último emitido, ignorar
    if (lastEmitState === payload.nuevoEstado) return;

    if (current?.timer) {
      clearTimeout(current.timer);
    }

    this.emitirEvento('bahia_modificada', payload, this.ROOMS.PARQUEADERO_BAHIAS);
    this.bahiaDebounce.set(key, {
      timer: null,
      pending: payload,
      lastEmitState: payload.nuevoEstado,
    });
  }
}
