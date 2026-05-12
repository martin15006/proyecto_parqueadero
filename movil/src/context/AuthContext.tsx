import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario } from '../types/usuario';
import { sessionService } from '../services/sessionService';

interface AuthContextType {
  usuario: Usuario | null;
  cargandoSesion: boolean;
  iniciarSesion: (usuario: Usuario) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // Al iniciar la app, intentar recuperar la sesión guardada
  useEffect(() => {
    (async () => {
      try {
        const usuarioGuardado = await sessionService.obtenerSesion();
        if (usuarioGuardado) {
          setUsuario(usuarioGuardado);
        }
      } catch (error) {
        console.error('Error al recuperar sesión:', error);
      } finally {
        setCargandoSesion(false);
      }
    })();
  }, []);

  const iniciarSesion = async (datosUsuario: Usuario) => {
    await sessionService.guardarSesion(datosUsuario);
    setUsuario(datosUsuario);
  };

  const cerrarSesion = async () => {
    await sessionService.cerrarSesion();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargandoSesion, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para usar el contexto de autenticación en cualquier pantalla.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}