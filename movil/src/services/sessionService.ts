import * as SecureStore from 'expo-secure-store';
import { Usuario } from '../types/usuario';

const USUARIO_KEY = 'parqueadero_sena.usuario';
const TOKEN_KEY = 'parqueadero_sena.token';

export const sessionService = {
  /**
   * Guarda el token JWT y los datos del usuario en el almacenamiento local.
   */
  async guardarSesion(usuario: Usuario, token: string): Promise<void> {
    // RNF2 (Privacidad): AsyncStorage no garantiza cifrado hardware-backed; un atacante con acceso
    // al filesystem del dispositivo podría extraer el token en texto plano.
    // Mitigación: SecureStore cifra y almacena en Keystore/Keychain, reduciendo riesgo ante compromisos físicos.
    await SecureStore.setItemAsync(USUARIO_KEY, JSON.stringify(usuario)); // RNF2: el perfil viaja cifrado (PII protegida).
    await SecureStore.setItemAsync(TOKEN_KEY, token); // RNF2: el JWT queda cifrado en almacenamiento seguro.
  },

  /**
   * Obtiene los datos del usuario guardados, o null si no hay sesión.
   */
  async obtenerUsuario(): Promise<Usuario | null> {
    // RNF2 (Privacidad): lectura desde SecureStore para evitar exponer PII en almacenamiento no cifrado.
    const data = await SecureStore.getItemAsync(USUARIO_KEY); // RNF2: extracción desde Keychain/Keystore.
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
    // RNF2 (Privacidad): lectura del token desde almacenamiento seguro (cifrado).
    return await SecureStore.getItemAsync(TOKEN_KEY); // RNF2: evita exposición del JWT en texto plano.
  },

  /**
   * Borra completamente la sesión actual (logout).
   * Esta función la llaman tanto el logout manual como el automático
   * cuando se detecta sesión inválida.
   */
  async cerrarSesion(): Promise<void> {
    // RNF2 (Privacidad): borrado seguro desde SecureStore para eliminar credenciales cifradas del dispositivo.
    await SecureStore.deleteItemAsync(USUARIO_KEY); // RNF2: elimina perfil almacenado.
    await SecureStore.deleteItemAsync(TOKEN_KEY); // RNF2: elimina JWT almacenado.
  },

  /**
   * Alias de `cerrarSesion` (lo usa el api.ts para mantener consistencia).
   */
  async eliminarSesion(): Promise<void> {
    // RNF2 (Privacidad): alias consistente; mantiene la misma mitigación (borrado en SecureStore).
    await SecureStore.deleteItemAsync(USUARIO_KEY); // RNF2: elimina perfil almacenado.
    await SecureStore.deleteItemAsync(TOKEN_KEY); // RNF2: elimina JWT almacenado.
  },
};
