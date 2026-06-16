import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { bahiasService, operativoService } from '../services/operativo.service';
import type {
  BahiaSensorizada,
  EstadoPanel,
  BahiaModificadaPayload,
  ConteoGlobalDisponiblesPayload,
  Movement,
} from '../types';

interface OperativoStats {
  total: number;
  ocupados: number;
  disponibles: number;
  vehiculosActivos: number;
  enTransitoIngreso: number;
}

interface Alert {
  id: string;
  tipo: string;
  mensaje: string;
  fecha: Date;
}

export const useOperativo = () => {
  const [stats, setStats] = useState<OperativoStats>({
    total: 0,
    ocupados: 0,
    disponibles: 0,
    vehiculosActivos: 0,
    enTransitoIngreso: 0,
  });
  const [bahias, setBahias] = useState<BahiaSensorizada[]>([]);
  const [vehiculos, setVehiculos] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, tipo: 'success' | 'error' = 'success') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const mapActivosFromSensorizadas = useCallback((lista: BahiaSensorizada[]): Movement[] => {
    return lista
      .filter((b) => b.placa && (b.estadoPanel === 'OCUPADO' || b.estadoPanel === 'SALIDA_PENDIENTE'))
      .map((b) => ({
        idMovimiento: b.idBahia,
        placa: b.placa ?? '???',
        horaIngreso: b.ultimaTelemetriaAt ?? new Date().toISOString(),
        bahia: b.nombreBahia,
        estado: b.estadoPanel === 'SALIDA_PENDIENTE' ? 'SALIDA_PENDIENTE' : 'ADENTRO',
        usuario: 'Cargando...',
      }));
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);

      const [sensorizadas, ocupacion] = await Promise.all([
        bahiasService.getSensorizadas() as Promise<BahiaSensorizada[]>,
        bahiasService.getOcupacion(),
      ]);

      setBahias(sensorizadas);
      setVehiculos(mapActivosFromSensorizadas(sensorizadas));

      const total = Number(ocupacion?.total ?? 0);
      const ocupados = Number(ocupacion?.ocupados ?? 0);
      const disponibles = Math.max(total - ocupados, 0);

      setStats({
        total,
        ocupados,
        disponibles,
        vehiculosActivos: ocupados,
        enTransitoIngreso: 0,
      });
    } catch {
      showToast('Error de conexión: no se pudieron cargar los datos de infraestructura', 'error');
    } finally {
      setLoading(false);
    }
  }, [mapActivosFromSensorizadas, showToast]);

  const handleQuickSalida = async (placa: string) => {
    try {
      await operativoService.registrarSalida(placa);
      showToast(`Vehículo ${placa} retirado exitosamente`, 'success');
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || error?.message || 'No se pudo procesar la salida',
        'error',
      );
    }
  };

  useEffect(() => {
    socketService.reconnectWithFreshToken();

    loadInitialData();

    let pollTimer: ReturnType<typeof window.setInterval> | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = window.setInterval(async () => {
        try {
          const sensorizadas = (await bahiasService.getSensorizadas()) as BahiaSensorizada[];
          setBahias(sensorizadas);
          setVehiculos(mapActivosFromSensorizadas(sensorizadas));
        } catch {
        }
      }, 4000);
    };
    startPolling();

    const handleConteoGlobal = (data: ConteoGlobalDisponiblesPayload) => {
      setStats((prev) => ({
        ...prev,
        total: data.total,
        ocupados: data.ocupados,
        disponibles: data.disponibles,
        vehiculosActivos: data.ocupados,
      }));

      if (data.disponibles === 0 && data.total > 0) {
        setAlerts((prev) =>
          prev.some((a) => a.id === 'full-alert')
            ? prev
            : [
                {
                  id: 'full-alert',
                  tipo: 'SISTEMA',
                  mensaje: '¡CAPACIDAD MÁXIMA ALCANZADA! El parqueadero está lleno.',
                  fecha: new Date(),
                },
                ...prev,
              ],
        );
      } else {
        setAlerts((prev) => prev.filter((a) => a.id !== 'full-alert'));
      }
    };

    const mapNuevoEstadoToEstadoPanel = (
      nuevoEstado: BahiaModificadaPayload['nuevoEstado'],
    ): EstadoPanel => {
      switch (nuevoEstado) {
        case 'OCUPADO':
          return 'OCUPADO';
        case 'LIBRE':
          return 'LIBRE';
        case 'TRANSITO':
          return 'SALIDA_PENDIENTE';
        case 'DISCREPANCIA':
          return 'DISCREPANCIA';
        case 'OFFLINE':
          return 'OFFLINE';
        case 'DESHABILITADO':
          return 'DESHABILITADO';
        default:
          return 'LIBRE';
      }
    };

    const parseIdBahia = (value: string) => {
      const match = String(value || '').match(/(\d+)/);
      return match ? Number(match[1]) : null;
    };

    const handleBahiaModificada = async (data: BahiaModificadaPayload) => {
      const id = parseIdBahia(data.idBahia);
      if (id) {
        const estadoPanel = mapNuevoEstadoToEstadoPanel(data.nuevoEstado);
        setBahias((prev) =>
          Array.isArray(prev)
            ? prev.map((b) => (b.idBahia === id ? { ...b, estadoPanel } : b))
            : prev,
        );
      }
      try {
        const sensorizadas = (await bahiasService.getSensorizadas()) as BahiaSensorizada[];
        setBahias(sensorizadas);
        setVehiculos(mapActivosFromSensorizadas(sensorizadas));
      } catch {
      }
    };

    const handleIngreso = (data: any) => {
      const bahiaInfo = data.bahia === 'EN_TRANSITO' ? 'en tránsito (bahía por asignar)' : `en ${data.bahia}`;
      showToast(`Nuevo ingreso: ${data.placa} — ${bahiaInfo}`, 'success');
      if (data.bahia !== 'EN_TRANSITO') {
        setStats((prev) => ({ ...prev, enTransitoIngreso: Math.max(0, prev.enTransitoIngreso - 1) }));
      } else {
        setStats((prev) => ({ ...prev, enTransitoIngreso: prev.enTransitoIngreso + 1 }));
      }
    };

    const handleRetirado = (data: any) => {
      showToast(`Salida registrada: ${data.placa}`, 'success');
    };

    const handleAlerta = (data: any) => {
      setAlerts((prev) => [
        { id: Math.random().toString(), tipo: data.tipo, mensaje: data.mensaje, fecha: data.fecha },
        ...prev,
      ]);
    };

    const handleSensorOffline = (data: any) => {
      setAlerts((prev) => [
        {
          id: Math.random().toString(),
          tipo: 'SENSOR_OFFLINE',
          mensaje: `Pérdida de conexión con sensor ${data.sensorId} (Bahía ${data.idBahia})`,
          fecha: data.fecha,
        },
        ...prev,
      ]);

      if (data.idBahia) {
        setBahias((prev) =>
          prev.map((b) =>
            b.idBahia === data.idBahia ? { ...b, estadoPanel: 'OFFLINE' as EstadoPanel } : b,
          ),
        );
      }
    };

    const onBahiaModificada = (data: BahiaModificadaPayload) => void handleBahiaModificada(data);

    socketService.on('conteo_global_disponibles', handleConteoGlobal);
    socketService.on('bahia_modificada', onBahiaModificada);
    socketService.on('vehiculo_ingresado', handleIngreso);
    socketService.on('vehiculo_retirado', handleRetirado);
    socketService.on('alerta_parqueadero', handleAlerta);
    socketService.on('sensor_offline', handleSensorOffline);

    return () => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
      }
      socketService.off('conteo_global_disponibles', handleConteoGlobal);
      socketService.off('bahia_modificada', onBahiaModificada);
      socketService.off('vehiculo_ingresado', handleIngreso);
      socketService.off('vehiculo_retirado', handleRetirado);
      socketService.off('alerta_parqueadero', handleAlerta);
      socketService.off('sensor_offline', handleSensorOffline);
    };
  }, [loadInitialData, mapActivosFromSensorizadas, showToast]);

  return {
    stats,
    bahias,
    vehiculos,
    alerts,
    loading,
    toast,
    showToast,
    handleQuickSalida,
    refresh: loadInitialData,
  };
};
