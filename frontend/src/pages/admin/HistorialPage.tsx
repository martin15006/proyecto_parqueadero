import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, User, Car, Hash, Clock, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { dashboardService } from '../../services/operativo.service';
import { socketService } from '../../services/socket.service';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { FiltroFechaHistorial } from '../../components/common/FiltroFechaHistorial';
import type { RangoFecha } from '../../components/common/FiltroFechaHistorial';

interface HistorialRow {
  idMovimiento: number | string;
  esVisitante?: boolean;
  horaIngreso: string | null;
  horaSalida: string | null;
  estado: 'TRANSITO' | 'ADENTRO' | 'SALIDA' | 'ANULADO';
  esManual?: boolean;
  registroVehiculo?: {
    vehiculo?: { placa?: string; color?: string; tipoVehiculo?: { tipoVehiculo?: string } | null } | null;
    usuario?: { nombreCompleto?: string; documento?: string } | null;
  } | null;
  usuarioIngreso?: { nombreCompleto?: string; documento?: string } | null;
  autorizadoPor?: { documento?: string; nombreCompleto?: string } | null;
}

const PAGE_SIZE = 20;

const fmtFechaHora = (iso: string | null) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '—';
  }
};

export const HistorialPage: React.FC = () => {
  const [rows, setRows] = useState<HistorialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [expandido, setExpandido] = useState(false);
  const [rango, setRango] = useState<RangoFecha>({});

  const cargar = useCallback(async (targetPage: number, r: RangoFecha) => {
    try {
      setLoading(true);
      const res = await dashboardService.getHistorial(targetPage, PAGE_SIZE, r.desde, r.hasta);
      setRows(Array.isArray(res.data) ? (res.data as HistorialRow[]) : []);
      setLastPage(Number(res.lastPage) || 1);
      setTotal(Number(res.total) || 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar(page, rango);

    socketService.connect();
    const handler = () => cargar(page, rango);
    socketService.on('vehiculo_ingresado', handler);
    socketService.on('vehiculo_retirado', handler);
    return () => {
      socketService.off('vehiculo_ingresado', handler);
      socketService.off('vehiculo_retirado', handler);
    };
  }, [page, rango, cargar]);

  const handleRango = (r: RangoFecha) => {
    setPage(1);
    setRango(r);
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((m) => {
      const placa = m.registroVehiculo?.vehiculo?.placa ?? '';
      const quien = m.usuarioIngreso?.nombreCompleto ?? m.registroVehiculo?.usuario?.nombreCompleto ?? '';
      const autorizo = m.autorizadoPor?.nombreCompleto ?? '';
      return (
        placa.toLowerCase().includes(term) ||
        quien.toLowerCase().includes(term) ||
        autorizo.toLowerCase().includes(term)
      );
    });
  }, [rows, q]);

  const visibles = useMemo(() => (expandido ? filtered : filtered.slice(0, 6)), [filtered, expandido]);

  const estadoBadge = (estado: HistorialRow['estado']) => {
    if (estado === 'ADENTRO' || estado === 'TRANSITO') return <Badge variant="success">Dentro</Badge>;
    if (estado === 'ANULADO') return <Badge variant="error">Anulado</Badge>;
    return <Badge variant="neutral">Completado</Badge>;
  };

  const columns = useMemo(() => ([
    {
      header: 'Quién ingresó',
      accessor: (m: HistorialRow) => {
        const u = m.usuarioIngreso ?? m.registroVehiculo?.usuario;
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-500 font-black">
              {u?.nombreCompleto?.charAt(0)?.toUpperCase() || <User size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{u?.nombreCompleto || '—'}</p>
                {m.esVisitante && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[8px] font-black uppercase tracking-widest">Visitante</span>
                )}
              </div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">DOC: {u?.documento || '—'}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Vehículo',
      accessor: (m: HistorialRow) => {
        const v = m.registroVehiculo?.vehiculo;
        const tipo = v?.tipoVehiculo?.tipoVehiculo;
        return (
          <div className="flex items-center gap-2">
            <Car size={14} className="text-slate-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white tracking-widest flex items-center gap-1">
                <Hash size={12} className="text-slate-400" />{v?.placa || '—'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {tipo || (m.esManual ? 'Registro manual' : '—')}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Ingreso',
      accessor: (m: HistorialRow) => (
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <Clock size={12} className="text-[#39A900]" /> {fmtFechaHora(m.horaIngreso)}
        </div>
      ),
    },
    {
      header: 'Salida',
      accessor: (m: HistorialRow) => (
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{fmtFechaHora(m.horaSalida)}</span>
      ),
    },
    {
      header: 'Estado',
      accessor: (m: HistorialRow) => estadoBadge(m.estado),
    },
    {
      header: 'Permitió el ingreso',
      accessor: (m: HistorialRow) => (
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{m.autorizadoPor?.nombreCompleto || '—'}</span>
        </div>
      ),
    },
  ]), []);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-[#121212] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-white/5 space-y-3">
        <Input
          icon={<Search size={20} />}
          placeholder="Buscar por placa, quién ingresó o quién autorizó..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <FiltroFechaHistorial onChange={handleRango} />
      </div>

      <Table
        columns={columns}
        data={visibles}
        isLoading={loading}
        emptyMessage="No hay ingresos registrados"
      />

      {!loading && filtered.length > 6 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setExpandido((e) => !e)}
            className="px-5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121212] text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:border-[#39A900] hover:text-[#39A900] transition-all"
          >
            {expandido ? 'Mostrar menos' : `Mostrar más (${filtered.length - 6})`}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
          {total} ingresos • Página {page} de {lastPage}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121212] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="w-8 h-8 rounded-lg bg-[#39A900] text-white text-xs font-black flex items-center justify-center">{page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage || loading}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121212] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
