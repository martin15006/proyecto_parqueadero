import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { reportesService, type FlujoGroupBy } from '../../services/reportes.service';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

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
      <header className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">LIVE</Badge>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>Refrescar</Button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-end">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Agrupar</label>
            <div className="flex gap-2">
              <Button variant={groupBy === 'dia' ? 'primary' : 'outline'} size="sm" onClick={() => setGroupBy('dia')} className="flex-1 lg:flex-none">Día</Button>
              <Button variant={groupBy === 'semana' ? 'primary' : 'outline'} size="sm" onClick={() => setGroupBy('semana')} className="flex-1 lg:flex-none">Semana</Button>
              <Button variant={groupBy === 'mes' ? 'primary' : 'outline'} size="sm" onClick={() => setGroupBy('mes')} className="flex-1 lg:flex-none">Mes</Button>
            </div>
          </div>

          <div className="flex-1">
            <Input
              label="Desde"
              type="date"
              value={desde}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDesde(e.target.value)}
            />
          </div>

          <div className="flex-1">
            <Input
              label="Hasta"
              type="date"
              value={hasta}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHasta(e.target.value)}
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
