import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario } from '../types/usuario';
import { sessionService } from '../services/sessionService';
import { authService } from '../services/authService';
import { configurarManejoSesionInvalida, setInMemoryAuthToken } from '../services/api';

interface AuthContextType {
  usuario: Usuario | null;
  cargandoSesion: boolean;
  iniciarSesion: (usuario: Usuario, token: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    configurarManejoSesionInvalida(() => {
      setUsuario(null);
      setInMemoryAuthToken(null);
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await sessionService.obtenerToken();
        const usuarioGuardado = await sessionService.obtenerUsuario();

        if (!token || !usuarioGuardado) {
          setCargandoSesion(false);
          return;
        }

        setInMemoryAuthToken(token);

        try {
          const usuarioActualizado = await authService.verificarSesion();
          setUsuario(usuarioActualizado);
          await sessionService.guardarSesion(usuarioActualizado, token);
        } catch (error: any) {
          if (error.statusCode === 401) {
            await sessionService.cerrarSesion();
            setUsuario(null);
            setInMemoryAuthToken(null);
          } else {
            // Si es error de red, dejamos al usuario logueado con datos en cache
            setUsuario(usuarioGuardado);
          }
        }
      } catch (error) {
        console.error('Error al recuperar sesión:', error);
      } finally {
        setCargandoSesion(false);
      }
    })();
  }, []);

  const iniciarSesion = async (datosUsuario: Usuario, token: string) => {
    await sessionService.guardarSesion(datosUsuario, token);
    setUsuario(datosUsuario);
    setInMemoryAuthToken(token);
  };

  const cerrarSesion = async () => {
    await sessionService.cerrarSesion();
    setUsuario(null);
    setInMemoryAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ usuario, cargandoSesion, iniciarSesion, cerrarSesion }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
