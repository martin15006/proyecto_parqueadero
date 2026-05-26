import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './login';
import Registro from './registro';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider, useAuth } from './AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { OperativoDashboard } from './pages/OperativoDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLayout } from './layouts/AdminLayout';
import { UsuariosPage } from './pages/admin/UsuariosPage';
import { VehiculosPage } from './pages/admin/VehiculosPage';
import { BahiasPage } from './pages/admin/BahiasPage';
import { AuditoriaPage } from './pages/admin/AuditoriaPage';
import { TelemetriaPage } from './pages/admin/TelemetriaPage';
import { OperativosPage } from './pages/admin/OperativosPage';
import { ConfiguracionAdminPage } from './pages/admin/ConfiguracionAdminPage';
import { VisitantesPage } from './pages/admin/VisitantesPage';
import { InformesPage } from './pages/admin/InformesPage';
import { GraficosPage } from './pages/admin/GraficosPage';
import { UserRole } from './constants/enums';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado en el cliente';
    return { hasError: true, message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-10 max-w-lg w-full text-center">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Se produjo un error de renderizado</h1>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              La aplicación activó un modo de recuperación para evitar pantalla en blanco.
            </p>
            <p className="mt-4 text-[11px] font-mono text-slate-500 break-words">
              {this.state.message}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest transition-all duration-200 hover:bg-slate-950"
              >
                Recargar
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('user');
                  window.location.href = '/login';
                }}
                className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-widest transition-all duration-200 hover:bg-slate-50"
              >
                Ir a Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Vista de bienvenida raíz (/)
function Saludo() {
  const { user, logout } = useAuth();
  
  // REFACTOR: Acceso seguro al perfil tras tipado estricto de AuthData
  const perfil = user?.usuario;
  const nombreReal = perfil?.nombreCompleto || 'Usuario';
  const idRol = parseInt(String(perfil?.idTipoUsr || 0), 10);
  
  const isAdmin = idRol === 2;
  const isOperativo = idRol === 3;
  const isAprendiz = idRol === 1;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 font-sans">
      <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl max-w-lg w-full text-center space-y-8 border border-gray-100">
        <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center text-white text-4xl font-black mx-auto shadow-2xl shadow-blue-600/30">
          {nombreReal.substring(0,1)}
        </div>
        
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">¡Hola, {nombreReal}!</h1>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px]">Bienvenido al Ecosistema de Gestión</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {isAdmin && (
            <Link to="/appadmin" className="bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20">
              Panel Administrador
            </Link>
          )}
          {isOperativo && (
            <Link to="/appperop" className="bg-gray-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-900/20">
              Panel Operativo
            </Link>
          )}
          {isAprendiz && (
            <Link to="/app" className="bg-green-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 shadow-xl shadow-green-600/20">
              Panel Aprendiz
            </Link>
          )}
          
          <button 
            onClick={logout} 
            className="text-red-500 font-black text-[10px] uppercase tracking-[0.2em] hover:underline pt-4"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// 🚲 MÓDULO 1: Panel - Aprendiz
function PanelAprendiz() { 
  const { logout } = useAuth();
  return (
    <div className="p-20 text-center space-y-10">
      <h1 className="text-6xl font-black text-gray-900">🚲 Panel Aprendiz</h1>
      <p className="text-gray-500 text-xl font-medium">Gestión de Movilidad Personal en Construcción</p>
      <div className="flex justify-center gap-6">
        <Link to="/" className="px-10 py-4 bg-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">Volver</Link>
        <button onClick={logout} className="px-10 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all">Logout</button>
      </div>
    </div>
  ); 
}

function App() {
  return (
    <AppErrorBoundary>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />
              
              <Route path="/" element={<ProtectedRoute><Saludo /></ProtectedRoute>} />

              {/* Rutas Admin con Layout */}
              <Route path="/appadmin" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="operativos" element={<OperativosPage />} />
                <Route path="visitantes" element={<VisitantesPage />} />
                <Route path="vehiculos" element={<VehiculosPage />} />
                <Route path="bahias" element={<BahiasPage />} />
                <Route path="informes" element={<InformesPage />} />
                <Route path="graficos" element={<GraficosPage />} />
                <Route path="auditoria" element={<AuditoriaPage />} />
                <Route path="telemetria" element={<TelemetriaPage />} />
                <Route path="configuracion" element={<ConfiguracionAdminPage />} />
              </Route>

              <Route
                path="/admin/operativos"
                element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><Navigate to="/appadmin/operativos" replace /></ProtectedRoute>}
              />
              <Route
                path="/admin/configuracion"
                element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><Navigate to="/appadmin/configuracion" replace /></ProtectedRoute>}
              />

              <Route path="/appperop" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.OPERATIVO]}><OperativoDashboard /></ProtectedRoute>} />
              <Route path="/app" element={<ProtectedRoute allowedRoles={[UserRole.APRENDIZ]}><PanelAprendiz /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </AppErrorBoundary>
  );
}

export default App;
