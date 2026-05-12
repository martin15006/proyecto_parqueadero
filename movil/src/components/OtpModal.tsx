import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import OtpInput from './OtpInput';
import AnimatedButton from './AnimatedButton';
import { colors, fonts, espacios, animaciones } from '../theme/senaTheme';
import { authService } from '../services/authService';

interface Props {
  visible: boolean;
  correo: string;
  onCerrar: () => void;
  onExito: (token: string, usuario: any) => void;
}

const TIEMPO_REENVIO = 60; // segundos

export default function OtpModal({ visible, correo, onCerrar, onExito }: Props) {
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(TIEMPO_REENVIO);

  // Animaciones de entrada
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      // Reset estado
      setCodigo('');
      setError(false);
      setMensajeError('');
      setSegundosRestantes(TIEMPO_REENVIO);

      // Animar entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: animaciones.media,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  // Timer regresivo para reenvío
  useEffect(() => {
    if (!visible || segundosRestantes === 0) return;

    const timer = setTimeout(() => {
      setSegundosRestantes((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [visible, segundosRestantes]);

  const handleVerificar = async (codigoCompleto: string) => {
    setCargando(true);
    setError(false);
    setMensajeError('');

    try {
      const respuesta = await authService.verificarOtp({
        correo,
        codigo: codigoCompleto,
      });
      onExito(respuesta.access_token, respuesta.usuario);
    } catch (err: any) {
      setError(true);
      setMensajeError(err.message);
      setCodigo('');
    } finally {
      setCargando(false);
    }
  };

  const handleReenviar = async () => {
    setReenviando(true);
    try {
      await authService.reenviarOtp(correo);
      setSegundosRestantes(TIEMPO_REENVIO);
      setError(false);
      setMensajeError('');
      Alert.alert('Código enviado', 'Revisa tu correo para el nuevo código.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setReenviando(false);
    }
  };

  // Ocultar parte del correo: ju***@gmail.com
  const correoCensurado = (() => {
    const [usuario, dominio] = correo.split('@');
    if (!usuario || !dominio) return correo;
    const visibles = Math.min(2, usuario.length);
    return `${usuario.slice(0, visibles)}${'*'.repeat(Math.max(usuario.length - visibles, 3))}@${dominio}`;
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.overlayTouch}
            activeOpacity={1}
            onPress={onCerrar}
          />

          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Decoración: círculos verdes */}
            <View style={styles.decoracionTop} />
            <View style={styles.decoracionTopChica} />

            <View style={styles.iconoCircular}>
              <Text style={styles.iconoEmoji}>📧</Text>
            </View>

            <Text style={styles.titulo}>Verificación</Text>
            <Text style={styles.subtitulo}>
              Te enviamos un código de 6 dígitos a
            </Text>
            <Text style={styles.correo}>{correoCensurado}</Text>

            <OtpInput
              onCompleto={handleVerificar}
              error={error}
              deshabilitado={cargando}
            />

            {error && mensajeError !== '' && (
              <Text style={styles.textoError}>{mensajeError}</Text>
            )}

            {cargando && (
              <View style={styles.cargandoContainer}>
                <ActivityIndicator color={colors.verde} />
                <Text style={styles.cargandoTexto}>Verificando código...</Text>
              </View>
            )}

            <View style={styles.reenviarContainer}>
              <Text style={styles.reenviarTexto}>¿No te llegó el código?</Text>
              {segundosRestantes > 0 ? (
                <Text style={styles.contador}>
                  Reenviar en {segundosRestantes}s
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={handleReenviar}
                  disabled={reenviando}
                >
                  <Text style={styles.linkReenviar}>
                    {reenviando ? 'Enviando...' : 'Reenviar código'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={onCerrar}
              style={styles.botonCancelar}
              disabled={cargando}
            >
              <Text style={styles.botonCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacios.normal,
  },
  overlayTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: colors.blanco,
    borderRadius: 20,
    paddingHorizontal: espacios.grande,
    paddingTop: espacios.grande * 1.5,
    paddingBottom: espacios.grande,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    shadowColor: colors.negro,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    overflow: 'hidden',
  },
  decoracionTop: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.verdeMuyClaro,
    opacity: 0.6,
  },
  decoracionTopChica: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.verde,
    opacity: 0.15,
  },
  iconoCircular: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.verde,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacios.normal,
    elevation: 5,
    shadowColor: colors.verde,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  iconoEmoji: {
    fontSize: 32,
  },
  titulo: {
    fontSize: fonts.titulo - 4,
    fontWeight: 'bold',
    color: colors.negro,
    marginBottom: espacios.pequeno,
  },
  subtitulo: {
    fontSize: fonts.normal,
    color: colors.grisOscuro,
    textAlign: 'center',
  },
  correo: {
    fontSize: fonts.medio,
    fontWeight: 'bold',
    color: colors.verde,
    marginTop: 4,
    marginBottom: espacios.normal,
  },
  textoError: {
    color: colors.error,
    fontSize: fonts.normal,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: espacios.pequeno,
    paddingHorizontal: espacios.normal,
  },
  cargandoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: espacios.pequeno,
  },
  cargandoTexto: {
    marginLeft: 8,
    color: colors.grisOscuro,
    fontSize: fonts.normal,
  },
  reenviarContainer: {
    alignItems: 'center',
    marginTop: espacios.normal,
  },
  reenviarTexto: {
    fontSize: fonts.normal,
    color: colors.grisOscuro,
  },
  contador: {
    marginTop: 4,
    fontSize: fonts.normal,
    color: colors.gris,
    fontWeight: 'bold',
  },
  linkReenviar: {
    marginTop: 4,
    fontSize: fonts.normal,
    color: colors.verde,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  botonCancelar: {
    marginTop: espacios.normal,
    paddingVertical: espacios.pequeno,
  },
  botonCancelarTexto: {
    color: colors.gris,
    fontSize: fonts.normal,
  },
});