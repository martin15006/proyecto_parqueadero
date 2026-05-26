import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Users, MapPin, Activity, TrendingUp, Clock,
  Database, Calendar, AlertTriangle,
  RefreshCcw
} from 'lucide-react';
import { useAdmin } from '../hooks/useAdmin';
import { StatCard } from '../components/common/StatCard';
import { ChartHeader } from '../components/common/ChartHeader';
import { ExportButton } from '../components/admin/ExportButton';

// Configuración de colores corporativos para gráficos
const CHART_COLORS = ['#0f172a', '#059669', '#e11d48', '#0284c7', '#7c3aed'];

/**
 * Dashboard Administrativo (Business Intelligence).
 * Proporciona una visión gerencial del estado del parqueadero mediante
 * visualizaciones de datos, KPIs y mapas de calor históricos.
 */
export const AdminDashboard: React.FC = () => {
  const { 
    resumen, 
    trafico, 
    ocupacionTipo, 
    tendencia, 
    heatmap, 
    loading, 
    error, 
    refresh 
  } = useAdmin();

  if (loading && !resumen) return <DashboardSkeleton />;
  if (error) return <DashboardError message={error} retry={refresh} />;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const traficoSafe = Array.isArray(trafico) ? trafico : [];
  const ocupacionTipoSafe = Array.isArray(ocupacionTipo) ? ocupacionTipo : [];
  const tendenciaSafe = Array.isArray(tendencia) ? tendencia : [];
  const heatmapSafe = Array.isArray(heatmap) ? heatmap : [];

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

      {/* Grid de KPIs (Key Performance Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <StatCard icon={<Users className="text-slate-700" />} label="Usuarios" value={resumen?.totalUsuarios} />
        <StatCard 
          icon={<MapPin className="text-amber-600" />} 
          label="Ocupación" 
          value={`${resumen?.ocupacion ? ((resumen.ocupacion.ocupados / resumen.ocupacion.total) * 100 || 0).toFixed(1) : 0}%`} 
          subValue={resumen?.ocupacion ? `${resumen.ocupacion.ocupados}/${resumen.ocupacion.total} Bahías` : '0/0 Bahías'}
        />
        <StatCard icon={<Activity className="text-emerald-600" />} label="Ingresos Hoy" value={resumen?.ingresosHoy} />
        <StatCard icon={<Calendar className="text-slate-700" />} label="Ingresos Mes" value={resumen?.ingresosMes} />
        <StatCard 
          icon={<AlertTriangle className="text-rose-600" />} 
          label="Alertas 24h" 
          value={resumen?.alertasActivas || 0} 
          trend={(resumen?.alertasActivas || 0) > 0 ? "Atención" : "Limpio"}
          isCritical={(resumen?.alertasActivas || 0) > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
        {/* Gráfico de Flujo de Tráfico por Horas */}
        <div className="xl:col-span-8 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <ChartHeader title="Flujo de Tráfico" subtitle="Horas pico detectadas" icon={<Clock className="text-slate-700" />} />
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={traficoSafe}>
                <defs>
                  <linearGradient id="colorTrafico" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="hora" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                  tickFormatter={(val) => `${val}:00`}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{stroke: '#0f172a', strokeWidth: 2}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}} 
                />
                <Area type="monotone" dataKey="cantidad" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorTrafico)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución por Tipo de Vehículo */}
        <div className="xl:col-span-4 bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <ChartHeader title="Segmentación" subtitle="Distribución de flota" icon={<Database className="text-slate-700" />} />
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ocupacionTipoSafe} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="cantidad" nameKey="tipo">
                    {ocupacionTipoSafe.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-6">
              {ocupacionTipoSafe.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl flex flex-col items-center border border-slate-200">
                  <div className="w-2 h-2 rounded-full mb-2" style={{backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]}}></div>
                  <span className="text-[9px] font-black uppercase text-slate-500 mb-1">{item.tipo}</span>
                  <span className="text-sm font-black text-slate-900 tabular-nums">{item.cantidad}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mapa de Calor de Bahías (Intensidad de Uso) */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
        <ChartHeader title="Mapa de Intensidad" subtitle="Frecuencia histórica de uso" icon={<MapPin className="text-slate-700" />} />
        <div className="flex flex-wrap gap-4">
          {heatmapSafe.map((h, idx) => {
            const maxIntensidad = Math.max(...heatmapSafe.map(x => x.intensidad), 1);
            const opacidad = (h.intensidad / maxIntensidad) * 0.8 + 0.1;
            return (
              <div 
                key={idx} 
                className="w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-slate-200 transition-all duration-200 hover:shadow-sm"
                style={{ backgroundColor: `rgba(15, 23, 42, ${opacidad})` }}
                title={`Bahía ${h.idBahia}: ${h.intensidad} usos`}
              >
                <span className="text-[10px] font-black text-white drop-shadow-sm">B-{h.idBahia}</span>
                <span className="text-[8px] font-bold text-white opacity-80">{h.intensidad}</span>
              </div>
            );
          })}
        </div>
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
  );
};

// --- SUBCOMPONENTES DE UI ---

const DashboardSkeleton = () => (
  <div className="p-8 space-y-8 animate-pulse">
    <div className="h-20 bg-slate-200 rounded-xl w-1/3"></div>
    <div className="grid grid-cols-5 gap-4">
      {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
    </div>
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-8 h-96 bg-slate-200 rounded-xl"></div>
      <div className="col-span-4 h-96 bg-slate-200 rounded-xl"></div>
    </div>
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
