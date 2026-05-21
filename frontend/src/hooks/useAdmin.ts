import { useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/operativo.service';
import { socketService } from '../services/socket.service';
import type { DashboardStats } from '../types';

/**
 * Hook personalizado para encapsular la lógica del Dashboard Administrativo.
 * FEATURE: Maneja la carga de analíticas, estadísticas históricas e integración realtime.
 */
export const useAdmin = () => {
  const [resumen, setResumen] = useState<DashboardStats | null>(null);
  const [trafico, setTrafico] = useState<any[]>([]);
  const [ocupacionTipo, setOcupacionTipo] = useState<any[]>([]);
  const [tendencia, setTendencia] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Orquestador de carga de datos masiva desde la API de analíticas.
   * API: Consumo de endpoints de analíticas del DashboardController.
   */
  const loadAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, traf, ocup, estad, heat] = await Promise.all([
        dashboardService.getResumen(),
        dashboardService.getTraficoHoras(),
        dashboardService.getOcupacionTipo(),
        dashboardService.getEstadisticas(),
        dashboardService.getHeatmap()
      ]);
      
      setResumen(res);
      setTrafico(traf);
      setOcupacionTipo(ocup);
      setTendencia(estad);
      setHeatmap(heat);
      setError(null);
    } catch (err) {
      console.error('Error crítico en carga de analíticas:', err);
      setError('No se pudo establecer conexión con el motor de analíticas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
    
    // SOCKET: Sincronización Realtime para KPIs Gerenciales
    const handleOcupacion = (data: any) => {
      setResumen((prev) => prev ? ({
        ...prev,
        ocupacion: {
          total: data.total,
          ocupados: data.ocupados,
          disponibles: data.disponibles
        }
      }) : null);
    };

    const handleIngreso = () => {
      setResumen((prev) => prev ? ({ ...prev, ingresosHoy: (prev.ingresosHoy || 0) + 1 }) : null);
    };

    socketService.on('ocupacion_actualizada', handleOcupacion);
    socketService.on('vehiculo_ingresado', handleIngreso);

    return () => {
      socketService.off('ocupacion_actualizada', handleOcupacion);
      socketService.off('vehiculo_ingresado', handleIngreso);
    };
  }, [loadAdminData]);

  return {
    resumen,
    trafico,
    ocupacionTipo,
    tendencia,
    heatmap,
    loading,
    error,
    refresh: loadAdminData
  };
};
