import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  MapPin, Activity, TrendingUp,
  AlertTriangle, RefreshCcw, Percent
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { StatCard } from '../components/common/StatCard';
import { ChartHeader } from '../components/common/ChartHeader';
import { ExportButton } from '../components/admin/ExportButton';

/**
 * Dashboard Administrativo (Business Intelligence).
 * Proporciona una visión gerencial del estado del parqueadero mediante
 * visualizaciones de datos y KPIs.
 */
export const AdminDashboard: React.FC = () => {
  const {
    resumen,
    tendencia,
    loading,
    error,
    refresh
  } = useAdmin();

  const porcentajeOcupacion = useMemo(() => {
    if (!resumen?.ocupacion?.total) return 0;
    return Math.round((resumen.ocupacion.ocupados / resumen.ocupacion.total) * 100);
  }, [resumen]);

  if (loading && !resumen) return <DashboardSkeleton />;
  if (error) return <DashboardError message={error} retry={refresh} />;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const tendenciaSafe = Array.isArray(tendencia) ? tendencia : [];

  return (
    <div className="space-y-8">
      {/* Botones de Acción alineados con el título del Layout superior */}
      <header className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 -mt-20 mb-10 relative z-50">
        <div className="flex flex-wrap gap-3">
          <ExportButton 
            label="EXCEL" 
            url={`${API_URL}/api/v1/dashboard/exportar/excel`} 
            color="hover:text-emerald-700 hover:border-emerald-400 bg-white shadow-sm"
          />
          <ExportButton 
            label="PDF" 
            url={`${API_URL}/api/v1/dashboard/exportar/pdf`} 
            color="hover:text-rose-700 hover:border-rose-400 bg-white shadow-sm"
          />
          <button 
            onClick={refresh}
            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-950 transition-all duration-200 shadow-[0_8px_20px_rgba(15,23,42,0.2)]"
            title="Refrescar Analíticas"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      {/* Banner crítico — parqueadero lleno */}
      {resumen?.estadoParqueadero === 'LLENO' && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5 flex items-start gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">Alerta crítica</p>
            <h2 className="text-xl font-black text-rose-900 mt-1">Capacidad máxima alcanzada</h2>
            <p className="text-sm font-semibold text-rose-800 mt-1">
              El parqueadero está LLENO ({resumen.ocupacion?.ocupados}/{resumen.ocupacion?.total} ocupados).
              No se permiten más ingresos hasta que ocurra una salida.
            </p>
          </div>
        </div>
      )}

      {resumen?.estadoParqueadero === 'DESHABILITADO' && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Estado administrativo</p>
            <h2 className="text-xl font-black text-amber-900 mt-1">Parqueadero deshabilitado</h2>
            <p className="text-sm font-semibold text-amber-800 mt-1">
              El parqueadero está fuera de servicio por decisión administrativa.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard
          icon={<MapPin className="text-slate-700" />}
          label="Total Espacios"
          value={resumen?.ocupacion?.total}
        />
        <StatCard
          icon={<Activity className="text-rose-600" />}
          label="Espacios Ocupados"
          value={resumen?.ocupacion?.ocupados}
        />
        <StatCard
          icon={<TrendingUp className="text-emerald-600" />}
          label="Espacios Disponibles"
          value={resumen?.ocupacion?.disponibles}
        />
        <StatCard
          icon={<Percent className="text-blue-600" />}
          label="Ocupación"
          value={`${porcentajeOcupacion}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 mb-12">
        {/* Rendimiento Semanal */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
          <ChartHeader title="Rendimiento Semanal" subtitle="Tendencia de los últimos 7 días" icon={<TrendingUp className="text-slate-700" />} />
          <div className="h-[300px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tendenciaSafe}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="fecha" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('es-ES', {weekday: 'short'})}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
                <Bar dataKey="cantidad" fill="#059669" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUBCOMPONENTES DE UI ---

const DashboardSkeleton = () => (
  <div className="p-8 space-y-8 animate-pulse">
    <div className="h-10 bg-slate-200 rounded-xl w-1/4 mb-10 ml-auto"></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
    </div>
    <div className="h-96 bg-slate-200 rounded-xl"></div>
  </div>
);

const DashboardError = ({ message, retry }: { message: string, retry: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
    <div className="p-6 bg-rose-50 rounded-full mb-4">
      <AlertTriangle className="text-rose-600" size={48} />
    </div>
    <h2 className="text-2xl font-black text-slate-900 mb-2">Error de Analíticas</h2>
    <p className="text-slate-600 mb-6 max-w-md">{message}</p>
    <button onClick={retry} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-sm hover:bg-slate-950 transition-all duration-200 active:scale-[0.99]">
      REINTENTAR
    </button>
  </div>
);
