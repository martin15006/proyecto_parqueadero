import React from 'react';
import type { Bahia } from '../types';

interface BahiaProps {
  bahia: Bahia;
}

/**
 * Tarjeta individual de Bahía.
 * FEATURE: Representación visual del estado de la infraestructura.
 * SOCKET: Cambia de color instantáneamente al recibir actualizaciones.
 */
export const BahiaCard: React.FC<BahiaProps> = ({ bahia }) => {
  const isOccupied = bahia.ocupada;
  const isOffline = bahia.fueraServicio;

  return (
    <div className={`
      relative p-4 rounded-xl border-2 transition-all duration-500 flex flex-col items-center justify-center h-28 w-full
      ${isOffline 
        ? 'bg-gray-900 border-gray-800 opacity-50 grayscale' 
        : isOccupied 
          ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
          : 'bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
      }
    `}>
      <span className="text-[10px] font-black uppercase text-gray-500 mb-1 tracking-widest">
        {bahia.tipoBahia?.tipoBahia || 'Bahía'}
      </span>
      <span className={`text-2xl font-black ${isOccupied ? 'text-red-500' : 'text-green-500'}`}>
        {bahia.nombreBahia}
      </span>
      
      {isOccupied && (
        <div className="mt-2 px-2 py-0.5 bg-red-500 text-white text-[9px] font-black rounded uppercase tracking-tighter animate-pulse">
          {bahia.placa}
        </div>
      )}

      {isOffline && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
          <span className="text-[10px] font-black text-white uppercase tracking-tighter">Offline</span>
        </div>
      )}
    </div>
  );
};

/**
 * Grid Interactivo de Bahías.
 * FEATURE: Mapa de calor visual del estado del parqueadero.
 */
export const MapaBahias: React.FC<{ bahias: Bahia[] }> = ({ bahias }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6 bg-gray-900/50 rounded-2xl border border-gray-800">
      {bahias.length === 0 ? (
        <div className="col-span-full py-12 text-center text-gray-600 uppercase text-xs font-black tracking-widest">
          No hay infraestructura configurada
        </div>
      ) : (
        bahias.map((bahia) => (
          <BahiaCard key={bahia.idBahia} bahia={bahia} />
        ))
      )}
    </div>
  );
};
