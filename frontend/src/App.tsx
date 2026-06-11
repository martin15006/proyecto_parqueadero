import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './login';
import Registro from './registro';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider, useAuth } from './AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLayout } from './layouts/AdminLayout';
import { UsuariosPage } from './pages/admin/UsuariosPage';
import { VehiculosPage } from './pages/admin/VehiculosPage';
import { SolicitudesPage } from './pages/admin/SolicitudesPage';
import { BahiasPage } from './pages/admin/BahiasPage';
import { TelemetriaPage } from './pages/admin/TelemetriaPage';
import { OperativosPage } from './pages/admin/OperativosPage';
import { ConfiguracionAdminPage } from './pages/admin/ConfiguracionAdminPage';
import { VisitantesPage } from './pages/admin/VisitantesPage';
import { InformesPage } from './pages/admin/InformesPage';
import { GraficosPage } from './pages/admin/GraficosPage';
import { OperativoLayout } from './layouts/OperativoLayout';
import { ControlAccesoView } from './pages/operativo/ControlAccesoView';
import { EstadoBahiasView } from './pages/operativo/EstadoBahiasView';
import { MovimientosView } from './pages/operativo/MovimientosView';
import { AlertasView } from './pages/operativo/AlertasView';
import { ConfiguracionView } from './pages/operativo/ConfiguracionView';
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

// Redirige automáticamente al panel del rol. La plataforma web es para personal
// (Administrador / Operativo); los aprendices usan la app móvil -> al login.
function RedirectByRole() {
  const { user } = useAuth();
  const idRol = parseInt(String(user?.usuario?.idTipoUsr || 0), 10);
  if (idRol === 2) return <Navigate to="/appadmin" replace />;
  if (idRol === 3) return <Navigate to="/appperop" replace />;
  return <Navigate to="/login" replace />;
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
              
              <Route path="/" element={<ProtectedRoute><RedirectByRole /></ProtectedRoute>} />

              {/* Rutas Admin con Layout */}
              <Route path="/appadmin" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="operativos" element={<OperativosPage />} />
                <Route path="visitantes" element={<VisitantesPage />} />
                <Route path="vehiculos" element={<VehiculosPage />} />
                <Route path="solicitudes" element={<SolicitudesPage />} />
                <Route path="bahias" element={<BahiasPage />} />
                <Route path="informes" element={<InformesPage />} />
                <Route path="graficos" element={<GraficosPage />} />
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

              {/* Rutas Operativo con Layout */}
              <Route path="/appperop" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.OPERATIVO]}><OperativoLayout /></ProtectedRoute>}>
                <Route index element={<ControlAccesoView />} />
                <Route path="bahias" element={<EstadoBahiasView />} />
                <Route path="movimientos" element={<MovimientosView />} />
                <Route path="alertas" element={<AlertasView />} />
                <Route path="configuracion" element={<ConfiguracionView />} />
              </Route>

              {/* Alias para rutas operativo solicitadas */}
              <Route path="/control-acceso" element={<Navigate to="/appperop" replace />} />
              <Route path="/estado-salidas" element={<Navigate to="/appperop/bahias" replace />} />
              <Route path="/movimientos" element={<Navigate to="/appperop/movimientos" replace />} />
              <Route path="/alertas" element={<Navigate to="/appperop/alertas" replace />} />
              <Route path="/configuracion" element={<Navigate to="/appperop/configuracion" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </AppErrorBoundary>
  );
}

export default App;
