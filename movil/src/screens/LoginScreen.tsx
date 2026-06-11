import React, { useEffect, useState } from 'react';
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
import OtpModal from '../components/OtpModal';
import { Usuario } from '../types/usuario';
import BotonTema from '../components/BotonTema';

export default function LoginScreen({ navigation, route }: any) {
  const { iniciarSesion } = useAuth();
  const { colores, esOscuro } = useTheme();
  const [correo, setCorreo] = useState('');
  const [contra, setContra] = useState('');
  const [errores, setErrores] = useState<{ correo?: string; contra?: string }>({});
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [correoParaOtp, setCorreoParaOtp] = useState('');

  useEffect(() => {
    const correoInicial = route?.params?.correo;
    if (typeof correoInicial === 'string' && correoInicial.trim()) {
      setCorreo(correoInicial.trim());
    }
  }, [route?.params?.correo]);

  const validar = (): boolean => {
    const e: { correo?: string; contra?: string } = {};
    if (!correo.trim()) e.correo = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
      e.correo = 'Formato de correo inválido';
    if (!contra) e.contra = 'La contraseña es obligatoria';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const [modoOtp, setModoOtp] = useState<'login' | 'registro'>('login');

  const handleLogin = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      const respuesta = await authService.loginPaso1({ correo, contra });
      setCorreoParaOtp(respuesta.correo);
      setModoOtp('login');
      setModalVisible(true);
    } catch (error: any) {
      // Si el correo no está verificado, el backend reenvía OTP de registro
      const mensaje = error.message || '';
      if (mensaje.toLowerCase().includes('verificar tu correo')) {
        Alert.alert(
          'Cuenta no verificada',
          'Te enviamos un código a tu correo para activar tu cuenta.',
          [
            {
              text: 'Verificar ahora',
              onPress: () => {
                setCorreoParaOtp(correo);
                setModoOtp('registro');
                setModalVisible(true);
              },
            },
            { text: 'Cancelar', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('Error', mensaje);
      }
    } finally {
      setCargando(false);
    }
  };

  const handleOtpExito = async (token: string, usuarioData: Usuario) => {
    setModalVisible(false);
    await iniciarSesion(usuarioData, token);
  };

  const verdeSena = '#39A900';
  const grisOscuro = '#232323';
  const tituloColor = esOscuro ? colores.textoPrimario : grisOscuro;
  const subtituloColor = esOscuro ? colores.textoSecundario : 'rgba(35,35,35,0.74)';
  const linkColor = esOscuro ? colores.verde : verdeSena;

  return (
    <>
      <View style={[styles.container, { backgroundColor: esOscuro ? colores.fondo : '#F4F6F4' }]}>
        {esOscuro && (
          <>
            <View style={styles.auroraTop} />
            <View style={styles.auroraBottom} />
          </>
        )}
        <BotonTema />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <FadeInView style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                {esOscuro && (
                  <>
                    <View style={styles.anilloExterno} />
                    <View style={styles.anilloInterno} />
                  </>
                )}
                <View style={[styles.logoBox, esOscuro && styles.logoBoxGlow]}>
                  <AnimatedLogo size={90} />
                </View>
              </View>
            </FadeInView>

            <FadeInView delay={200}>
              <Text style={[styles.titulo, { color: tituloColor }]}>
                Bienvenido
              </Text>
              <Text
                style={[styles.subtitulo, { color: subtituloColor }]}
              >
                Inicia sesión para acceder al parqueadero
              </Text>

              <View style={styles.formContainer}>
                <View
                  style={[
                    styles.formCard,
                    {
                      backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                      borderColor: esOscuro ? colores.glassBorde : 'rgba(35,35,35,0.08)',
                      shadowColor: esOscuro ? '#000000' : 'rgba(15, 23, 42, 0.16)',
                    },
                  ]}
                >
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

                <TouchableOpacity
                  style={styles.linkOlvido}
                  onPress={() => navigation.navigate('RecuperarContrasena')}
                >
                  <Text
                    style={[styles.linkOlvidoTexto, { color: linkColor }]}
                  >
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>

                <View style={styles.filaInferior}>
                  <Text
                    style={[styles.textoNormal, { color: colores.textoTenue }]}
                  >
                    ¿No tienes cuenta?
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={[styles.enlace, { color: linkColor }]}>
                      Regístrate
                    </Text>
                  </TouchableOpacity>
                </View>
                </View>
              </View>
            </FadeInView>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <OtpModal
        visible={modalVisible}
        correo={correoParaOtp}
        modo={modoOtp}
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: espacios.grande,
    paddingTop: espacios.enorme * 2,
    paddingBottom: espacios.grande,
  },

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacios.medio,
  },
  logoWrapper: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  anilloExterno: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(95,217,36,0.25)',
    borderStyle: 'dashed',
    top: 0,
    left: 0,
  },
  anilloInterno: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 87.5,
    borderWidth: 1,
    borderColor: 'rgba(95,217,36,0.35)',
    top: 22.5,
    left: 22.5,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  logoBoxGlow: {
    backgroundColor: 'rgba(57,169,0,0.20)',
    shadowColor: '#5fd924',
    shadowOpacity: 0.7,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
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
  formCard: {
    borderRadius: 24,
    padding: espacios.grande,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  filaInferior: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: espacios.medio,
  },
  textoNormal: { fontSize: fonts.normal },
  enlace: { fontSize: fonts.normal, fontWeight: '700' },

  linkOlvido: {
    alignItems: 'center',
    marginTop: espacios.normal,
    marginBottom: espacios.pequeno,
    padding: 4,
  },
  linkOlvidoTexto: {
    fontSize: fonts.normal,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
