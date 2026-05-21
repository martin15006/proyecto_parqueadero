import type { Movement } from '../types';

/**
 * Tabla de Movimientos Activos.
 * FEATURE: Visualización en tiempo real de vehículos dentro del parqueadero.
 */
export const TablaMovimientos: React.FC<{ movimientos: Movement[] }> = ({ movimientos }) => {
  return (
    <div className="overflow-x-auto bg-gray-900 rounded-xl shadow-lg border border-gray-800">
      <table className="min-w-full text-left text-sm text-gray-300">
        <thead className="bg-gray-800 text-[10px] uppercase text-gray-500 font-black">
          <tr>
            <th className="px-4 py-3">Placa</th>
            <th className="px-4 py-3">Ingreso</th>
            <th className="px-4 py-3">Bahía</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {movimientos.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-gray-600 uppercase text-[10px] font-black tracking-widest">
                Vacío
              </td>
            </tr>
          ) : (
            movimientos.map((mov) => (
              <tr key={mov.idMovimiento} className="hover:bg-gray-800/50 transition-colors border-b border-gray-800/50">
                <td className="px-4 py-3 font-black text-blue-500 tracking-tighter">{mov.placa}</td>
                <td className="px-4 py-3 text-xs font-bold text-gray-500">{new Date(mov.horaIngreso).toLocaleTimeString()}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px] font-black text-gray-400 border border-gray-700">{mov.bahia}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                    mov.estado === 'ADENTRO' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {mov.estado}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
