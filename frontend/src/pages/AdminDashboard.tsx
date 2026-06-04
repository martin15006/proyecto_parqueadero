import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Users, MapPin, Activity, TrendingUp,
  AlertTriangle, RefreshCcw,
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { StatCard } from '../components/common/StatCard';
import { ChartHeader } from '../components/common/ChartHeader';
import { ExportButton } from '../components/admin/ExportButton';

/**
 * Dashboard Administrativo simplificado.
 * Quitados: Mapa de Intensidad, Segmentación, Flujo de Tráfico, Ingresos Mes, Alertas.
 */
export const AdminDashboard: React.FC = () => {
  const { resumen, tendencia, loading, error, refresh } = useAdmin();

  if (loading && !resumen) return <DashboardSkeleton />;
  if (error) return <DashboardError message={error} retry={refresh} />;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const tendenciaSafe = Array.isArray(tendencia) ? tendencia : [];

  return (
    <div className="space-y-8">
      {/* Encabezado Gerencial */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">System Analytics</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Consola Administrativa</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Gestión Estratégica de Infraestructura</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportButton
            label="EXCEL"
            url={`${API_URL}/api/v1/dashboard/exportar/excel`}
            color="hover:text-emerald-700 hover:border-emerald-400"
          />
          <ExportButton
            label="PDF"
            url={`${API_URL}/api/v1/dashboard/exportar/pdf`}
            color="hover:text-rose-700 hover:border-rose-400"
          />
          <button
            onClick={refresh}
            className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-950 transition-all duration-200 shadow-sm"
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

      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          icon={<AlertTriangle className={resumen?.estadoParqueadero === 'DISPONIBLE' ? 'text-emerald-600' : 'text-amber-600'} />}
          label="Estado Parqueadero"
          value={resumen?.estadoParqueadero || 'DISPONIBLE'}
          trend={resumen?.estadoParqueadero === 'DESHABILITADO' ? 'Deshabilitado' : resumen?.estadoParqueadero === 'LLENO' ? 'Lleno' : 'Disponible'}
          isCritical={resumen?.estadoParqueadero !== 'DISPONIBLE'}
        />
      </div>

      {/* KPIs secundarios — sin "Ingresos Mes" ni "Alertas 24h" */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard icon={<Users className="text-slate-700" />} label="Usuarios" value={resumen?.totalUsuarios} />
        <StatCard
          icon={<MapPin className="text-amber-600" />}
          label="Ocupación"
          value={`${resumen?.ocupacion ? ((resumen.ocupacion.ocupados / resumen.ocupacion.total) * 100 || 0).toFixed(1) : 0}%`}
          subValue={resumen?.ocupacion ? `${resumen.ocupacion.ocupados}/${resumen.ocupacion.total} Bahías` : '0/0 Bahías'}
        />
        <StatCard icon={<Activity className="text-emerald-600" />} label="Ingresos Hoy" value={resumen?.ingresosHoy} />
      </div>

      {/* Rendimiento Semanal */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <ChartHeader title="Rendimiento Semanal" subtitle="Tendencia de los últimos 7 días" icon={<TrendingUp className="text-slate-700" />} />
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tendenciaSafe}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="fecha"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                tickFormatter={(val) => new Date(val).toLocaleDateString('es-ES', { weekday: 'short' })}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
              <Bar dataKey="cantidad" fill="#059669" radius={[10, 10, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// --- SUBCOMPONENTES DE UI ---

const DashboardSkeleton = () => (
  <div className="p-8 space-y-8 animate-pulse">
    <div className="h-20 bg-slate-200 rounded-xl w-1/3"></div>
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
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
