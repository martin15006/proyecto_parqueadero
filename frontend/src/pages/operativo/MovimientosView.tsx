import React, { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, User, Clock } from 'lucide-react';
import { dashboardService } from '../../services/operativo.service';

/** Fila del historial según `GET /dashboard/historial` (movimiento + registroVehiculo). */
interface HistorialRow {
  idMovimiento: number;
  horaIngreso: string | null;
  horaSalida: string | null;
  estado: 'TRANSITO' | 'ADENTRO' | 'SALIDA' | 'ANULADO';
  esManual?: boolean;
  registroVehiculo?: {
    vehiculo?: { placa?: string; color?: string } | null;
    usuario?: { nombreCompleto?: string; documento?: string } | null;
  } | null;
}

const PAGE_SIZE = 20;

export const MovimientosView: React.FC = () => {
  const [movimientos, setMovimientos] = useState<HistorialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const loadHistorial = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      const res: any = await dashboardService.getHistorial(targetPage, PAGE_SIZE);
      setMovimientos(Array.isArray(res?.data) ? res.data : []);
      setLastPage(Number(res?.lastPage) || 1);
      setTotal(Number(res?.total) || 0);
    } catch {
      setMovimientos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistorial(page);
  }, [page, loadHistorial]);

  const filteredMovimientos = movimientos.filter(m =>
    (m.registroVehiculo?.vehiculo?.placa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.registroVehiculo?.usuario?.nombreCompleto || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fmtHora = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
  const fmtFecha = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';

  const esActivo = (m: HistorialRow) => m.estado === 'ADENTRO' || m.estado === 'TRANSITO';

  if (loading && movimientos.length === 0) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#39B000]/20 border-t-[#39B000] rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="bg-white dark:bg-[#121212] p-6 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-end gap-4 transition-colors duration-300">
        <div className="flex-1 w-full space-y-1.5">
          <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 ml-1">Búsqueda de Registros</label>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 group-focus-within:text-[#39B000] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Placa o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-lg focus:bg-white dark:focus:bg-white/10 focus:border-[#39B000] outline-none transition-all text-xs font-bold text-[#012E25] dark:text-white"
            />
          </div>
        </div>

        <button
          onClick={() => loadHistorial(page)}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#012E25] dark:bg-[#39B000] text-white rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-black dark:hover:bg-[#007832] transition-all shadow-sm active:scale-95 group"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="bg-white dark:bg-[#121212] rounded-xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Usuario</th>
                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Vehículo</th>
                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Cronología</th>
                <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-gray-400">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {filteredMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <p className="text-[10px] font-bold text-gray-300 dark:text-gray-700 uppercase tracking-widest">Sin resultados</p>
                  </td>
                </tr>
              ) : (
                filteredMovimientos.map((m) => {
                  const usuario = m.registroVehiculo?.usuario;
                  const vehiculo = m.registroVehiculo?.vehiculo;
                  return (
                    <tr key={m.idMovimiento} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500 font-bold text-[10px] group-hover:bg-[#39B000] group-hover:text-white transition-all">
                            {usuario?.nombreCompleto?.charAt(0) || <User size={14} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#012E25] dark:text-white text-xs">
                              {usuario?.nombreCompleto || '---'}
                            </span>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                              {usuario?.documento || '---'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#012E25] dark:text-white text-xs tracking-widest">{vehiculo?.placa || '---'}</span>
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">
                            {vehiculo?.color || (m.esManual ? 'Registro manual' : '')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Clock size={10} className="text-[#39B000]" />
                            <span className="font-bold text-[#012E25] dark:text-white text-[10px]">
                              {fmtFecha(m.horaIngreso)} {fmtHora(m.horaIngreso)}
                            </span>
                          </div>
                          {m.horaSalida && (
                            <div className="flex items-center gap-2">
                              <Clock size={10} className="text-gray-300 dark:text-gray-600" />
                              <span className="font-bold text-gray-400 dark:text-gray-500 text-[10px]">
                                {fmtFecha(m.horaSalida)} {fmtHora(m.horaSalida)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`
                          inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-widest
                          ${esActivo(m)
                            ? 'bg-green-50 dark:bg-[#39B000]/10 text-[#39B000] border-green-100 dark:border-[#39B000]/20'
                            : m.estado === 'ANULADO'
                              ? 'bg-red-50 dark:bg-red-900/10 text-red-400 border-red-100 dark:border-red-900/20'
                              : 'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-white/5'}
                        `}>
                          <span className={`w-1 h-1 rounded-full ${esActivo(m) ? 'bg-[#39B000] animate-pulse' : m.estado === 'ANULADO' ? 'bg-red-400' : 'bg-gray-400'}`} />
                          {esActivo(m) ? 'Interno' : m.estado === 'ANULADO' ? 'Anulado' : 'Completado'}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-white/5">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            {total} registros • Página {page} de {lastPage}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-md border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121212] text-gray-400 hover:text-[#012E25] dark:hover:text-white transition-all disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="w-6 h-6 rounded-md bg-[#39B000] text-white text-[9px] font-bold flex items-center justify-center">{page}</span>
            <button
              onClick={() => setPage(p => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage || loading}
              className="p-1.5 rounded-md border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121212] text-gray-400 hover:text-[#012E25] dark:hover:text-white transition-all disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
