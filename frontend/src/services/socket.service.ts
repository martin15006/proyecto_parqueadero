import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private readonly URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

  /**
   * Establece una conexión única con el servidor de WebSockets.
   * FEATURE: Implementa patrón Singleton para garantizar una sola instancia.
   * SOCKET: Gestiona la autenticación mediante handshake JWT.
   */
  connect() {
    if (!this.socket) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const token = user.access_token || user.token;
      
      this.socket = io(this.URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket'],
        auth: {
          token: token
        }
      });

      this.socket.on('connect', () => {
        console.log('Socket.IO Singleton: Conexión Establecida');
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO Singleton: Error de Conexión:', error.message);
      });
    }
    return this.socket;
  }

  /**
   * Cierra la conexión y limpia la instancia.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Suscribe un callback a un evento específico.
   * SOCKET: Registra un listener en el bus de eventos del socket.
   */
  on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
  }

  /**
   * Remueve la suscripción a un evento.
   */
  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  /**
   * Emite un evento al servidor.
   */
  emit(event: string, data: any) {
    if (!this.socket) this.connect();
    this.socket?.emit(event, data);
  }

  get isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
