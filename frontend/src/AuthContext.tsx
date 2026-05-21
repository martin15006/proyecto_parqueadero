import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Definición de la interfaz del contexto de autenticación.
 */
interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  login: (userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider global de Autenticación.
 * Gestiona el estado de la sesión del usuario y la persistencia local.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);

  /**
   * Recupera la sesión guardada al inicializar la aplicación.
   */
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error al parsear usuario de localStorage');
        localStorage.removeItem('user');
      }
    }
  }, []);

  /**
   * Establece una nueva sesión de usuario.
   */
  const login = (userData: any) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  /**
   * Finaliza la sesión actual y limpia el almacenamiento local.
   */
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

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
