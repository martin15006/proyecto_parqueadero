import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './login';
import Registro from './registro';
import ProtectedRoute from './ProtectedRoute';
import { AuthProvider, useAuth } from './AuthContext';

function Saludo() {
  const { user, logout } = useAuth();
  return (
    <div style={{ padding: '20px' }}>
      <h1>Conectado con éxito</h1>
      <p>Bienvenido, {user?.nombreCompleto || 'Usuario'}</p>
      <button onClick={logout} style={{ padding: '10px', cursor: 'pointer' }}>
        Cerrar Sesión
      </button>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Saludo />
              </ProtectedRoute>
            } 
          />
          {/* Redirigir cualquier otra ruta al main */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
