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
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios, animaciones } from '../theme/senaTheme';
import { authService } from '../services/authService';

interface Props {
  visible: boolean;
  correo: string;
  onCerrar: () => void;
  onExito: (token: string, usuario: any) => void;
}

const TIEMPO_REENVIO = 60;

export default function OtpModal({ visible, correo, onCerrar, onExito }: Props) {
  const { colores, esOscuro } = useTheme();
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [reenviando, setReenviando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(TIEMPO_REENVIO);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      setCodigo('');
      setError(false);
      setMensajeError('');
      setSegundosRestantes(TIEMPO_REENVIO);

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

  useEffect(() => {
    if (!visible || segundosRestantes === 0) return;
    const timer = setTimeout(() => setSegundosRestantes((prev) => prev - 1), 1000);
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
      Alert.alert('Código enviado', 'Revisa tu correo para el nuevo código.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setReenviando(false);
    }
  };

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
              {
                backgroundColor: esOscuro ? '#001f12' : colores.superficie,
                borderColor: esOscuro ? 'rgba(95,217,36,0.30)' : 'transparent',
                borderWidth: esOscuro ? 1 : 0,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Decoraciones glass */}
            <View
              style={[
                styles.decoTop,
                {
                  backgroundColor: esOscuro
                    ? 'rgba(95,217,36,0.15)'
                    : colores.verdeMuyClaro,
                },
              ]}
            />
            <View
              style={[
                styles.decoTopChica,
                {
                  backgroundColor: esOscuro
                    ? 'rgba(0,120,50,0.25)'
                    : 'rgba(57,169,0,0.15)',
                },
              ]}
            />

            <View
              style={[
                styles.iconoCircular,
                {
                  backgroundColor: colores.verde,
                  shadowColor: colores.verde,
                  shadowOpacity: esOscuro ? 0.6 : 0.4,
                },
              ]}
            >
              <Text style={styles.iconoEmoji}>📧</Text>
            </View>

            <Text style={[styles.titulo, { color: colores.textoPrimario }]}>
              Verificación
            </Text>
            <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
              Te enviamos un código de 6 dígitos a
            </Text>
            <Text style={[styles.correo, { color: colores.verde }]}>{correoCensurado}</Text>

            <OtpInput
              onCompleto={handleVerificar}
              error={error}
              deshabilitado={cargando}
            />

            {error && mensajeError !== '' && (
              <Text style={[styles.textoError, { color: colores.error }]}>
                {mensajeError}
              </Text>
            )}

            {cargando && (
              <View style={styles.cargandoContainer}>
                <ActivityIndicator color={colores.verde} />
                <Text style={[styles.cargandoTexto, { color: colores.textoSecundario }]}>
                  Verificando código...
                </Text>
              </View>
            )}

            <View style={styles.reenviarContainer}>
              <Text style={[styles.reenviarTexto, { color: colores.textoSecundario }]}>
                ¿No te llegó el código?
              </Text>
              {segundosRestantes > 0 ? (
                <Text style={[styles.contador, { color: colores.textoTenue }]}>
                  Reenviar en {segundosRestantes}s
                </Text>
              ) : (
                <TouchableOpacity onPress={handleReenviar} disabled={reenviando}>
                  <Text style={[styles.linkReenviar, { color: colores.verde }]}>
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
              <Text style={[styles.botonCancelarTexto, { color: colores.textoTenue }]}>
                Cancelar
              </Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: espacios.normal,
  },
  overlayTouch: { ...StyleSheet.absoluteFillObject },
  modalContent: {
    borderRadius: 24,
    paddingHorizontal: espacios.grande,
    paddingTop: espacios.grande * 1.5,
    paddingBottom: espacios.grande,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 15,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  decoTop: {
    position: 'absolute',
    top: -60,
    left: -60,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.6,
  },
  decoTopChica: {
    position: 'absolute',
    top: -20,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  iconoCircular: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacios.normal,
    elevation: 5,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  iconoEmoji: { fontSize: 32 },
  titulo: {
    fontSize: fonts.titulo,
    fontWeight: '800',
    marginBottom: espacios.pequeno,
    letterSpacing: -0.3,
  },
  subtitulo: { fontSize: fonts.normal, textAlign: 'center' },
  correo: {
    fontSize: fonts.medio,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: espacios.normal,
  },
  textoError: {
    fontSize: fonts.normal,
    textAlign: 'center',
    marginTop: -8,
    marginBottom: espacios.pequeno,
  },
  cargandoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: espacios.pequeno,
  },
  cargandoTexto: { marginLeft: 8, fontSize: fonts.normal },
  reenviarContainer: { alignItems: 'center', marginTop: espacios.normal },
  reenviarTexto: { fontSize: fonts.normal },
  contador: { marginTop: 4, fontSize: fonts.normal, fontWeight: '700' },
  linkReenviar: {
    marginTop: 4,
    fontSize: fonts.normal,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  botonCancelar: { marginTop: espacios.normal, paddingVertical: espacios.pequeno },
  botonCancelarTexto: { fontSize: fonts.normal },
});