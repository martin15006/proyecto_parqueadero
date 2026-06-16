import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { telemetriaService } from '../services/telemetria.service';


export const useTelemetria = () => {

  const [sensores, setSensores] = useState<Array<{
    idSensor?: number;
    codigo: string;
    idBahia: number;
    estadoActual?: string;
    ultimaLectura?: string;
    bateria?: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSensores = useCallback(async () => {
    try {
      setLoading(true);
      const data = await telemetriaService.getSensores();
      setSensores(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setSensores([]);
      setError('Error al conectar con el servicio de telemetría.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSensores();
    socketService.connect();

    const handleBahiaModificada = (payload: { idBahia: string; nuevoEstado: string; actualizadoEn: string }) => {
      const match = String(payload?.idBahia || '').match(/(\d+)/);
      const idBahia = match ? Number(match[1]) : null;
      if (!idBahia) return;
      setSensores((prev) =>
        prev.map((s) =>
          s.idBahia === idBahia
            ? {
                ...s,
                estadoActual: payload.nuevoEstado,
                ultimaLectura: payload.actualizadoEn || new Date().toISOString(),
              }
            : s,
        ),
      );
    };

    const handleSensorOffline = (payload: { sensorId: string; idBahia: number; fecha: string }) => {
      setSensores((prev) =>
        prev.map((s) =>
          s.codigo === payload.sensorId
            ? {
                ...s,
                idBahia: payload.idBahia,
                estadoActual: 'OFFLINE',
              }
            : s,
        ),
      );
    };

    socketService.on('bahia_modificada', handleBahiaModificada);
    socketService.on('sensor_offline', handleSensorOffline);

    return () => {
      socketService.cleanup([
        { event: 'bahia_modificada', callback: handleBahiaModificada },
        { event: 'sensor_offline', callback: handleSensorOffline },
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
