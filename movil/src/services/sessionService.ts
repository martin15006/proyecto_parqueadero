import AsyncStorage from '@react-native-async-storage/async-storage';
import { Usuario } from '../types/usuario';

const SESSION_KEY = '@parqueadero_sena:usuario';

export const sessionService = {
  /**
   * Guarda los datos del usuario logueado en el almacenamiento local.
   */
  async guardarSesion(usuario: Usuario): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(usuario));
  },

  /**
   * Obtiene los datos del usuario guardados, o null si no hay sesión.
   */
  async obtenerSesion(): Promise<Usuario | null> {
    const data = await AsyncStorage.getItem(SESSION_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as Usuario;
    } catch {
      return null;
    }
  },

  /**
   * Borra la sesión actual (logout).
   */
  async cerrarSesion(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  },
};