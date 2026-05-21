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
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900 selection:bg-blue-100">
      {/* Encabezado Gerencial */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Live System Analytics</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Consola de Inteligencia</h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">Gestión Estratégica de Infraestructura</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <ExportButton 
            label="EXCEL" 
            url={`${API_URL}/api/v1/dashboard/exportar/excel`} 
            color="hover:text-green-600 hover:border-green-500"
          />
          <ExportButton 
            label="PDF" 
            url={`${API_URL}/api/v1/dashboard/exportar/pdf`} 
            color="hover:text-red-600 hover:border-red-500"
          />
          <button 
            onClick={refresh}
            className="p-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all active:rotate-180 duration-500 shadow-lg shadow-blue-600/20"
            title="Refrescar Analíticas"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      {/* Grid de KPIs (Key Performance Indicators) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <StatCard icon={<Users className="text-blue-500" />} label="Usuarios" value={resumen?.totalUsuarios} />
        <StatCard 
          icon={<MapPin className="text-orange-500" />} 
          label="Ocupación" 
          value={`${resumen?.ocupacion ? ((resumen.ocupacion.ocupados / resumen.ocupacion.total) * 100 || 0).toFixed(1) : 0}%`} 
          subValue={resumen?.ocupacion ? `${resumen.ocupacion.ocupados}/${resumen.ocupacion.total} Bahías` : '0/0 Bahías'}
        />
        <StatCard icon={<Activity className="text-green-500" />} label="Ingresos Hoy" value={resumen?.ingresosHoy} />
        <StatCard icon={<Calendar className="text-purple-500" />} label="Ingresos Mes" value={resumen?.ingresosMes} />
        <StatCard 
          icon={<AlertTriangle className="text-red-500" />} 
          label="Alertas 24h" 
          value={resumen?.alertasActivas || 0} 
          trend={(resumen?.alertasActivas || 0) > 0 ? "Atención" : "Limpio"}
          isCritical={(resumen?.alertasActivas || 0) > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8">
        {/* Gráfico de Flujo de Tráfico por Horas */}
        <div className="xl:col-span-8 bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
          <ChartHeader title="Flujo de Tráfico" subtitle="Horas pico detectadas" icon={<Clock className="text-blue-500" />} />
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafico}>
                <defs>
                  <linearGradient id="colorTrafico" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="hora" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                  tickFormatter={(val) => `${val}:00`}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{stroke: '#3b82f6', strokeWidth: 2}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}} 
                />
                <Area type="monotone" dataKey="cantidad" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorTrafico)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución por Tipo de Vehículo */}
        <div className="xl:col-span-4 bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col">
          <ChartHeader title="Segmentación" subtitle="Distribución de flota" icon={<Database className="text-purple-500" />} />
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ocupacionTipo} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="cantidad" nameKey="tipo">
                    {ocupacionTipo.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-6">
              {ocupacionTipo.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-2xl flex flex-col items-center border border-gray-100">
                  <div className="w-2 h-2 rounded-full mb-2" style={{backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]}}></div>
                  <span className="text-[9px] font-black uppercase text-gray-400 mb-1">{item.tipo}</span>
                  <span className="text-sm font-black text-gray-900">{item.cantidad}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mapa de Calor de Bahías (Intensidad de Uso) */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 mb-8">
        <ChartHeader title="Mapa de Intensidad" subtitle="Frecuencia histórica de uso" icon={<MapPin className="text-orange-500" />} />
        <div className="flex flex-wrap gap-4">
          {heatmap.map((h, idx) => {
            const maxIntensidad = Math.max(...heatmap.map(x => x.intensidad), 1);
            const opacidad = (h.intensidad / maxIntensidad) * 0.8 + 0.1;
            return (
              <div 
                key={idx} 
                className="w-16 h-16 rounded-xl flex flex-col items-center justify-center border border-gray-100 transition-all hover:scale-110 shadow-sm"
                style={{ backgroundColor: `rgba(249, 115, 22, ${opacidad})` }}
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
      <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
        <ChartHeader title="Rendimiento Semanal" subtitle="Tendencia de los últimos 7 días" icon={<TrendingUp className="text-green-500" />} />
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tendencia}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="fecha" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                tickFormatter={(val) => new Date(val).toLocaleDateString('es-ES', {weekday: 'short'})}
              />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none'}} />
              <Bar dataKey="cantidad" fill="#10b981" radius={[10, 10, 0, 0]} barSize={40} />
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
    <div className="h-20 bg-gray-200 rounded-3xl w-1/3"></div>
    <div className="grid grid-cols-5 gap-4">
      {[1,2,3,4,5].map(i => <div key={i} className="h-32 bg-gray-200 rounded-3xl"></div>)}
    </div>
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-8 h-96 bg-gray-200 rounded-[2rem]"></div>
      <div className="col-span-4 h-96 bg-gray-200 rounded-[2rem]"></div>
    </div>
  </div>
);

const DashboardError = ({ message, retry }: { message: string, retry: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
    <div className="p-6 bg-red-50 rounded-full mb-4">
      <AlertTriangle className="text-red-500" size={48} />
    </div>
    <h2 className="text-2xl font-black text-gray-900 mb-2">Error de Analíticas</h2>
    <p className="text-gray-500 mb-6 max-w-md">{message}</p>
    <button onClick={retry} className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95">REINTENTAR CONEXIÓN</button>
  </div>
);
