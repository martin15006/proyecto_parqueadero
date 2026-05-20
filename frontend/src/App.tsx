import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './login';
import Registro from './registro';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider, useAuth } from './AuthContext';

// Vista de bienvenida raíz (/)
function Saludo() {
  const { user, logout } = useAuth();
  
  // Desempaquetamos de forma segura las minúsculas de Postgres
  const datosReales = user?.user || user?.usuario || user;
  const nombreReal = datosReales?.nombrecompleto || datosReales?.nombreCompleto || 'Usuario';
  const rol = datosReales?.idtipousr || datosReales?.idTipoUsr;

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: 'auto', textAlign: 'center' }}>
      <h1>Conectado con éxito</h1>
      <p style={{ fontSize: '18px' }}>Bienvenido, <strong>{nombreReal}</strong></p>
      <p style={{ color: '#666' }}>Tu rol en el sistema es el ID: {rol}</p>
      
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
        {(rol === 3 || rol === '3') && <a href="/appadmin" style={{ padding: '10px', background: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Ir al Panel Administrador</a>}
        {(rol === 2 || rol === '2') && <a href="/appperop" style={{ padding: '10px', background: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Ir al Panel Operativo</a>}
        {(rol === 1 || rol === '1') && <a href="/app" style={{ padding: '10px', background: '#17a2b8', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Ir al Panel Aprendiz</a>}
        
        <button onClick={logout} style={{ padding: '10px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

// 🛠️ MÓDULO 3: Panel de Control - Administrador (Felipe)
function PanelAdmin() { 
  const { logout } = useAuth();
  return (
    <div style={{ padding: '20px' }}>
      <h1>🛠️ Panel de Control - Administrador</h1>
      <p>Bienvenido al control total del parqueadero.</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <a href="/" style={{ padding: '10px', background: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Volver al Inicio</a>
        <button onClick={logout} style={{ padding: '10px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  ); 
}

// 🚗 MÓDULO 2: Panel de Control - Operario (Joshua)
function PanelOperativo() { 
  const { logout } = useAuth();
  return (
    <div style={{ padding: '20px' }}>
      <h1>🚗 Panel de Control - Operario</h1>
      <p>Bienvenido al registro de ingresos y salidas.</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <a href="/" style={{ padding: '10px', background: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Volver al Inicio</a>
        <button onClick={logout} style={{ padding: '10px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  ); 
}

// 🚲 MÓDULO 1: Panel - Aprendiz
function PanelAprendiz() { 
  const { logout } = useAuth();
  return (
    <div style={{ padding: '20px' }}>
      <h1>🚲 Panel - Aprendiz</h1>
      <p>Bienvenido al sistema de reserva de bahías.</p>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <a href="/" style={{ padding: '10px', background: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>Volver al Inicio</a>
        <button onClick={logout} style={{ padding: '10px', cursor: 'pointer', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>
          Cerrar Sesión
        </button>
      </div>
    </div>
  ); 
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          
          {/* Ruta Raíz Protegida */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Saludo />
              </ProtectedRoute>
            } 
          />

          {/* Rutas de Trabajo Protegidas */}
          <Route path="/appadmin" element={<ProtectedRoute><PanelAdmin /></ProtectedRoute>} />
          <Route path="/appperop" element={<ProtectedRoute><PanelOperativo /></ProtectedRoute>} />
          <Route path="/app" element={<ProtectedRoute><PanelAprendiz /></ProtectedRoute>} />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;