import React from 'react';
import type { Movement } from '../types';

interface ActiveVehiclesTableProps {
  vehiculos: Movement[];
  onSalida: (placa: string) => void;
}

/**
 * Tabla de Control de Vehículos Activos.
 * FEATURE: Permite visualización y liberación rápida de bahías.
 * SOCKET: Se actualiza dinámicamente al detectar movimientos.
 */
export const ActiveVehiclesTable: React.FC<ActiveVehiclesTableProps> = ({ vehiculos, onSalida }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/30 flex justify-between items-center">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          Vehículos en Sitio
        </h3>
        <span className="text-[10px] text-gray-500 font-black px-2 py-0.5 bg-black rounded-full border border-gray-800">
          {vehiculos.length} TOTAL
        </span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[450px] custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-gray-900 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800">Vehículo</th>
              <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800">Ingreso</th>
              <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800">Bahía</th>
              <th className="px-6 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {vehiculos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center">
                  <p className="text-xs font-bold text-gray-600 uppercase italic">No hay registros activos</p>
                </td>
              </tr>
            ) : (
              vehiculos.map((v) => (
                <tr key={v.idMovimiento} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-blue-500 font-black tracking-widest text-lg">{v.placa}</span>
                      <span className="text-[9px] text-gray-600 font-bold uppercase">{v.usuario}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-gray-400">
                      {new Date(v.horaIngreso).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-black border border-gray-800 rounded text-[10px] font-black text-gray-400">
                      {v.bahia}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onSalida(v.placa)}
                      className="opacity-0 group-hover:opacity-100 bg-blue-600/10 text-blue-500 border border-blue-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all"
                    >
                      Registrar Salida
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
