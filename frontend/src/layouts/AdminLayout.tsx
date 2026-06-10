import React, { useMemo, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Car,
  LogOut, ChevronRight,
  Database, Menu, FileText, Inbox
} from 'lucide-react';
import { useAuth } from '../AuthContext';

/**
 * Layout Principal para el Panel Administrativo.
 * Proporciona navegación lateral persistente con estilo institucional SENA.
 */
export const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    <div className="flex h-screen bg-[#F0F4F0] font-sans overflow-hidden text-gray-900 transition-colors">
      {/* Sidebar Lateral - Estética Premium Institucional */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:relative
        ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-24 -translate-x-full lg:translate-x-0'}
        bg-[#232323] transition-all duration-500 flex flex-col overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.1)] lg:shadow-none
      `}>
        {/* Header Sidebar - Gradiente SENA */}
        <div className={`p-8 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} relative overflow-hidden`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#39A900] via-[#007832] to-[#39A900]" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/20 group-hover:rotate-6 transition-transform border-2 border-[#39A900]/20">
              <img src="/logo.png" alt="SENA" className="w-7 h-7" />
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
                  <div className={`absolute rounded-full bg-white/20 ${isSidebarOpen ? 'right-4 w-1.5 h-1.5' : 'inset-0'}`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Perfil de Usuario - Estilo Premium */}
        <div className="p-6 border-t border-white/5 relative z-10 bg-black/20">
          <div className={`flex items-center gap-4 p-4 rounded-[24px] bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-500 group border border-white/5 ${!isSidebarOpen ? 'justify-center' : ''}`}>
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
          </div>
        </div>

        {/* Onda Decorativa SENA en Sidebar (Inferior) */}
        <div className="absolute bottom-0 left-0 w-full pointer-events-none opacity-20">
          <svg viewBox="0 0 500 200" preserveAspectRatio="none" className="w-full h-32">
            <path d="M0,120 C150,180 350,60 500,120 L500,200 L0,200 Z" fill="#39A900" />
          </svg>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header - Estética Vibrante */}
        <header className="h-24 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-40 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#F8FAFC] text-gray-400 hover:bg-[#39A900]/10 hover:text-[#39A900] transition-all duration-300 border border-gray-100 group"
              title={isSidebarOpen ? "Contraer menú" : "Expandir menú"}
            >
              <Menu className={`w-6 h-6 transition-transform duration-500 ${isSidebarOpen ? '' : 'rotate-180'}`} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl lg:text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight truncate">
                <span className="hidden sm:inline text-gray-400 font-medium">Panel</span> 
                <span className="w-1.5 h-6 bg-[#39A900] rounded-full hidden sm:block" />
                <span className="text-[#232323]">Administración</span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-[#39A900] animate-pulse" />
                <span className="text-[10px] font-black text-[#39A900] uppercase tracking-[0.2em]">Servicio Nacional de Aprendizaje</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 lg:gap-8">
            <div className="flex items-center gap-5 pl-6 lg:pl-8 border-l border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="font-black text-[14px] text-gray-900 leading-tight">{user?.usuario?.nombreCompleto || 'Administrador'}</p>
                <p className="text-[10px] text-[#39A900] font-black uppercase tracking-[0.1em] mt-1">Consola de Control</p>
              </div>
              <button 
                onClick={logout}
                className="group flex items-center gap-3 px-6 py-3 bg-[#232323] hover:bg-rose-600 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all duration-300 shadow-lg shadow-black/5 active:scale-95 border border-white/5"
              >
                <span className="hidden md:block">Salir</span>
                <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-thin scrollbar-thumb-[#39A900]/20">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb y Títulos Premium */}
            <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                    <span className="text-[#39A900] hover:text-[#007832] cursor-pointer transition-colors">Admin</span>
                    <ChevronRight size={12} className="text-gray-300" />
                    <span className="text-gray-900">{pageMeta.title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-4xl font-black text-gray-900 tracking-tighter shrink-0">{pageMeta.title}</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent mt-2" />
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
