import AsyncStorage from '@react-native-async-storage/async-storage';
import { Usuario } from '../types/usuario';

const USUARIO_KEY = '@parqueadero_sena:usuario';
const TOKEN_KEY = '@parqueadero_sena:token';

export const sessionService = {
  /**
   * Guarda el token JWT y los datos del usuario en el almacenamiento local.
   */
  async guardarSesion(usuario: Usuario, token: string): Promise<void> {
    await AsyncStorage.multiSet([
      [USUARIO_KEY, JSON.stringify(usuario)],
      [TOKEN_KEY, token],
    ]);
  },

  /**
   * Obtiene los datos del usuario guardados, o null si no hay sesión.
   */
  async obtenerUsuario(): Promise<Usuario | null> {
    const data = await AsyncStorage.getItem(USUARIO_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as Usuario;
    } catch {
      return null;
    }
  },

  /**
   * Obtiene el token JWT guardado, o null si no hay sesión.
   */
  async obtenerToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  /**
   * Borra completamente la sesión actual (logout).
   */
  async cerrarSesion(): Promise<void> {
    await AsyncStorage.multiRemove([USUARIO_KEY, TOKEN_KEY]);
  },
};