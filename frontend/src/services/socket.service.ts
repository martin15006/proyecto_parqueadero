import { io, Socket } from 'socket.io-client';

type SocketListener = {
  event: string;
  callback?: (...args: any[]) => void;
};

class SocketService {
  private socket: Socket | null = null;
  private readonly URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  private lastConnectionError: string | null = null;

  /** Lee el token JWT más reciente desde localStorage (soporta los tres formatos de clave). */
  private readToken(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.accessToken || user.access_token || user.token || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Establece una conexión con el servidor de WebSockets.
   *
   * Si ya existe una instancia conectada la reutiliza (patrón singleton por ciclo de vida).
   * Si existe pero está en estado `disconnected` (p.ej. JWT expirado silenciosamente),
   * la destruye limpiamente antes de crear una nueva con el token fresco del localStorage.
   */
  connect() {
    // Reutilizar solo si el socket existe Y está actualmente conectado.
    if (this.socket?.connected) {
      return this.socket;
    }

    // Socket huérfano (expiró, fue desconectado o se cerró): limpiar antes de recrear.
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

  /**
   * Destruye la conexión actual (incluyendo todos sus listeners) y crea una nueva
   * leyendo el token más reciente del localStorage.
   *
   * Usar cuando el componente monta para garantizar que el socket use el JWT vigente
   * y no uno que haya expirado silenciosamente durante la sesión anterior.
   */
  reconnectWithFreshToken() {
    // Desconectar y purgar listeners de la sesión anterior.
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.lastConnectionError = null;

    // Crear nueva conexión con el token fresco.
    return this.connect();
  }

  /**
   * Cierra la conexión y limpia la instancia.
   */
  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
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

  /**
   * Último error de conexión capturado por Socket.IO.
   * Nota: No se usa para invalidar sesión; solo para diagnóstico visual si la UI lo desea.
   */
  get connectionError() {
    return this.lastConnectionError;
  }
}

export const socketService = new SocketService();
