import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactNode } from 'react';

// FIX: corregido tipado JSX.Element a ReactNode para compatibilidad con TS strict mode
const ProtectedRoute = ({ children, allowedRoles }: { children: ReactNode; allowedRoles?: number[] }) => {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.usuario) {
    logout();
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const idRol = parseInt(String(user.usuario.idTipoUsr || 0), 10);
    if (!allowedRoles.includes(idRol)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
