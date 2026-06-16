import { io, Socket } from 'socket.io-client';

type SocketListener = {
  event: string;
  callback?: (...args: any[]) => void;
};

class SocketService {
  private socket: Socket | null = null;
  private readonly URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  private lastConnectionError: string | null = null;

  private readToken(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.accessToken || user.access_token || user.token || undefined;
    } catch {
      return undefined;
    }
  }

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const token = this.readToken();

    this.socket = io(this.URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket'],
      auth: { token },
    });

    this.socket.on('connect', () => {
      this.lastConnectionError = null;
    });

    this.socket.on('connect_error', (error) => {
      this.lastConnectionError = error?.message || 'Error de conexión WebSocket';
    });

    return this.socket;
  }

  reconnectWithFreshToken() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.lastConnectionError = null;

    return this.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  cleanup(listeners?: SocketListener[]) {
    if (!this.socket) return;

    if (!listeners) {
      this.socket.removeAllListeners();
      return;
    }

    listeners.forEach(({ event, callback }) => {
      if (callback) {
        this.socket?.off(event, callback);
      } else {
        this.socket?.off(event);
      }
    });
  }

  emit(event: string, data: any) {
    if (!this.socket) this.connect();
    this.socket?.emit(event, data);
  }

  get isConnected() {
    return this.socket?.connected || false;
  }

  get connectionError() {
    return this.lastConnectionError;
  }
}

export const socketService = new SocketService();
