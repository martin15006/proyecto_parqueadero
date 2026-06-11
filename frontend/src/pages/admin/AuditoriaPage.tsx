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
          <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors duration-500">
            <History size={16} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1.5">
              {new Date(log.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
            <User size={14} className="text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{log.idUsuario}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <Globe size={12} className="text-slate-400 dark:text-slate-500" />
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
        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] py-1 px-2 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 transition-colors duration-500">
          {log.modulo || 'SISTEMA'}
        </span>
      ),
    },
    {
      header: 'Detalles',
      accessor: (log: any) => (
        <div className="flex items-center gap-2 text-[9px] font-medium text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
          <Monitor size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
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
      {/* Botón Sincronizar alineado con el título vía Portal o Layout superior */}
      <header className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 -mt-20 mb-10 relative z-50">
        <Button variant="primary" size="md" onClick={fetchLogs} isLoading={loading} className="bg-[#39A900] hover:bg-[#2F8A00] shadow-[0_8px_20px_rgba(57,169,0,0.3)]">
          <Activity size={18} className="mr-2" /> SINCRONIZAR
        </Button>
      </header>

      <div className="bg-white dark:bg-[#121212] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 items-end transition-colors duration-500">
        <Input
          label="Búsqueda"
          icon={<Search size={20} />}
          placeholder="Documento operativo (opcional)"
          value={operativo}
          onChange={(e) => setOperativo(e.target.value)}
        />
        <Input
          label="Desde"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
        />
        <Input
          label="Hasta"
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
        />
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
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
            Total: <span className="text-slate-900 dark:text-white font-black">{total}</span> eventos registrados
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page === 1 || loading}
            onClick={() => setPage(p => p - 1)}
            className="dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
          >
            Anterior
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={page * 20 >= total || loading}
            onClick={() => setPage(p => p + 1)}
            className="dark:bg-white/5 dark:text-slate-300 dark:border-white/10"
          >
            Siguiente
          </Button>
        </div>
      </footer>
    </div>
  );
};
