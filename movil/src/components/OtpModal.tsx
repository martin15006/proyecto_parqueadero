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
  Image,
} from 'react-native';
import OtpInput from './OtpInput';
import AnimatedButton from './AnimatedButton';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios, animaciones } from '../theme/senaTheme';
import { authService } from '../services/authService';

// Logo SENA importado correctamente como recurso
const logoSena = require('../../assets/logoSena.png');

interface Props {
  visible: boolean;
  correo: string;
  onCerrar: () => void;
  onExito: (token: string, usuario: any) => void;
  /** 'login' (por defecto) o 'registro' — cambia el endpoint y el título */
  modo?: 'login' | 'registro';
}

const TIEMPO_REENVIO = 60;

export default function OtpModal({ visible, correo, onCerrar, onExito, modo = 'login' }: Props) {
  const { colores, esOscuro } = useTheme();
  const [, setCodigo] = useState('');
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
      const fn = modo === 'registro' ? authService.verificarRegistro : authService.verificarOtp;
      const respuesta = await fn({ correo, codigo: codigoCompleto });
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

  const tituloColor = esOscuro ? colores.textoPrimario : '#232323';
  const subtituloColor = esOscuro ? colores.textoSecundario : 'rgba(35,35,35,0.74)';

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
                borderColor: esOscuro ? 'rgba(95,217,36,0.30)' : 'rgba(35,35,35,0.08)',
                borderWidth: 1,
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

            {/* ─── LOGO SENA con círculo blanco y borde verde ─── */}
            <View
              style={[
                styles.iconoCircular,
                {
                  backgroundColor: '#ffffff',
                  shadowColor: colores.verde,
                  shadowOpacity: esOscuro ? 0.6 : 0.4,
                  borderColor: colores.verde,
                },
              ]}
            >
              <Image
                source={logoSena}
                style={styles.iconoImagen}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.titulo, { color: tituloColor }]}>
              {modo === 'registro' ? 'Verifica tu correo' : 'Verificación'}
            </Text>
            <Text style={[styles.subtitulo, { color: subtituloColor }]}>
              {modo === 'registro'
                ? 'Para activar tu cuenta, ingresa el código que enviamos a'
                : 'Te enviamos un código de 6 dígitos a'}
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
                <Text
                  style={[
                    styles.contador,
                    {
                      color: esOscuro ? colores.textoTenue : 'rgba(35,35,35,0.55)',
                    },
                  ]}
                >
                  Reenviar en {segundosRestantes}s
                </Text>
              ) : (
                <View style={styles.acciones}>
                  <AnimatedButton
                    texto="Reenviar código"
                    onPress={handleReenviar}
                    cargando={reenviando}
                    mensajeCargando="Enviando..."
                    deshabilitado={cargando}
                  />
                </View>
              )}
            </View>

            <View style={styles.cancelar}>
              <AnimatedButton
                texto="Cancelar"
                onPress={onCerrar}
                variante="secundario"
                deshabilitado={cargando || reenviando}
              />
            </View>
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
  // ─── ICONO ACTUALIZADO PARA EL LOGO SENA ───
  iconoCircular: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: espacios.normal,
    elevation: 5,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    borderWidth: 2.5,
    padding: 8,
  },
  iconoImagen: {
    width: '100%',
    height: '100%',
  },
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
  contador: {
    marginTop: 6,
    fontSize: fonts.medio,
    fontWeight: '800',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  acciones: { marginTop: espacios.pequeno },
  cancelar: { marginTop: espacios.normal },
});
