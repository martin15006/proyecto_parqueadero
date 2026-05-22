import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { telemetriaService } from '../services/telemetria.service';

/**
 * Hook para la gestión de telemetría y sensores en tiempo real.
 */
export const useTelemetria = () => {
  const [sensores, setSensores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSensores = useCallback(async () => {
    try {
      setLoading(true);
      const data = await telemetriaService.getSensores();
      setSensores(data);
      setError(null);
    } catch (err) {
      console.error('Error cargando sensores:', err);
      setError('Error al conectar con el servicio de telemetría.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSensores();
    socketService.connect();

    // Listener para datos de sensores en tiempo real
    const handleBroadcastSensor = (data: { codigo: string; valor: any }) => {
      setSensores(prev => prev.map(s => 
        s.codigo === data.codigo 
          ? { ...s, ultimaLectura: new Date().toISOString(), ocupado: data.valor.ocupado } 
          : s
      ));
    };

    // Listener para sensores que se desconectan
    const handleAlertaSensor = (alerta: any) => {
      console.warn('Alerta de sensor recibida:', alerta);
      // Aquí se podrían inyectar notificaciones globales
    };

    socketService.on('broadcast_sensor', handleBroadcastSensor);
    socketService.on('alerta_sensor', handleAlertaSensor);

    return () => {
      socketService.cleanup([
        { event: 'broadcast_sensor', callback: handleBroadcastSensor },
        { event: 'alerta_sensor', callback: handleAlertaSensor },
      ]);
    };
  }, [loadSensores]);

  const forceCheck = async () => {
    try {
      await telemetriaService.testOffline();
      await loadSensores();
    } catch (err) {
      setError('No se pudo forzar el chequeo de infraestructura.');
    }
  };

  return { 
    sensores, 
    loading, 
    error, 
    forceCheck,
    refresh: loadSensores 
  };
};
