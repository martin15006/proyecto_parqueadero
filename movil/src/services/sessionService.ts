import * as SecureStore from 'expo-secure-store';
import { Usuario } from '../types/usuario';

const USUARIO_KEY = 'parqueadero_sena.usuario';
const TOKEN_KEY = 'parqueadero_sena.token';

export const sessionService = {
  async guardarSesion(usuario: Usuario, token: string): Promise<void> {
    // RNF2 (Privacidad): AsyncStorage no garantiza cifrado hardware-backed; un atacante con acceso
    // al filesystem del dispositivo podría extraer el token en texto plano.
    // Mitigación: SecureStore cifra y almacena en Keystore/Keychain, reduciendo riesgo ante compromisos físicos.
    await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario));
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async obtenerUsuario(): Promise<Usuario | null> {
    const data = await SecureStore.getItemAsync(USUARIO_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as Usuario;
    } catch {
      return null;
    }
  },

  async obtenerToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  },

  /**
   * Borra completamente la sesión actual (logout).
   * Esta función la llaman tanto el logout manual como el automático
   * cuando se detecta sesión inválida.
   */
  async cerrarSesion(): Promise<void> {
    await SecureStore.deleteItemAsync(USUARIO_KEY);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  /**
   * Alias de `cerrarSesion` (lo usa el api.ts para mantener consistencia).
   */
  async eliminarSesion(): Promise<void> {
    await SecureStore.deleteItemAsync(USUARIO_KEY);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
