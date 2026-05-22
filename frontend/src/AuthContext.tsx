import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from './types';

/**
 * REFACTOR: Interfaz extendida para incluir tokens en el estado del contexto.
 */
interface AuthData {
  accessToken: string;
  refreshToken: string;
  usuario: User;
}

/**
 * Definición de la interfaz del contexto de autenticación con tipado estricto.
 */
interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthData | null;
  login: (userData: AuthData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider global de Autenticación.
 * PERFORMANCE: Uso de useCallback para evitar re-renders innecesarios.
 * SECURITY: Tipado estricto para evitar errores en tiempo de ejecución.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthData | null>(null);

  /**
   * Recupera la sesión guardada al inicializar la aplicación.
   */
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && (parsedUser.accessToken || parsedUser.access_token)) {
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('FIX: Error al recuperar sesión de localStorage');
        localStorage.removeItem('user');
      }
    }
  }, []);

  /**
   * Establece una nueva sesión de usuario.
   * PERFORMANCE: Memoizado con useCallback.
   */
  const login = useCallback((userData: AuthData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  /**
   * Finaliza la sesión actual y limpia el almacenamiento local.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook para acceder fácilmente al estado de autenticación desde cualquier componente.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
