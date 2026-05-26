import React, { useMemo, useState, useEffect } from 'react';
import { auditoriaService } from '../../services/auditoria.service';
import { History, User, Activity, Globe, Monitor, Search } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

/**
 * Logs de Auditoría (Admin).
 * Trazabilidad completa de acciones críticas en el sistema.
 */
export const AuditoriaPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [operativo, setOperativo] = useState('');
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditoriaService.operaciones({
        operativo: operativo.trim() || undefined,
        desde: new Date(desde).toISOString(),
        hasta: new Date(hasta).toISOString(),
        page,
        limit: 20,
      });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (error) {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  useEffect(() => {
    setPage(1);
    const t = window.setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => window.clearTimeout(t);
  }, [operativo, desde, hasta]);

  const columns = useMemo(() => ([
    {
      header: 'Fecha y Hora',
      accessor: (log: any) => (
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-slate-50 rounded-xl text-slate-700 border border-slate-200">
            <History size={16} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 leading-none mb-1.5">
              {new Date(log.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Usuario / IP',
      accessor: (log: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User size={14} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">{log.idUsuario}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
            <Globe size={12} className="text-slate-400" />
            <span className="font-mono">{log.ip || '0.0.0.0'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Acción',
      accessor: (log: any) => (
        <Badge variant="info">
          {log.accion.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      header: 'Módulo',
      accessor: (log: any) => (
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] py-1 px-2 bg-slate-50 rounded-lg border border-slate-200">
          {log.modulo || 'SISTEMA'}
        </span>
      ),
    },
    {
      header: 'Detalles',
      accessor: (log: any) => (
        <div className="flex items-center gap-2 text-[9px] font-medium text-slate-600 max-w-[200px] truncate">
          <Monitor size={11} className="text-slate-400 shrink-0" />
          <span className="truncate">{log.idEntidad || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: 'Acciones',
      className: 'text-right',
      accessor: () => (
        <Button variant="outline" size="sm">
          Detalles
        </Button>
      ),
    },
  ]), []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Auditoría Operativa</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">RF37 • Historial del personal operativo</p>
        </div>
        <Button variant="primary" size="md" onClick={fetchLogs} isLoading={loading}>
          <Activity size={18} className="mr-2" /> SINCRONIZAR
        </Button>
      </header>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          icon={<Search size={20} />}
          placeholder="Documento operativo (opcional)"
          value={operativo}
          onChange={(e) => setOperativo(e.target.value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white outline-none rounded-xl px-5 py-4 text-sm font-medium transition-all duration-200"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white outline-none rounded-xl px-5 py-4 text-sm font-medium transition-all duration-200"
          />
        </div>
      </div>

      <Table 
        columns={columns}
        data={logs}
        isLoading={loading}
        emptyMessage="No se encontraron registros de actividad"
      />

      <footer className="flex justify-between items-center px-4">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse shadow-[0_0_10px_rgba(5,150,105,0.35)]" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            Total: <span className="text-slate-900 font-black">{total}</span> eventos registrados
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
          >
            Anterior
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page * 20 >= total || loading}
            onClick={() => setPage(p => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </footer>
    </div>
  );
};
