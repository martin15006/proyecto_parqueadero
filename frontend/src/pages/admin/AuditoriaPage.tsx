import React, { useState, useEffect } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');

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

  const columns = [
    {
      header: 'Fecha y Hora',
      accessor: (log: any) => (
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gray-50 rounded-2xl text-blue-600 border border-gray-100">
            <History size={16} />
          </div>
          <div>
            <p className="text-sm font-black text-gray-900 leading-none mb-1.5">
              {new Date(log.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
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
            <User size={14} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-700">{log.idUsuario}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <Globe size={12} className="text-gray-400" />
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
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] py-1 px-2 bg-gray-50 rounded-lg border border-gray-100">
          {log.modulo || 'SISTEMA'}
        </span>
      ),
    },
    {
      header: 'Detalles',
      accessor: (log: any) => (
        <div className="flex items-center gap-2 text-[9px] font-medium text-gray-500 max-w-[200px] truncate">
          <Monitor size={11} className="text-gray-400 shrink-0" />
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
  ];

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Registro de Auditoría</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Trazabilidad Técnica en Tiempo Real</p>
        </div>
        <Button variant="primary" size="md" onClick={fetchLogs} isLoading={loading}>
          <Activity size={18} className="mr-2" /> SINCRONIZAR
        </Button>
      </header>

      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
        <Input 
          icon={<Search size={20} />}
          placeholder="Filtrar por usuario, acción o módulo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Total: <span className="text-gray-900 font-black">{total}</span> eventos registrados
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
