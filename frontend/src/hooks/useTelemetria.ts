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
    socketService.on('broadcast_sensor', (data: { codigo: string; valor: any }) => {
      setSensores(prev => prev.map(s => 
        s.codigo === data.codigo 
          ? { ...s, ultimaLectura: new Date().toISOString(), ocupado: data.valor.ocupado } 
          : s
      ));
    });

    // Listener para sensores que se desconectan
    socketService.on('alerta_sensor', (alerta: any) => {
      console.warn('Alerta de sensor recibida:', alerta);
      // Aquí se podrían inyectar notificaciones globales
    });

    return () => {
      socketService.off('broadcast_sensor');
      socketService.off('alerta_sensor');
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
