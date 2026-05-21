import React, { useState, useEffect } from 'react';
import { auditoriaService } from '../../services/auditoria.service';
import { History, User, Activity, Globe, Monitor } from 'lucide-react';

/**
 * Logs de Auditoría (Admin).
 * Trazabilidad completa de acciones críticas en el sistema.
 */
export const AuditoriaPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditoriaService.findAll(page, 20);
      setLogs(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('Error cargando auditoría', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-900 min-h-screen text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Header con Efecto Glassmorphism */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-top duration-700">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <Activity size={24} className="text-blue-400" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Registro de Auditoría
            </h1>
          </div>
          <p className="text-slate-500 text-xs md:text-sm font-semibold uppercase tracking-[0.2em] ml-1">
            Trazabilidad Técnica • Tiempo Real
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={fetchLogs} 
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-750 hover:border-slate-600 transition-all shadow-xl shadow-black/20 active:scale-95 group"
          >
            <Activity size={18} className={`text-blue-400 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">Refrescar</span>
          </button>
        </div>
      </header>

      {/* Contenedor Principal */}
      <div className="bg-slate-850/50 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-black/40 border border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-700 delay-150">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Fecha y Hora</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Identidad</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Acción Ejecutada</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Módulo</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">Origen / Dispositivo</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {loading ? (
                // Skeletons
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-slate-800 rounded-xl" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-slate-800 rounded-full w-1/4" />
                          <div className="h-2 bg-slate-800/50 rounded-full w-1/6" />
                        </div>
                        <div className="h-8 w-24 bg-slate-800 rounded-full" />
                        <div className="h-8 w-32 bg-slate-800 rounded-full" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <History size={64} />
                      <p className="text-sm font-black uppercase tracking-[0.3em]">Sin registros de actividad</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.idAuditoria} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-slate-800 rounded-xl group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-all duration-300 border border-slate-700 group-hover:border-blue-500/30">
                        <History size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200 leading-none mb-1.5">
                          {new Date(log.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        <User size={14} className="text-blue-400" />
                      </div>
                      <span className="text-sm font-semibold text-slate-300 tracking-tight">{log.idUsuario}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="inline-flex items-center px-3 py-1.5 bg-blue-500/5 text-blue-400 border border-blue-500/10 rounded-lg">
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {log.accion.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] py-1 px-2 bg-slate-900/50 rounded border border-slate-800">
                      {log.entidad}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                        <Globe size={12} className="text-slate-600" />
                        <span className="font-mono">{log.ip || '0.0.0.0'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-medium text-slate-600 max-w-[180px] truncate">
                        <Monitor size={11} className="text-slate-700 shrink-0" />
                        <span className="truncate">{log.userAgent || 'Unknown System'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all border border-transparent hover:border-blue-500/20">
                      Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación Moderna */}
        <footer className="px-8 py-6 bg-slate-900/50 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Total: <span className="text-slate-300 font-black">{total}</span> eventos registrados
            </p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              disabled={page === 1 || loading}
              onClick={() => setPage(p => p - 1)}
              className="flex-1 md:flex-none px-8 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-750 disabled:opacity-30 disabled:hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              Anterior
            </button>
            <div className="flex items-center px-4 text-[10px] font-black text-slate-600">
              PÁGINA {page}
            </div>
            <button 
              disabled={page * 20 >= total || loading}
              onClick={() => setPage(p => p + 1)}
              className="flex-1 md:flex-none px-8 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-750 disabled:opacity-30 disabled:hover:bg-slate-800 transition-all shadow-lg active:scale-95"
            >
              Siguiente
            </button>
          </div>
        </footer>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f172a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
};
