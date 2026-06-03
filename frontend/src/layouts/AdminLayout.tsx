import React, { useMemo } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, Car,
  ShieldCheck, LogOut, ChevronRight,
  Database, FileText, Inbox,
} from 'lucide-react';
import { useAuth } from '../AuthContext';

/**
 * Layout Principal para el Panel Administrativo.
 * Sidebar fijo a la izquierda. Header simple sin menú desplegable.
 */
export const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/appadmin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/appadmin/usuarios', label: 'Usuarios', icon: <Users size={20} /> },
    { path: '/appadmin/vehiculos', label: 'Vehículos', icon: <Car size={20} /> },
    { path: '/appadmin/solicitudes', label: 'Solicitudes', icon: <Inbox size={20} /> },
    { path: '/appadmin/auditoria', label: 'Auditoría', icon: <Database size={20} /> },
    { path: '/appadmin/informes', label: 'Reportes', icon: <FileText size={20} /> },
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
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar Lateral */}
      <aside className="w-72 bg-[#232323] text-white/90 border-r border-black/10 flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#39A900] shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white leading-tight">SENA • Admin</h2>
              <p className="text-[10px] font-black text-[#39A900]/95 uppercase tracking-widest">Consola institucional</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 group ${
                  location.pathname === item.path
                    ? 'bg-white/10 text-white shadow-sm ring-2 ring-[#39A900]/30'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 font-bold text-sm">
                  {item.icon}
                  {item.label}
                </div>
                <ChevronRight size={14} className={location.pathname === item.path ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} />
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black text-xs uppercase">
              {user?.usuario?.nombreCompleto?.substring(0, 2) || 'AD'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-white truncate">{user?.usuario?.nombreCompleto || 'Administrador'}</p>
              <p className="text-[9px] font-bold text-white/60 uppercase truncate">{user?.usuario?.correo}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 p-4 text-rose-200 font-black text-xs uppercase tracking-widest hover:bg-white/10 rounded-xl transition-all duration-200"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="sticky top-0 z-40 bg-slate-50/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <span className="text-slate-400">Admin</span>
                <span className="text-slate-300">/</span>
                <span className="truncate">{pageMeta.title}</span>
              </div>
              <div className="mt-1">
                <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">{pageMeta.title}</h1>
                <p className="text-xs font-semibold text-slate-500 truncate">{pageMeta.subtitle}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
