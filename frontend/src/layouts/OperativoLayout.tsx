import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { 
  Scan, LayoutGrid, ClipboardList, 
  Bell, Settings, LogOut,
  Menu, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Layout Principal para el Panel Operativo.
 * Corregido: Sidebar no se superpone, botón de colapso en header, logo SENA ajustado, modo oscuro funcional.
 */
export const OperativoLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const { setTheme, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Actualizar hora cada minuto
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Control responsive
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(false);
      } else if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { path: '/appperop', label: 'Control de Acceso', icon: <Scan size={20} /> },
    { path: '/appperop/bahias', label: 'Estado de Salidas', icon: <LayoutGrid size={20} /> },
    { path: '/appperop/movimientos', label: 'Movimientos', icon: <ClipboardList size={20} /> },
    { path: '/appperop/alertas', label: 'Alertas', icon: <Bell size={20} /> },
    { path: '/appperop/configuracion', label: 'Configuración', icon: <Settings size={20} /> },
  ];

  const pageMeta = useMemo(() => {
    const path = location.pathname;
    const base = '/appperop';
    const segment = path.replace(base, '').split('/').filter(Boolean)[0] || '';

    const metaMap: Record<string, { title: string; subtitle: string }> = {
      '': { title: 'Control de Acceso', subtitle: 'Gestión de ingresos y salidas' },
      bahias: { title: 'Estado de Salidas', subtitle: 'Monitoreo de plazas en tiempo real' },
      movimientos: { title: 'Movimientos', subtitle: 'Historial detallado de operaciones' },
      alertas: { title: 'Alertas', subtitle: 'Notificaciones críticas del sistema' },
      configuracion: { title: 'Configuración', subtitle: 'Preferencias y ajustes operativos' },
    };

    return metaMap[segment] || metaMap[''];
  }, [location.pathname]);

  const operadorNombre = user?.usuario?.nombreCompleto || 'Operador';

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64';

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#0a0a0a] font-sans overflow-hidden transition-colors duration-300">
      {/* Overlay para Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[60] lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Lateral */}
      <aside className={`
        ${sidebarWidth} bg-[#012E25] text-white flex flex-col h-full
        transition-all duration-300 ease-in-out z-[70] overflow-hidden border-r border-white/5 shadow-2xl
        fixed lg:relative
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full py-6">
          {/* Logo SENA Ajustado - Más pequeño con texto al lado */}
          <div className={`px-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start px-6'} mb-10`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <img 
                src="/logo.png" 
                alt="SENA Logo" 
                className="w-8 h-8 brightness-0 invert object-contain shrink-0" 
              />
              {!isCollapsed && (
                <div className="flex flex-col leading-none">
                  <span className="text-lg font-black tracking-tighter">SENA</span>
                  <span className="text-[8px] font-bold text-[#39B000] uppercase tracking-widest">Parqueadero</span>
                </div>
              )}
            </div>
          </div>

          {/* Navegación Principal */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 ml-4">Módulos</p>
            )}
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} 
                    py-3 rounded-xl transition-all duration-200 group relative
                    ${isActive 
                      ? 'bg-[#39B000] text-white shadow-lg shadow-green-900/20' 
                      : 'text-white/60 hover:bg-white/5 hover:text-white'}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <div className={`${isActive ? 'text-white' : 'text-white/40 group-hover:text-white'} transition-colors`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <span className="text-sm font-medium tracking-tight truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Info Usuario Reducida */}
          <div className="mt-auto px-3 pt-6 border-t border-white/5">
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} mb-4`}>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-xs shrink-0 border border-white/10">
                {operadorNombre.substring(0, 2)}
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{operadorNombre}</p>
                  <p className="text-[9px] font-bold text-[#39B000] uppercase tracking-widest">En línea</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={logout}
              className={`
                w-full flex items-center justify-center ${isCollapsed ? 'py-3' : 'gap-3 py-3 px-4'} 
                text-white/30 font-bold text-[10px] uppercase tracking-widest 
                hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all duration-200
              `}
              title={isCollapsed ? 'Cerrar sesión' : ''}
            >
              <LogOut size={16} /> {!isCollapsed && 'Cerrar sesión'}
            </button>
          </div>
        </div>
      </aside>

      {/* Área de Contenido Principal - Corregida para no ser sobrepasada */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Header Superior Sobrio */}
        <header className="bg-white dark:bg-[#121212] border-b border-gray-100 dark:border-white/5 px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-[40] transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileOpen(!isMobileOpen);
                } else {
                  setIsCollapsed(!isCollapsed);
                }
              }}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all"
            >
              <Menu size={20} />
            </button>
            
            <div>
              <h1 className="text-lg font-bold text-[#012E25] dark:text-white tracking-tight">{pageMeta.title}</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{pageMeta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-full border border-gray-100 dark:border-white/5">
              <div className="w-2 h-2 rounded-full bg-[#39B000] shadow-[0_0_8px_rgba(57,176,0,0.4)]" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Servidor <span className="text-[#39B000]">Activo</span>
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              {/* Botón de Modo Oscuro - Togle entre light y dark */}
              <button 
                onClick={() => {
                  const nextTheme = isDark ? 'light' : 'dark';
                  setTheme(nextTheme);
                }}
                className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all group"
                title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {isDark ? (
                  <Sun size={18} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                ) : (
                  <Moon size={18} className="group-hover:text-blue-400 group-hover:scale-110 transition-transform" />
                )}
              </button>


              <button 
                onClick={() => navigate('/appperop/alertas')}
                className="relative p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all"
                title="Notificaciones"
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-[#121212]" />
              </button>

              <button 
                onClick={() => navigate('/appperop/configuracion')}
                className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-all"
                title="Configuración"
              >
                <Settings size={18} />
              </button>
            </div>

            <div className="pl-6 border-l border-gray-100 dark:border-white/5 text-right hidden sm:block">
              <p className="text-sm font-bold text-[#012E25] dark:text-white leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {currentTime.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        </header>

        {/* Contenido Dinámico - Asegurado con overflow-y-auto y padding */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#F8F9FA] dark:bg-[#0a0a0a] custom-scrollbar transition-colors duration-300">
          <div className="max-w-[1400px] mx-auto animate-in fade-in duration-300">
            <Outlet />
          </div>
        </div>

        {/* Footer Sobrio */}
        <footer className="bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-white/5 px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            SISTEMA DE PARQUEADERO INSTITUCIONAL • SENA IBAGUÉ
          </p>
          <p className="text-[9px] font-bold text-gray-300 dark:text-gray-600 uppercase tracking-widest">
            © 2026 ADSO
          </p>
        </footer>
      </main>
    </div>
  );
};