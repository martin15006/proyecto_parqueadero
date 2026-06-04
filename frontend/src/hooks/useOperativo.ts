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
  /** Incluye vehículos ADENTRO + en SALIDA_PENDIENTE. */
  vehiculosActivos: number;
  /** Vehículos en tránsito de ingreso (QR escaneado, sin bahía asignada aún). */
  enTransitoIngreso: number;
}

interface Alert {
  id: string;
  tipo: string;
  mensaje: string;
  fecha: Date;
}

/**
 * Hook del Panel Operativo.
 *
 * - Fuente de verdad para el mapa de bahías: `GET /bahias/sensorizadas`
 *   (solo las 3 bahías con sensor activo, con `estadoPanel` pre-calculado).
 * - Los conteos globales se mantienen desde `GET /operativo/resumen-turno`
 *   y se actualizan en tiempo real vía WebSocket `conteo_global_disponibles`.
 * - Polling de 4 segundos como respaldo cuando el socket no está disponible.
 */
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

  /** Extrae la lista de movimientos activos desde las bahías sensorizadas. */
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

  /**
   * Carga inicial desde REST.
   * - Bahías sensorizadas → mapa del panel (solo las 3 activas).
   * - Resumen de turno → conteos y alertas técnicas.
   */
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // Conteo global → fuente única de verdad para total/ocupados/disponibles.
      // Estos valores vienen del backend basados en QRs ACTIVOS (movimientos),
      // no en sensores. Cada QR de entrada sube +1, cada QR de salida baja -1.
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
    // Garantizar que el socket use el JWT vigente antes de suscribir listeners
    // o cargar datos: destruye cualquier conexión previa con token expirado y abre
    // una nueva con el access_token más reciente del localStorage.
    socketService.reconnectWithFreshToken();

    loadInitialData();

    // ── Polling de respaldo ─────────────────────────────────────────────────
    let pollTimer: ReturnType<typeof window.setInterval> | null = null;
    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = window.setInterval(async () => {
        try {
          const sensorizadas = (await bahiasService.getSensorizadas()) as BahiaSensorizada[];
          setBahias(sensorizadas);
          setVehiculos(mapActivosFromSensorizadas(sensorizadas));
        } catch {
          // fallo silencioso — el socket es la fuente principal
        }
      }, 4000);
    };
    startPolling();

    // ── Handlers WebSocket ──────────────────────────────────────────────────

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

    /**
     * Cuando llega `bahia_modificada`, actualizamos el `estadoPanel` de la
     * bahía afectada mapeando el `nuevoEstado` (formato backend reconciliado)
     * al `EstadoPanel` que usa el frontend.
     */
    const mapNuevoEstadoToEstadoPanel = (
      nuevoEstado: BahiaModificadaPayload['nuevoEstado'],
    ): EstadoPanel => {
      switch (nuevoEstado) {
        case 'OCUPADO':
          return 'OCUPADO';
        case 'LIBRE':
          return 'LIBRE';
        case 'TRANSITO':
          // El backend emite TRANSITO cuando la bahía tiene salida pendiente
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

    /**
     * Handler de `bahia_modificada` en dos fases:
     *
     * **Fase 1 — optimista** (síncrona, 0 ms):
     * Actualiza `estadoPanel` de la bahía afectada usando la tabla local de
     * mapeo. El color cambia instantáneamente en pantalla.
     *
     * **Fase 2 — autoritativa** (asíncrona, ~1 RTT):
     * Re-fetcha `/bahias/sensorizadas` para obtener el `estadoPanel` real del
     * backend (que incluye `SALIDA_PENDIENTE` cuando bahía=LIBRE + movimiento
     * TRANSITO con bahía) y la `placa` del vehículo vinculado.
     * Si el fetch falla, la actualización optimista permanece.
     */
    const handleBahiaModificada = async (data: BahiaModificadaPayload) => {
      // Fase 1: color inmediato
      const id = parseIdBahia(data.idBahia);
      if (id) {
        const estadoPanel = mapNuevoEstadoToEstadoPanel(data.nuevoEstado);
        setBahias((prev) =>
          Array.isArray(prev)
            ? prev.map((b) => (b.idBahia === id ? { ...b, estadoPanel } : b))
            : prev,
        );
      }
      // Fase 2: estado completo (placa + SALIDA_PENDIENTE correcto)
      try {
        const sensorizadas = (await bahiasService.getSensorizadas()) as BahiaSensorizada[];
        setBahias(sensorizadas);
        setVehiculos(mapActivosFromSensorizadas(sensorizadas));
      } catch {
        // actualización optimista ya aplicada — se mantiene
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

    // El wrapper void evita que TypeScript infiera `Promise` en la firma del listener.
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
