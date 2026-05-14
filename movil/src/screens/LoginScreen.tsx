import React, { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import AnimatedLogo from '../components/AnimatedLogo';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedInput from '../components/AnimatedInput';
import FadeInView from '../components/FadeInView';
import Footer from '../components/Footer';
import OtpModal from '../components/OtpModal';
import { Usuario } from '../types/usuario';

export default function LoginScreen({ navigation }: any) {
  const { iniciarSesion } = useAuth();
  const { colores, esOscuro } = useTheme();
  const [correo, setCorreo] = useState('');
  const [contra, setContra] = useState('');
  const [errores, setErrores] = useState<{ correo?: string; contra?: string }>({});
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [correoParaOtp, setCorreoParaOtp] = useState('');

  const validar = (): boolean => {
    const e: { correo?: string; contra?: string } = {};
    if (!correo.trim()) e.correo = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
      e.correo = 'Formato de correo inválido';
    if (!contra) e.contra = 'La contraseña es obligatoria';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      const respuesta = await authService.loginPaso1({ correo, contra });
      setCorreoParaOtp(respuesta.correo);
      setModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleOtpExito = async (token: string, usuarioData: Usuario) => {
    setModalVisible(false);
    await iniciarSesion(usuarioData, token);
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        {/* AURORA DE FONDO solo en modo oscuro */}
        {esOscuro && (
          <>
            <View style={styles.auroraTop} />
            <View style={styles.auroraBottom} />
            <View style={styles.patronPuntos} />
          </>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <FadeInView style={styles.logoContainer}>
              {/* Círculos decorativos detrás del logo */}
              {esOscuro && (
                <>
                  <View style={styles.anilloExterno} />
                  <View style={styles.anilloInterno} />
                </>
              )}
              <View style={[styles.logoBox, esOscuro && styles.logoBoxGlow]}>
                <AnimatedLogo size={100} />
              </View>
            </FadeInView>

            <FadeInView delay={200}>
              <View style={styles.badgeContainer}>
                <View style={[styles.badge, esOscuro && styles.badgeGlass]}>
                  <View style={styles.badgeDot} />
                  <Text style={[styles.badgeText, { color: esOscuro ? '#b0f08a' : colores.verdeOscuro }]}>
                    Sistema Activo
                  </Text>
                </View>
              </View>

              <Text style={[styles.titulo, { color: colores.textoPrimario }]}>
                Bienvenido
              </Text>
              <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
                Inicia sesión para acceder al parqueadero
              </Text>

              <View style={styles.formContainer}>
                <AnimatedInput
                  label="Correo electrónico"
                  placeholder="ejemplo@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={correo}
                  error={errores.correo}
                  onChangeText={(v) => {
                    setCorreo(v);
                    if (errores.correo) setErrores({ ...errores, correo: undefined });
                  }}
                />

                <AnimatedInput
                  label="Contraseña"
                  placeholder="••••••••"
                  secureTextEntry
                  value={contra}
                  error={errores.contra}
                  onChangeText={(v) => {
                    setContra(v);
                    if (errores.contra) setErrores({ ...errores, contra: undefined });
                  }}
                />

                <View style={{ marginTop: espacios.medio }}>
                  <AnimatedButton
                    texto="Iniciar Sesión"
                    onPress={handleLogin}
                    cargando={cargando}
                    mensajeCargando="Enviando código..."
                  />
                </View>

                <View style={styles.filaInferior}>
                  <Text style={[styles.textoNormal, { color: colores.textoTenue }]}>
                    ¿No tienes cuenta?
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={[styles.enlace, { color: colores.verde }]}>Regístrate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </FadeInView>
          </ScrollView>
          <Footer />
        </KeyboardAvoidingView>
      </View>

      <OtpModal
        visible={modalVisible}
        correo={correoParaOtp}
        onCerrar={() => {
          setModalVisible(false);
          setContra('');
        }}
        onExito={handleOtpExito}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  auroraTop: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(57,169,0,0.25)',
    opacity: 0.6,
  },
  auroraBottom: {
    position: 'absolute',
    bottom: -120,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0,120,50,0.20)',
    opacity: 0.5,
  },
  patronPuntos: {
    position: 'absolute',
    inset: 0,
    opacity: 0.3,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: espacios.grande,
    paddingTop: espacios.enorme * 2,
    paddingBottom: espacios.grande,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: espacios.grande,
    position: 'relative',
  },
  anilloExterno: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(95,217,36,0.20)',
    borderStyle: 'dashed',
  },
  anilloInterno: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(95,217,36,0.30)',
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBoxGlow: {
    backgroundColor: 'rgba(57,169,0,0.15)',
    shadowColor: '#5fd924',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  badgeContainer: { alignItems: 'center', marginBottom: espacios.medio },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(57,169,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(57,169,0,0.30)',
  },
  badgeGlass: {
    backgroundColor: 'rgba(57,169,0,0.20)',
  },
  badgeDot: {
    width: 7,
    height: 7,
    backgroundColor: '#5fd924',
    borderRadius: 3.5,
    marginRight: 6,
    shadowColor: '#5fd924',
    shadowOpacity: 1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeText: {
    fontSize: fonts.pequeno,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titulo: {
    fontSize: fonts.enorme,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: fonts.medio,
    textAlign: 'center',
    marginBottom: espacios.grande,
  },
  formContainer: { marginTop: espacios.pequeno },
  filaInferior: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: espacios.medio,
  },
  textoNormal: { fontSize: fonts.normal },
  enlace: { fontSize: fonts.normal, fontWeight: '700' },
});