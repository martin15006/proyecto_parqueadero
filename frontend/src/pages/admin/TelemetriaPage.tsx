import React from 'react';
import { 
  Wifi, WifiOff, RefreshCw, Activity, 
  AlertTriangle, Cpu, MapPin, Clock 
} from 'lucide-react';
import { useTelemetria } from '../../hooks/useTelemetria';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/common/StatCard';

/**
 * Página de Telemetría (Admin).
 * Monitorea el estado de los sensores IoT y la salud de la infraestructura.
 */
export const TelemetriaPage: React.FC = () => {
  const { sensores, loading, error, forceCheck, refresh } = useTelemetria();

  const getEstadoSensor = (ultimaLectura: string) => {
    if (!ultimaLectura) return { label: 'Sin Datos', variant: 'neutral' as const };
    const diff = Date.now() - new Date(ultimaLectura).getTime();
    const isOnline = diff < 5 * 60000; // 5 minutos de umbral
    
    return isOnline 
      ? { label: 'Online', variant: 'success' as const }
      : { label: 'Offline', variant: 'error' as const };
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Sincronizando Sensores...</p>
      </div>
    );
  }

  const sensoresOnline = sensores.filter(s => getEstadoSensor(s.ultimaLectura).label === 'Online').length;
  const sensoresOffline = sensores.filter(s => getEstadoSensor(s.ultimaLectura).label === 'Offline').length;

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Telemetría IoT</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Salud de Infraestructura y Sensores</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" size="md" onClick={refresh}>
            <RefreshCw size={14} className="mr-2" /> Actualizar
          </Button>
          <Button variant="primary" size="md" onClick={forceCheck}>
            <Activity size={14} className="mr-2" /> Forzar Diagnóstico
          </Button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-center gap-4 text-red-600 shadow-xl shadow-red-500/5">
          <AlertTriangle size={24} />
          <p className="font-bold text-sm uppercase tracking-tight">{error}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Cpu className="text-blue-500" />} label="Sensores Totales" value={sensores.length} />
        <StatCard icon={<Wifi className="text-green-500" />} label="Dispositivos Online" value={sensoresOnline} />
        <StatCard icon={<WifiOff className="text-red-500" />} label="Alertas Críticas" value={sensoresOffline} isCritical={sensoresOffline > 0} />
      </div>

      {/* Grid de Sensores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sensores.map((sensor) => {
          const { label, variant } = getEstadoSensor(sensor.ultimaLectura);
          return (
            <div 
              key={sensor.idSensor} 
              className="bg-white border border-gray-100 rounded-[3rem] p-8 hover:shadow-xl hover:shadow-gray-200/50 transition-all group relative overflow-hidden"
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

      {sensores.length === 0 && !loading && (
        <div className="text-center py-32 bg-gray-100/50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No se detectaron sensores en la red</p>
        </div>
      )}
    </div>
  );
};
