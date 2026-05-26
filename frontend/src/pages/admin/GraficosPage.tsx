import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { reportesService, type FlujoGroupBy } from '../../services/reportes.service';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const formatBucket = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
};

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

export const GraficosPage: React.FC = () => {
  const [groupBy, setGroupBy] = useState<FlujoGroupBy>('dia');
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return toIsoDate(d);
  });
  const [hasta, setHasta] = useState(() => toIsoDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Array<{ fecha: string; ingresos: number; salidas: number }>>([]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportesService.flujo({ groupBy, desde, hasta });
      setData(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      setError(e?.message || 'No se pudo cargar el flujo de vehículos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [groupBy]);

  const chartData = useMemo(() => {
    return data.map((x) => ({
      ...x,
      bucket: formatBucket(x.fecha),
    }));
  }, [data]);

  /**
   * Estado "sin datos" (caso normal):
   * - El backend puede retornar 200 con array vacío si no existen movimientos en el rango.
   * - Esto NO es un error; se renderiza un estado visual elegante sin bloquear la pantalla.
   */
  const isEmpty = !loading && !error && chartData.length === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gráficos</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">RF21 • Flujo de vehículos</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">LIVE</Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refrescar</Button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agrupar</label>
            <div className="flex gap-2">
              <Button variant={groupBy === 'dia' ? 'primary' : 'outline'} size="sm" onClick={() => setGroupBy('dia')}>Día</Button>
              <Button variant={groupBy === 'semana' ? 'primary' : 'outline'} size="sm" onClick={() => setGroupBy('semana')}>Semana</Button>
              <Button variant={groupBy === 'mes' ? 'primary' : 'outline'} size="sm" onClick={() => setGroupBy('mes')}>Mes</Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white outline-none rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="bg-slate-50 border-2 border-transparent focus:border-slate-900 focus:bg-white outline-none rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200"
            />
          </div>

          <div className="lg:ml-auto">
            <Button variant="primary" size="md" onClick={load} disabled={loading}>
              {loading ? 'Cargando...' : 'Aplicar'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl border bg-red-50 border-red-200 text-red-700 text-xs font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        <div className="h-[360px] relative">
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-6 py-8 rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sin datos</p>
                <p className="text-sm font-semibold text-slate-700 mt-1">
                  Sin datos registrados para este período.
                </p>
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={isEmpty ? [{ fecha: '—', ingresos: 0, salidas: 0, bucket: '—' }] : chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="ingresos" name="Ingresos" fill="#059669" radius={[8, 8, 0, 0]} />
              <Bar dataKey="salidas" name="Salidas" fill="#e11d48" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
