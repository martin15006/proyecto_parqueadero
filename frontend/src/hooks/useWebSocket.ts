import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '../services/socket.service';

export const useWebSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ event: string; data: any } | null>(null);

  useEffect(() => {
    const s = socketService.connect();
    setSocket(s);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const events = [
      'vehiculo_ingresado',
      'vehiculo_retirado',
      'ocupacion_actualizada',
      'alerta_parqueadero',
      'sensor_offline'
    ];

    const eventCallbacks: Record<string, (data: any) => void> = {};

    events.forEach(event => {
      eventCallbacks[event] = (data: any) => {
        setLastEvent({ event, data });
      };
      socketService.on(event, eventCallbacks[event]);
    });

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    setIsConnected(socketService.isConnected);

    return () => {
      socketService.cleanup([
        ...events.map(event => ({ event, callback: eventCallbacks[event] })),
        { event: 'connect', callback: handleConnect },
        { event: 'disconnect', callback: handleDisconnect },
      ]);
    };
  }, []);

  return { isConnected, lastEvent, socket };
};
