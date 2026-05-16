import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ColorScheme } from '../theme/senaTheme';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  modo: ThemeMode;
  colores: ColorScheme;
  esOscuro: boolean;
  cargandoTema: boolean;
  cambiarTema: (nuevoModo: ThemeMode) => Promise<void>;
  alternarTema: () => Promise<void>;
}

const TEMA_KEY = '@parqueadero_sena:tema';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Detectar el modo del sistema operativo (como fallback inicial)
  const temaSistema = useColorScheme(); // 'light' | 'dark' | null

  // Inicializar con el tema del sistema (evita parpadeo al inicio)
  const [modo, setModo] = useState<ThemeMode>(temaSistema === 'dark' ? 'dark' : 'light');
  const [cargandoTema, setCargandoTema] = useState(true);

  // Al iniciar, cargar el tema guardado (si existe)
  useEffect(() => {
    (async () => {
      try {
        const guardado = await AsyncStorage.getItem(TEMA_KEY);
        if (guardado === 'dark' || guardado === 'light') {
          // Si el usuario eligió un tema, usar ese
          setModo(guardado);
        }
        // Si no hay guardado, mantener el del sistema que ya inicializamos
      } catch (error) {
        console.warn('Error al cargar tema:', error);
      } finally {
        setCargandoTema(false);
      }
    })();
  }, []);

  const cambiarTema = async (nuevoModo: ThemeMode) => {
    setModo(nuevoModo);
    try {
      await AsyncStorage.setItem(TEMA_KEY, nuevoModo);
    } catch (error) {
      console.warn('Error al guardar tema:', error);
    }
  };

  const alternarTema = async () => {
    await cambiarTema(modo === 'light' ? 'dark' : 'light');
  };

  const colores = modo === 'dark' ? darkColors : lightColors;
  const esOscuro = modo === 'dark';

  return (
    <ThemeContext.Provider
      value={{ modo, colores, esOscuro, cargandoTema, cambiarTema, alternarTema }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return context;
}