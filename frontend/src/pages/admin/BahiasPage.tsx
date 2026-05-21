import React, { useState, useEffect } from 'react';
import { bahiasService } from '../../services/telemetria.service';
import { MapPin, CheckCircle2, XCircle, AlertCircle, Cpu } from 'lucide-react';
import { socketService } from '../../services/socket.service';

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
    socketService.on('ocupacion_actualizada', (data) => {
      setBahias(prev => prev.map(b => {
        const updated = data.bahias.find((ub: any) => ub.idBahia === b.idBahia);
        return updated ? { ...b, ...updated } : b;
      }));
    });

    socketService.on('sensor_offline', (data) => {
      setBahias(prev => prev.map(b => 
        b.idBahia === data.idBahia ? { ...b, fueraServicio: true } : b
      ));
    });

    return () => {
      socketService.off('ocupacion_actualizada');
      socketService.off('sensor_offline');
    };
  }, []);

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Infraestructura Física</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Mapa de Bahías y Sensores IoT</p>
        </div>
        <div className="flex gap-4">
          <LegendItem icon={<CheckCircle2 className="text-green-500" />} label="Libre" />
          <LegendItem icon={<XCircle className="text-red-500" />} label="Ocupada" />
          <LegendItem icon={<AlertCircle className="text-gray-400" />} label="Offline" />
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
            className={`relative p-6 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col items-center justify-center gap-4 ${
              b.fueraServicio 
                ? 'bg-gray-100 border-gray-200 grayscale opacity-60' 
                : b.ocupada 
                  ? 'bg-red-50 border-red-100 shadow-[0_0_40px_rgba(239,68,68,0.1)]' 
                  : 'bg-green-50 border-green-100 shadow-[0_0_40px_rgba(34,197,94,0.1)]'
            }`}
          >
            <div className={`p-4 rounded-3xl ${
              b.fueraServicio ? 'bg-gray-200' : b.ocupada ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}>
              <MapPin size={24} />
            </div>

            <div className="text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Bahía</p>
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">{b.nombreBahia}</h3>
            </div>

            <div className="w-full pt-4 border-t border-white/50 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase">Estado</span>
                <span className={`text-[9px] font-black uppercase ${
                  b.fueraServicio ? 'text-gray-500' : b.ocupada ? 'text-red-500' : 'text-green-500'
                }`}>
                  {b.fueraServicio ? 'OFFLINE' : b.ocupada ? 'OCUPADA' : 'LIBRE'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-gray-400 uppercase">Tipo</span>
                <span className="text-[9px] font-bold text-gray-700 uppercase">{b.tipoBahia?.tipoBahia}</span>
              </div>
            </div>

            {/* Indicador de Sensor IoT */}
            <div className="absolute top-4 right-4 group">
              <div className={`w-2 h-2 rounded-full ${b.fueraServicio ? 'bg-gray-300' : 'bg-blue-500 animate-pulse'}`}></div>
              <div className="absolute top-full right-0 mt-2 bg-gray-900 text-white text-[8px] font-black p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                <Cpu size={10} className="inline mr-1" /> SENSOR ID: {b.idBahia * 1024}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ icon: any; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
    {icon}
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
  </div>
);
