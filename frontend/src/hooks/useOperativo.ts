import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socket.service';
import { bahiasService, operativoService } from '../services/operativo.service';
import type { Bahia, BahiaEstado, BahiaModificadaPayload, ConteoGlobalDisponiblesPayload, Movement } from '../types';

interface OperativoStats {
  total: number;
  ocupados: number;
  disponibles: number;
  vehiculosActivos: number;
}

interface Alert {
  id: string;
  tipo: string;
  mensaje: string;
  fecha: Date;
}

/**
 * Hook personalizado para encapsular la lógica del Dashboard Operativo.
 * FEATURE: Maneja la sincronización de estados y la integración con WebSockets.
 */
export const useOperativo = () => {
  const [stats, setStats] = useState<OperativoStats>({ total: 0, ocupados: 0, disponibles: 0, vehiculosActivos: 0 });
  const [bahias, setBahias] = useState<Bahia[]>([]);
  const [vehiculos, setVehiculos] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; tipo: 'success' | 'error' } | null>(null);

  /**
   * Muestra una notificación temporal en la interfaz.
   */
  const showToast = useCallback((msg: string, tipo: 'success' | 'error' = 'success') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 5000);
  }, []);

  /**
   * Mapea el estado de las bahías a una lista de vehículos activos.
   * REFACTOR: Transformación de datos tipada para la UI.
   */
  const mapActivosFromBahias = useCallback((bahiasList: Bahia[]): Movement[] => {
    return bahiasList
      .filter(b => (b as any).ocupada || (b as any).estado === 'OCCUPIED' || (b as any).estado === 'DISCREPANCIA')
      .map(b => ({
        idMovimiento: b.idBahia,
        placa: b.placa || '???-000',
        horaIngreso: b.horaIngreso || new Date().toISOString(),
        bahia: b.nombreBahia,
        estado: 'ADENTRO',
        usuario: 'Cargando...'
      }));
  }, []);

  /**
   * Carga inicial de datos desde la API REST.
   * API: Consumo de /dashboard/resumen para sincronización inicial.
   */
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await operativoService.resumenTurno();
      const { ocupacion } = res;
      
      setStats({
        total: ocupacion.total,
        ocupados: ocupacion.ocupados,
        disponibles: ocupacion.disponibles,
        vehiculosActivos: ocupacion.ocupados
      });
      setBahias(ocupacion.bahias);
      setVehiculos(mapActivosFromBahias(ocupacion.bahias));
    } catch (error) {
      showToast('Error de conexión: No se pudieron cargar los datos de infraestructura', 'error');
    } finally {
      setLoading(false);
    }
  }, [mapActivosFromBahias, showToast]);

  /**
   * Procesa una salida rápida desde la tabla de vehículos.
   * API: Consumo de /operativo/registrar-salida.
   */
  const handleQuickSalida = async (placa: string) => {
    try {
      await operativoService.registrarSalida(placa);
      showToast(`Vehículo ${placa} retirado exitosamente`, 'success');
    } catch (error: any) {
      showToast(error.message || error.response?.data?.message || 'No se pudo procesar la salida', 'error');
    }
  };

  useEffect(() => {
    loadInitialData();

    let pollTimer: number | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = window.setInterval(async () => {
        try {
          const ocupacion = await bahiasService.getOcupacion();
          setStats({
            total: ocupacion.total,
            ocupados: ocupacion.ocupados,
            disponibles: ocupacion.disponibles,
            vehiculosActivos: ocupacion.ocupados,
          });
          setBahias(ocupacion.bahias);
          setVehiculos(mapActivosFromBahias(ocupacion.bahias));
        } catch {
        }
      }, 4000);
    };
    startPolling();
    
    // SOCKET: Suscripción a eventos operativos realtime
    const handleConteoGlobal = (data: ConteoGlobalDisponiblesPayload) => {
      setStats({
        total: data.total,
        ocupados: data.ocupados,
        disponibles: data.disponibles,
        vehiculosActivos: data.ocupados,
      });

      if (data.disponibles === 0 && data.total > 0) {
        setAlerts(prev => {
          if (prev.some(a => a.id === 'full-alert')) return prev;
          return [{
            id: 'full-alert',
            tipo: 'SISTEMA',
            mensaje: '¡CAPACIDAD MÁXIMA ALCANZADA! El parqueadero está lleno.',
            fecha: new Date()
          }, ...prev];
        });
      } else {
        setAlerts(prev => prev.filter(a => a.id !== 'full-alert'));
      }
    };

    const mapNuevoEstadoToBahiaEstado = (nuevo: BahiaModificadaPayload['nuevoEstado']): BahiaEstado => {
      switch (nuevo) {
        case 'LIBRE':
          return 'AVAILABLE';
        case 'OCUPADO':
          return 'OCCUPIED';
        case 'TRANSITO':
          return 'TRANSITO';
        case 'DISCREPANCIA':
          return 'DISCREPANCIA';
        case 'OFFLINE':
          return 'OFFLINE';
        case 'DESHABILITADO':
          return 'DISABLED';
        default:
          return 'AVAILABLE';
      }
    };

    const parseIdBahia = (value: string) => {
      const match = String(value || '').match(/(\d+)/);
      return match ? Number(match[1]) : null;
    };

    const handleBahiaModificada = (data: BahiaModificadaPayload) => {
      const id = parseIdBahia(data.idBahia);
      if (!id) return;

      const estado = mapNuevoEstadoToBahiaEstado(data.nuevoEstado);

      setBahias(prev => (Array.isArray(prev) ? prev.map((b: any) => (b.idBahia === id ? { ...b, estado } : b)) : prev));
    };

    const handleIngreso = (data: any) => {
      showToast(`Nuevo ingreso detectado: ${data.placa} en ${data.bahia}`, 'success');
    };

    const handleRetirado = (data: any) => {
      showToast(`Salida detectada: ${data.placa}`, 'success');
    };

    const handleAlerta = (data: any) => {
      setAlerts(prev => [{
        id: Math.random().toString(),
        tipo: data.tipo,
        mensaje: data.mensaje,
        fecha: data.fecha
      }, ...prev]);
    };

    const handleSensorOffline = (data: any) => {
      setAlerts(prev => [{
        id: Math.random().toString(),
        tipo: 'SENSOR_OFFLINE',
        mensaje: `Pérdida de conexión con sensor ${data.sensorId} (Bahía ${data.idBahia})`,
        fecha: data.fecha
      }, ...prev]);

      if (data.idBahia) {
        setBahias(prev => prev.map(b => 
          b.idBahia === data.idBahia ? { ...b, fueraServicio: true } : b
        ));
      }
    };

    socketService.on('conteo_global_disponibles', handleConteoGlobal);
    socketService.on('bahia_modificada', handleBahiaModificada);
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
      socketService.off('bahia_modificada', handleBahiaModificada);
      socketService.off('vehiculo_ingresado', handleIngreso);
      socketService.off('vehiculo_retirado', handleRetirado);
      socketService.off('alerta_parqueadero', handleAlerta);
      socketService.off('sensor_offline', handleSensorOffline);
    };
  }, [loadInitialData, mapActivosFromBahias, showToast]);

  return {
    stats,
    bahias,
    vehiculos,
    alerts,
    loading,
    toast,
    showToast,
    handleQuickSalida,
    refresh: loadInitialData
  };
};
