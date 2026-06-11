import React, { useEffect, useMemo, useState } from 'react';
import { 
  Wifi, WifiOff, RefreshCw, Activity, 
  AlertTriangle, Cpu, MapPin, Clock, ChevronDown
} from 'lucide-react';
import { useTelemetria } from '../../hooks/useTelemetria';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/common/StatCard';
import { socketService } from '../../services/socket.service';
import { useAuth } from '../../AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { parqueaderoAdminService } from '../../services/parqueadero-admin.service';
import { telemetriaService } from '../../services/telemetria.service';

type InfraBahiaEstado = 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';

type InfraBahia = {
  id: number;
  numeroBahia: number;
  estado: InfraBahiaEstado;
  idSensor: string | null;
  updatedAt: string | null;
};

const buildBahiasBase = (): InfraBahia[] => {
  return Array.from({ length: 30 }, (_, idx) => {
    const numeroBahia = idx + 1;
    return {
      id: numeroBahia,
      numeroBahia,
      estado: 'DISPONIBLE',
      idSensor: null,
      updatedAt: null,
    };
  });
};

const mapEstadoWsToInfra = (estado?: string, ocupada?: boolean): InfraBahiaEstado => {
  if (estado === 'AVAILABLE') return 'DISPONIBLE';
  if (estado === 'OCCUPIED') return 'OCUPADO';
  if (estado === 'OFFLINE' || estado === 'ERROR' || estado === 'DISABLED') return 'MANTENIMIENTO';
  return ocupada ? 'OCUPADO' : 'DISPONIBLE';
};

/**
 * Página de Telemetría (Admin).
 * Monitorea el estado de los sensores IoT y la salud de la infraestructura.
 */
export const TelemetriaPage: React.FC = () => {
  const { sensores, loading, error, forceCheck, refresh } = useTelemetria();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [bahias2D, setBahias2D] = useState<InfraBahia[]>(() => buildBahiasBase());
  const [simuladorOpen, setSimuladorOpen] = useState(false);
  const [simuladorLoading, setSimuladorLoading] = useState(false);

  /**
   * Heurística de salud del sensor según su última lectura.
   * - Si no hay lectura, se considera "Sin Datos".
   * - Si pasaron más de 5 minutos, se considera Offline para efectos visuales.
   */
  const getEstadoSensor = (ultimaLectura?: string) => {
    if (!ultimaLectura) return { label: 'Sin Datos', variant: 'neutral' as const };
    const diff = Date.now() - new Date(ultimaLectura).getTime();
    const isOnline = diff < 5 * 60000; // 5 minutos de umbral
    
    return isOnline 
      ? { label: 'Online', variant: 'success' as const }
      : { label: 'Offline', variant: 'error' as const };
  };

  useEffect(() => {
    socketService.connect();

    /**
     * ============================================================
     *  BLOQUE RESERVADO PARA INTEGRACIÓN IoT (PEGAR AQUÍ)
     * ============================================================
     *
     * OBJETIVO:
     * - Recibir eventos por WebSocket del backend (lecturas de sensores reales).
     * - Traducir el payload del sensor a un cambio de estado de una bahía.
     * - Actualizar el estado local `bahias2D` SIN romper la UI si no hay datos.
     *
     * DÓNDE CONECTARSE:
     * - Este frontend usa `socketService` (Socket.IO) hacia el backend.
     * - El backend emite eventos en el Gateway principal:
     *   - Evento: 'bahia_actualizada'  (payload incluye idBahia, ocupada, sensor, estado?)
     *   - Evento: 'sensor_offline'     (payload incluye sensorId, idBahia, fecha)
     *
     * INSTRUCCIONES PARA MI COMPAÑERO (IoT):
     * 1) Si el hardware emite un evento distinto (p.ej. 'sensor_data'), NORMALIZA en backend
     *    para que siempre termine emitiéndose 'bahia_actualizada' con `idBahia` y `estado`.
     * 2) En este bloque, si decides consumir otro evento adicional, hazlo con:
     *      socketService.on('<evento>', (payload) => { ... })
     * 3) Al recibir la lectura, actualiza SOLO la bahía objetivo:
     *      setBahias2D(prev => prev.map(b => b.id === idBahia ? {...b, estado: 'OCUPADO'} : b))
     * 4) Nunca asumas que el WS está conectado: si no hay eventos, el mapa queda en DISPONIBLE.
     *
     * ============================================================
     */

    const handleBahiaActualizada = (payload: { idBahia: number; ocupada: boolean; sensor: string; estado?: string }) => {
      if (!payload?.idBahia || payload.idBahia < 1 || payload.idBahia > 30) return;

      setBahias2D((prev) =>
        prev.map((b) =>
          b.id === payload.idBahia
            ? {
                ...b,
                estado: mapEstadoWsToInfra(payload.estado, payload.ocupada),
                idSensor: payload.sensor ?? b.idSensor,
                updatedAt: new Date().toISOString(),
              }
            : b,
        ),
      );
    };

    const handleSensorOffline = (payload: { sensorId: string; idBahia: number; fecha: string }) => {
      if (!payload?.idBahia || payload.idBahia < 1 || payload.idBahia > 30) return;

      setBahias2D((prev) =>
        prev.map((b) =>
          b.id === payload.idBahia
            ? {
                ...b,
                estado: 'MANTENIMIENTO',
                idSensor: payload.sensorId ?? b.idSensor,
                updatedAt: payload.fecha ? new Date(payload.fecha).toISOString() : new Date().toISOString(),
              }
            : b,
        ),
      );
    };

    const handleAlertaParqueadero = (payload: { tipo?: string; mensaje?: string }) => {
      const mensaje = String(payload?.mensaje || '').trim();
      if (!mensaje) return;
      const tipo = String(payload?.tipo || '').toUpperCase();
      const notificationType: 'error' | 'warning' | 'info' =
        tipo.includes('ERROR') || tipo.includes('FALLA') || tipo.includes('CRIT')
          ? 'error'
          : (tipo.includes('WARN') ? 'warning' : 'info');
      showNotification(mensaje, notificationType);
    };

    socketService.on('bahia_actualizada', handleBahiaActualizada);
    socketService.on('sensor_offline', handleSensorOffline);
    socketService.on('alerta_parqueadero', handleAlertaParqueadero);

    return () => {
      socketService.cleanup([
        { event: 'bahia_actualizada', callback: handleBahiaActualizada },
        { event: 'sensor_offline', callback: handleSensorOffline },
        { event: 'alerta_parqueadero', callback: handleAlertaParqueadero },
      ]);
    };
  }, [showNotification]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Sincronizando Sensores...</p>
      </div>
    );
  }

  const sensoresSafe = useMemo(() => (Array.isArray(sensores) ? sensores : []), [sensores]);
  const sensoresOnline = sensoresSafe.filter(s => getEstadoSensor(s.ultimaLectura).label === 'Online').length;
  const sensoresOffline = sensoresSafe.filter(s => getEstadoSensor(s.ultimaLectura).label === 'Offline').length;

  const legend = useMemo(() => ([
    { label: 'Disponible', className: 'bg-emerald-500' },
    { label: 'Ocupado', className: 'bg-rose-500' },
    { label: 'Mantenimiento', className: 'bg-gray-400' },
  ]), []);

  /**
   * El simulador solo debe verse en desarrollo o para cuentas ADMIN.
   * Esto permite preparar la demo local sin exponer controles no operativos en producción.
   */
  const canSeeSimulator = useMemo(() => {
    const idRol = parseInt(String(user?.usuario?.idTipoUsr || 0), 10);
    const isAdmin = idRol === 2;
    return Boolean(import.meta.env.DEV || isAdmin);
  }, [user]);

  /**
   * Simula un ingreso por QR (RF14 + demo de mapa 2D):
   * - Backend fuerza bahía ocupada y emite evento WS.
   * - Backend registra y emite alerta del sistema.
   */
  const simularIngresoQr = async () => {
    try {
      setSimuladorLoading(true);
      await telemetriaService.simularIngresoQr({ idBahia: 5, placa: 'SIM-QR-001' });
      showNotification('Ingreso simulado ejecutado: Bahía 05 ocupada', 'success');
    } catch (e: any) {
      showNotification(e?.message || 'No se pudo simular el ingreso por QR', 'error');
    } finally {
      setSimuladorLoading(false);
    }
  };

  /**
   * Simula un cambio de sensor (Bahía 5) reutilizando el endpoint admin de contingencia.
   * Esto actualiza el estado manual en DB y emite el evento WS que el mapa 2D consume.
   */
  const simularSensorBahia5 = async (estado: 'AVAILABLE' | 'OCCUPIED') => {
    try {
      setSimuladorLoading(true);
      await parqueaderoAdminService.forzarEstadoBahia(5, estado);
      await telemetriaService.simularAlerta({
        tipo: 'SIMULACION_SENSOR',
        mensaje: `Sensor simulado: Bahía 05 => ${estado === 'OCCUPIED' ? 'OCUPADO' : 'DISPONIBLE'}`,
      });
      showNotification(`Sensor simulado aplicado: Bahía 05 => ${estado}`, 'success');
    } catch (e: any) {
      showNotification(e?.message || 'No se pudo simular el sensor', 'error');
    } finally {
      setSimuladorLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 -mt-20 mb-10 relative z-50">
        <div className="flex gap-3">
          <Button variant="outline" size="md" onClick={refresh} className="bg-white">
            <RefreshCw size={14} className="mr-2" /> Actualizar
          </Button>
          <Button variant="primary" size="md" onClick={forceCheck} className="bg-[#39A900] hover:bg-[#2F8A00] shadow-[0_8px_20px_rgba(57,169,0,0.3)]">
            <Activity size={14} className="mr-2" /> Forzar Diagnóstico
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-xl flex items-center gap-4 text-rose-700 shadow-sm">
          <AlertTriangle size={24} />
          <p className="font-bold text-sm uppercase tracking-tight">{error}</p>
        </div>
      )}

      {canSeeSimulator && (
        <section className="bg-white dark:bg-[#121212] p-6 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">Simulador IoT / Eventos (DEMO)</h2>
              <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
                Solo desarrollo / Admin • Sin hardware
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSimuladorOpen((v) => !v)}
            >
              <ChevronDown
                size={14}
                className={`mr-2 transition-transform ${simuladorOpen ? 'rotate-180' : ''}`}
              />
              {simuladorOpen ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>

          {simuladorOpen && (
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" size="sm" onClick={simularIngresoQr} disabled={simuladorLoading}>
                Simular Ingreso Vehículo (QR Escaneado)
              </Button>
              <Button variant="outline" size="sm" onClick={() => simularSensorBahia5('OCCUPIED')} disabled={simuladorLoading}>
                Simular Sensor Bahía 5 Ocupado
              </Button>
              <Button variant="outline" size="sm" onClick={() => simularSensorBahia5('AVAILABLE')} disabled={simuladorLoading}>
                Simular Sensor Bahía 5 Libre
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Cpu className="text-blue-500" />} label="Sensores Totales" value={sensores.length} />
        <StatCard icon={<Wifi className="text-green-500" />} label="Dispositivos Online" value={sensoresOnline} />
        <StatCard icon={<WifiOff className="text-red-500" />} label="Alertas Críticas" value={sensoresOffline} isCritical={sensoresOffline > 0} />
      </div>

      {/* Mapa 2D (Bosquejo) */}
      <section className="bg-white dark:bg-[#121212] p-8 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm space-y-6 transition-colors duration-500">
        <div className="flex flex-col lg:flex-row justify-between gap-4 lg:items-end">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Mapa 2D de Bahías (30)</h2>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
              Infraestructura • Vista de contingencia y base para integración IoT
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
                <span className={`w-3 h-3 rounded-full ${l.className}`} />
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3">
          {bahias2D.map((b) => {
            const color =
              b.estado === 'DISPONIBLE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : b.estado === 'OCUPADO'
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700';

            const nextEstado = (estado: InfraBahiaEstado): InfraBahiaEstado => {
              if (estado === 'DISPONIBLE') return 'OCUPADO';
              if (estado === 'OCUPADO') return 'MANTENIMIENTO';
              return 'DISPONIBLE';
            };

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBahias2D((prev) =>
                    prev.map((x) =>
                      x.id === b.id ? { ...x, estado: nextEstado(x.estado), updatedAt: new Date().toISOString() } : x,
                    ),
                  );
                }}
                className={`relative p-4 rounded-3xl border text-left transition-all hover:shadow-sm ${color}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Bahía</p>
                    <p className="text-xl font-black leading-none">{String(b.numeroBahia).padStart(2, '0')}</p>
                  </div>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      b.estado === 'DISPONIBLE' ? 'bg-emerald-500' : b.estado === 'OCUPADO' ? 'bg-rose-500' : 'bg-gray-400'
                    }`}
                  />
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Estado</p>
                  <p className="text-xs font-black uppercase tracking-widest">{b.estado}</p>
                </div>

                <div className="mt-4 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Sensor</p>
                  <p className="text-xs font-semibold truncate">{b.idSensor || '—'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid de Sensores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sensoresSafe.map((sensor) => {
          const { label, variant } = getEstadoSensor(sensor.ultimaLectura);
          return (
            <div 
              key={sensor.codigo} 
              className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/5 rounded-xl p-8 hover:shadow-sm transition-all duration-200 group relative overflow-hidden"
            >
              {/* Status Badge */}
              <div className="absolute top-0 right-0">
                <Badge variant={variant} className="!rounded-none !rounded-bl-3xl !px-6 !py-2">
                  {label}
                </Badge>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    variant === 'success' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
                  }`}>
                    {variant === 'success' ? <Wifi size={28} /> : <WifiOff size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{sensor.codigo}</h3>
                    <div className="flex items-center gap-1.5 text-gray-400 mt-1">
                      <MapPin size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Bahía: {sensor.idBahia}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {sensor.ultimaLectura 
                        ? new Date(sensor.ultimaLectura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                        : 'Sin reporte'}
                    </span>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${variant === 'success' ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sensoresSafe.length === 0 && !loading && (
        <div className="text-center py-32 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No se detectaron sensores en la red</p>
        </div>
      )}
    </div>
  );
};
