import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
            <a href="/appadmin" className="bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/20">
              Panel Administrador
            </a>
          )}
          {isOperativo && (
            <a href="/appperop" className="bg-gray-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-900/20">
              Panel Operativo
            </a>
          )}
          {isAprendiz && (
            <a href="/app" className="bg-green-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 shadow-xl shadow-green-600/20">
              Panel Aprendiz
            </a>
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
        <a href="/" className="px-10 py-4 bg-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">Volver</a>
        <button onClick={logout} className="px-10 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all">Logout</button>
      </div>
    </div>
  ); 
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} />
            
            <Route path="/" element={<ProtectedRoute><Saludo /></ProtectedRoute>} />

            {/* Rutas Admin con Layout */}
            <Route path="/appadmin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="vehiculos" element={<VehiculosPage />} />
              <Route path="bahias" element={<BahiasPage />} />
              <Route path="auditoria" element={<AuditoriaPage />} />
              <Route path="telemetria" element={<TelemetriaPage />} />
            </Route>

            <Route path="/appperop" element={<ProtectedRoute><OperativoDashboard /></ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute><PanelAprendiz /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;
