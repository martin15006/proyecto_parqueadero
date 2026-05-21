import React from 'react';
import { 
  Wifi, WifiOff, RefreshCw, Activity, 
  AlertTriangle, Cpu, MapPin, Clock 
} from 'lucide-react';
import { useTelemetria } from '../../hooks/useTelemetria';

/**
 * Página de Telemetría (Admin).
 * Monitorea el estado de los sensores IoT y la salud de la infraestructura.
 */
export const TelemetriaPage: React.FC = () => {
  const { sensores, loading, error, forceCheck, refresh } = useTelemetria();

  const getEstadoSensor = (ultimaLectura: string) => {
    if (!ultimaLectura) return { label: 'Sin Datos', color: 'text-gray-400', bg: 'bg-gray-50' };
    const diff = Date.now() - new Date(ultimaLectura).getTime();
    const isOnline = diff < 5 * 60000; // 5 minutos de umbral
    
    return isOnline 
      ? { label: 'Online', color: 'text-green-500', bg: 'bg-green-50' }
      : { label: 'Offline', color: 'text-red-500', bg: 'bg-red-50' };
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Sincronizando Sensores...</p>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
              <Cpu size={18} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Telemetría IoT</h1>
          </div>
          <p className="text-gray-500 font-medium">Monitoreo en tiempo real de la infraestructura de sensores.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={refresh}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
          <button 
            onClick={forceCheck}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Activity size={14} /> Forzar Diagnóstico
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center gap-4 text-red-600">
          <AlertTriangle size={24} />
          <p className="font-bold text-sm">{error}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-2">
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Sensores Totales</p>
          <p className="text-4xl font-black text-gray-900">{sensores.length}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-2">
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Dispositivos Online</p>
          <p className="text-4xl font-black text-green-500">
            {sensores.filter(s => getEstadoSensor(s.ultimaLectura).label === 'Online').length}
          </p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-2">
          <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Alertas Críticas</p>
          <p className="text-4xl font-black text-red-500">
            {sensores.filter(s => getEstadoSensor(s.ultimaLectura).label === 'Offline').length}
          </p>
        </div>
      </div>

      {/* Grid de Sensores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sensores.map((sensor) => {
          const estado = getEstadoSensor(sensor.ultimaLectura);
          return (
            <div 
              key={sensor.idSensor} 
              className="bg-white border border-gray-100 rounded-[2.5rem] p-8 hover:shadow-xl transition-all group relative overflow-hidden"
            >
              {/* Status Badge */}
              <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl font-black text-[9px] uppercase tracking-widest ${estado.bg} ${estado.color}`}>
                {estado.label}
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${estado.bg} ${estado.color} transition-colors`}>
                    {estado.label === 'Online' ? <Wifi size={24} /> : <WifiOff size={24} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{sensor.codigo}</h3>
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <MapPin size={12} />
                      <span className="text-[10px] font-bold uppercase">Bahía ID: {sensor.idBahia}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold uppercase">
                      {sensor.ultimaLectura 
                        ? new Date(sensor.ultimaLectura).toLocaleTimeString() 
                        : 'Nunca reportado'}
                    </span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${estado.label === 'Online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sensores.length === 0 && !loading && (
        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No se encontraron sensores registrados</p>
        </div>
      )}
    </div>
  );
};
