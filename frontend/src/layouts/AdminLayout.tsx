import React, { useMemo, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Car,
  LogOut,
  Database, FileText, Inbox, Sun, Moon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Layout Principal para el Panel Administrativo.
 * Proporciona navegación lateral persistente con estilo institucional SENA.
 */
export const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const { isDark, setTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const menuItems = [
    { path: '/appadmin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/appadmin/usuarios', label: 'Usuarios', icon: Users },
    { path: '/appadmin/vehiculos', label: 'Vehículos', icon: Car },
    { path: '/appadmin/solicitudes', label: 'Solicitudes', icon: Inbox },
    { path: '/appadmin/auditoria', label: 'Auditoría', icon: Database },
    { path: '/appadmin/informes', label: 'Reportes', icon: FileText },
  ];

  const pageMeta = useMemo(() => {
    const path = location.pathname;
    const base = '/appadmin';

    if (!path.startsWith(base)) {
      return { title: 'Panel', subtitle: 'Administración del sistema' };
    }

    const segment = path.replace(base, '').split('/').filter(Boolean)[0] || '';

    const metaMap: Record<string, { title: string; subtitle: string }> = {
      '': { title: 'Dashboard', subtitle: 'Consola ejecutiva y métricas del sistema' },
      usuarios: { title: 'Usuarios', subtitle: 'Administración de cuentas institucionales' },
      vehiculos: { title: 'Vehículos', subtitle: 'Control de flota y contingencias' },
      solicitudes: { title: 'Solicitudes', subtitle: 'Aprobación de registros de vehículos' },
      auditoria: { title: 'Auditoría', subtitle: 'Trazabilidad de operaciones críticas' },
      informes: { title: 'Reportes', subtitle: 'Exportación institucional' },
    };

    return metaMap[segment] || { title: 'Panel', subtitle: 'Administración del sistema' };
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#F0F4F0] dark:bg-[#0A0A0A] font-sans overflow-hidden text-gray-900 dark:text-gray-100 transition-colors duration-700">
      {/* Sidebar Lateral - Estética Premium Institucional */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:relative
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-24 -translate-x-full lg:translate-x-0'}
        bg-[#232323] dark:bg-[#121212] transition-all duration-500 flex flex-col overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.1)] lg:shadow-none border-r dark:border-white/5
      `}>
        {/* Círculo decorativo superior (Esquina superior derecha) */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#39A900] opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none transition-transform duration-700 group-hover:scale-110" />
        
        {/* Header Sidebar - Gradiente SENA */}
        <div className={`p-8 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#39A900] via-[#007832] to-[#39A900]" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover:rotate-6 transition-transform">
              <img src="/logo.png" alt="SENA" className="w-10 h-10 object-contain brightness-0 invert" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col border-l border-white/10 pl-4 animate-in fade-in slide-in-from-left-4">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white leading-tight">Sistema Admin</span>
                <span className="text-[10px] font-bold text-[#39A900] leading-tight">Parqueadero</span>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {menuItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={idx}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-[22px] transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-[#39A900] text-white shadow-[0_8px_20px_rgba(57,169,0,0.3)]' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                } ${!isSidebarOpen ? 'justify-center' : ''}`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-[#39A900]'}`} />
                {isSidebarOpen && <span className="font-black text-[13px] tracking-tight whitespace-nowrap">{item.label}</span>}
                {isActive && (
                  <div className={`absolute bg-white/40 rounded-full transition-all duration-500 ${
                    isSidebarOpen 
                      ? 'right-4 w-1 h-6' 
                      : 'inset-y-3 left-1 w-1 rounded-r-full'
                  }`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Perfil de Usuario - Estilo Premium */}
        {/* Onda Decorativa SENA en Sidebar (Inferior) */}
        <div className="absolute bottom-0 left-0 w-full pointer-events-none opacity-20 z-0">
          <svg viewBox="0 0 500 200" preserveAspectRatio="none" className="w-full h-32">
            <path d="M0,120 C150,180 350,60 500,120 L500,200 L0,200 Z" fill="#39A900" />
          </svg>
        </div>

        {/* Perfil de Usuario - Estilo Premium */}
        <div className="p-6 border-t border-white/5 relative z-10 bg-black/20 dark:bg-black/40">
          <Link 
            to="/appadmin/configuracion"
            className={`flex items-center gap-4 p-4 rounded-[24px] bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-500 group border border-white/5 ${!isSidebarOpen ? 'justify-center' : ''}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#39A900] to-[#007832] flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:scale-105 transition-transform flex-shrink-0 border border-white/20">
              {user?.usuario?.nombreCompleto?.charAt(0) || 'A'}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden animate-in fade-in">
                <p className="font-black text-[14px] text-white truncate leading-tight">{user?.usuario?.nombreCompleto || 'Administrador'}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#39A900] animate-pulse" />
                  <p className="text-[9px] text-[#39A900] font-black uppercase tracking-[0.15em]">Online</p>
                </div>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Pestaña de menú en el borde del sidebar: flecha hacia afuera cuando
            está oculto/colapsado y hacia adentro cuando está desplegado. */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          aria-label={isSidebarOpen ? 'Contraer menú' : 'Expandir menú'}
          title={isSidebarOpen ? 'Contraer menú' : 'Expandir menú'}
          className="absolute left-0 top-6 z-[80] w-6 h-12 rounded-r-xl bg-[#007832] text-white shadow-lg border border-l-0 border-white/10 flex items-center justify-center hover:w-7 transition-all duration-200"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* Top Header - Estética Vibrante */}
        <header className="h-24 bg-white dark:bg-[#121212]/80 dark:backdrop-blur-xl border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-6 lg:px-10 z-40 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-colors duration-500">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight truncate">
                <span className="hidden sm:inline text-gray-400 dark:text-gray-500 font-medium">Panel</span> 
                <span className="w-1.5 h-6 bg-[#39A900] rounded-full hidden sm:block" />
                <span className="text-[#232323] dark:text-gray-100">Administración</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-[#39A900] animate-pulse shadow-[0_0_10px_#39A900]" />
                <span className="text-[10px] font-black text-[#39A900] uppercase tracking-[0.2em]">Servicio Nacional de Aprendizaje</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-8">
            {/* Toggle de Modo Oscuro */}
            <button
              onClick={toggleTheme}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#F8FAFC] dark:bg-white/5 text-gray-400 hover:text-[#39A900] transition-all duration-300 border border-gray-100 dark:border-white/10"
              title={isDark ? "Activar modo claro" : "Activar modo oscuro"}
            >
              {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>

            <div className="flex items-center gap-5 pl-6 lg:pl-8 border-l border-gray-100 dark:border-white/10">
              <div className="text-right hidden sm:block">
                <p className="font-black text-[14px] text-gray-900 dark:text-white leading-tight">{user?.usuario?.nombreCompleto || 'Administrador'}</p>
                <p className="text-[10px] text-[#39A900] font-black uppercase tracking-[0.1em] mt-1">Consola de Control</p>
              </div>
              <button 
                onClick={logout}
                className="group flex items-center gap-3 px-6 py-3 bg-[#39A900] hover:bg-[#2F8A00] text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all duration-300 shadow-lg shadow-[#39A900]/20 active:scale-95 border border-white/10"
              >
                <span className="hidden md:block">Salir</span>
                <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-thin scrollbar-thumb-[#39A900]/20 dark:scrollbar-thumb-white/10">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb y Títulos Premium */}
            <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter shrink-0">{pageMeta.title}</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-white/10 to-transparent mt-2" />
                  </div>
                </div>
                
                {/* Slot para botones de acción inyectados desde las páginas */}
                <div id="admin-page-actions" className="flex-shrink-0" />
              </div>
            </div>

            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};
