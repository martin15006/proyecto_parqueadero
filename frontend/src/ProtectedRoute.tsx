import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { ReactNode } from 'react';

// FIX: corregido tipado JSX.Element a ReactNode para compatibilidad con TS strict mode
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;