import React, { useState, useEffect } from 'react';
import { bahiasService } from '../../services/telemetria.service';
import { MapPin, Cpu } from 'lucide-react';
import { socketService } from '../../services/socket.service';
import { Badge } from '../../components/ui/Badge';

/**
 * Gestión de Bahías (Admin).
 * Mapa visual de la infraestructura con estados en tiempo real y detalles técnicos.
 */
export const BahiasPage: React.FC = () => {
  const [bahias, setBahias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBahias = async () => {
    try {
      setLoading(true);
      const res = await bahiasService.findAll();
      setBahias(res);
    } catch (error) {
      console.error('Error cargando bahías', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBahias();
    socketService.connect();

    // Sincronización Realtime
    const handleOcupacion = (data: any) => {
      setBahias(prev => prev.map(b => {
        const updated = data.bahias.find((ub: any) => ub.idBahia === b.idBahia);
        return updated ? { ...b, ...updated } : b;
      }));
    };

    const handleSensorOffline = (data: any) => {
      setBahias(prev => prev.map(b => 
        b.idBahia === data.idBahia ? { ...b, fueraServicio: true } : b
      ));
    };

    socketService.on('ocupacion_actualizada', handleOcupacion);
    socketService.on('sensor_offline', handleSensorOffline);

    return () => {
      socketService.cleanup([
        { event: 'ocupacion_actualizada', callback: handleOcupacion },
        { event: 'sensor_offline', callback: handleSensorOffline },
      ]);
    };
  }, []);

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Infraestructura Física</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Mapa de Bahías y Sensores IoT</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <LegendItem variant="success" label="Libre" />
          <LegendItem variant="error" label="Ocupada" />
          <LegendItem variant="neutral" label="Offline" />
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest animate-pulse">
            Sincronizando sensores...
          </div>
        ) : bahias.length === 0 ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest">
            No se detectó infraestructura configurada
          </div>
        ) : bahias.map((b) => (
          <div 
            key={b.idBahia}
            className={`relative p-6 rounded-[3rem] border-2 transition-all duration-500 flex flex-col items-center justify-center gap-4 group ${
              b.fueraServicio 
                ? 'bg-gray-50 border-gray-100 opacity-60' 
                : b.ocupada 
                  ? 'bg-red-50/50 border-red-100 shadow-xl shadow-red-500/5' 
                  : 'bg-green-50/50 border-green-100 shadow-xl shadow-green-500/5'
            }`}
          >
            <div className={`p-4 rounded-[2rem] transition-all ${
              b.fueraServicio ? 'bg-gray-200 text-gray-400' : b.ocupada ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-green-500 text-white shadow-lg shadow-green-500/20'
            }`}>
              <MapPin size={24} />
            </div>

            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Bahía</p>
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">{b.nombreBahia}</h3>
            </div>

            <div className="w-full pt-4 border-t border-gray-100 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Estado</span>
                <Badge variant={b.fueraServicio ? 'neutral' : b.ocupada ? 'error' : 'success'}>
                  {b.fueraServicio ? 'OFFLINE' : b.ocupada ? 'OCUPADA' : 'LIBRE'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Tipo</span>
                <span className="text-[9px] font-bold text-gray-700 uppercase">{b.tipoBahia?.tipoBahia}</span>
              </div>
            </div>

            {/* Indicador de Sensor IoT */}
            <div className="absolute top-6 right-6">
              <div className={`w-2 h-2 rounded-full ${b.fueraServicio ? 'bg-gray-300' : 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}></div>
              <div className="absolute top-full right-0 mt-2 bg-gray-900 text-white text-[8px] font-black p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 whitespace-nowrap z-10 shadow-2xl">
                <Cpu size={10} className="inline mr-1" /> SENSOR ID: {b.idBahia * 1024}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ variant: any; label: string }> = ({ variant, label }) => (
  <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${
      variant === 'success' ? 'bg-green-500' :
      variant === 'error' ? 'bg-red-500' : 'bg-gray-400'
    }`}></div>
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
  </div>
);
