import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Usuario } from '../types/usuario';
import { sessionService } from '../services/sessionService';
import { authService } from '../services/authService';

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

  // Al iniciar la app, intentar recuperar la sesión guardada
  // Y verificar con el backend que el JWT siga válido.
  useEffect(() => {
    (async () => {
      try {
        const token = await sessionService.obtenerToken();
        const usuarioGuardado = await sessionService.obtenerUsuario();

        if (!token || !usuarioGuardado) {
          setCargandoSesion(false);
          return;
        }

        // Verificar con el backend que el JWT siga siendo válido
        try {
          const usuarioActualizado = await authService.verificarSesion();
          setUsuario(usuarioActualizado);
          // Actualizar datos locales por si cambiaron en el backend
          await sessionService.guardarSesion(usuarioActualizado, token);
        } catch (error: any) {
          // Token inválido o expirado → cerrar sesión silenciosamente
          if (error.statusCode === 401) {
            await sessionService.cerrarSesion();
            setUsuario(null);
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
  };

  const cerrarSesion = async () => {
    await sessionService.cerrarSesion();
    setUsuario(null);
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