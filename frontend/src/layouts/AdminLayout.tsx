import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Car, MapPin, 
  ShieldCheck, LogOut, ChevronRight,
  Database, Cpu
} from 'lucide-react';
import { useAuth } from '../AuthContext';

/**
 * Layout Principal para el Panel Administrativo.
 * Proporciona navegación lateral persistente y control de sesión.
 */
export const AdminLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/appadmin', label: 'Analytics', icon: <LayoutDashboard size={20} /> },
    { path: '/appadmin/usuarios', label: 'Usuarios', icon: <Users size={20} /> },
    { path: '/appadmin/vehiculos', label: 'Vehículos', icon: <Car size={20} /> },
    { path: '/appadmin/bahias', label: 'Infraestructura', icon: <MapPin size={20} /> },
    { path: '/appadmin/telemetria', label: 'Telemetría IoT', icon: <Cpu size={20} /> },
    { path: '/appadmin/auditoria', label: 'Auditoría', icon: <Database size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Sidebar Lateral */}
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 leading-tight">Admin Pro</h2>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Enterprise v1.0</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between p-4 rounded-2xl transition-all group ${
                  location.pathname === item.path 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
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

        <div className="mt-auto p-8 border-t border-gray-50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-black text-xs uppercase">
              {user?.nombreCompleto?.substring(0, 2) || 'AD'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-black text-gray-900 truncate">{user?.nombreCompleto || 'Administrador'}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{user?.correo}</p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 p-4 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-colors"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
