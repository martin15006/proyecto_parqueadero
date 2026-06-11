import React from 'react';

interface Bahia {
  idBahia: number;
  nombreBahia: string;
  ocupada: boolean;
  fueraServicio?: boolean;
  placa?: string;
  tipoBahia?: { tipoBahia: string };
}

interface ParkingGridProps {
  bahias: Bahia[];
}

export const ParkingGrid: React.FC<ParkingGridProps> = ({ bahias }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          Mapa de Disponibilidad
        </h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-green-500"></span>
            <span className="text-[9px] text-gray-500 font-bold uppercase">Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-red-500"></span>
            <span className="text-[9px] text-gray-500 font-bold uppercase">Ocupada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-gray-500"></span>
            <span className="text-[9px] text-gray-500 font-bold uppercase">Offline</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
        {bahias.length === 0 ? (
          <div className="col-span-full py-20 text-center opacity-20">
            <p className="text-xs font-bold uppercase tracking-widest">Cargando infraestructura...</p>
          </div>
        ) : (
          bahias.map((bahia) => (
            <div 
              key={bahia.idBahia}
              className={`relative group rounded-xl border-2 p-3 transition-all duration-300 flex flex-col items-center justify-center h-24 ${
                bahia.fueraServicio
                  ? 'bg-gray-500/10 border-gray-500/40 opacity-50 grayscale'
                  : bahia.ocupada 
                    ? 'bg-red-500/10 border-red-500/40 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]' 
                    : 'bg-green-500/10 border-green-500/40 hover:border-green-500 shadow-[inset_0_0_15px_rgba(34,197,94,0.1)]'
              }`}
            >
              <span className={`text-[10px] font-black uppercase mb-1 ${
                bahia.fueraServicio ? 'text-gray-500' : (bahia.ocupada ? 'text-red-500/60' : 'text-green-500/60')
              }`}>
                {bahia.nombreBahia}
              </span>
              
              {bahia.fueraServicio ? (
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                  OFFLINE
                </span>
              ) : bahia.ocupada ? (
                <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-red-500 tracking-tighter">
                    {bahia.placa || 'OCUPADA'}
                  </span>
                  <div className="mt-1 flex gap-0.5">
                    <span className="w-1 h-1 bg-red-500 rounded-full animate-ping"></span>
                  </div>
                </div>
              ) : (
                <span className="text-[9px] font-bold text-green-500/40 uppercase tracking-widest">
                  VACANTE
                </span>
              )}

              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap border border-gray-700 font-bold uppercase">
                {bahia.tipoBahia?.tipoBahia || 'Bahía Estándar'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
