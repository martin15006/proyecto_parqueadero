import React, { useState } from 'react';
import {
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { loginStyles } from '../styles/loginStyles';
import { authService } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import AnimatedLogo from '../components/AnimatedLogo';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedInput from '../components/AnimatedInput';
import FadeInView from '../components/FadeInView';
import Footer from '../components/Footer';
import OtpModal from '../components/OtpModal';
import { Usuario } from '../types/usuario';

export default function LoginScreen({ navigation }: any) {
  const { iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contra, setContra] = useState('');
  const [errores, setErrores] = useState<{ correo?: string; contra?: string }>({});
  const [cargando, setCargando] = useState(false);

  // Estado del modal OTP
  const [modalVisible, setModalVisible] = useState(false);
  const [correoParaOtp, setCorreoParaOtp] = useState('');

  const validar = (): boolean => {
    const nuevosErrores: { correo?: string; contra?: string } = {};
    if (!correo.trim()) nuevosErrores.correo = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
      nuevosErrores.correo = 'Formato de correo inválido';
    if (!contra) nuevosErrores.contra = 'La contraseña es obligatoria';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleLogin = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      // PASO 1: enviar credenciales → backend envía OTP al correo
      const respuesta = await authService.loginPaso1({ correo, contra });
      setCorreoParaOtp(respuesta.correo);
      setModalVisible(true); // Abrir el modal OTP
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleOtpExito = async (token: string, usuarioData: Usuario) => {
    // PASO 2 exitoso: ya tenemos el JWT y los datos del usuario
    setModalVisible(false);
    await iniciarSesion(usuarioData, token);
    // El AppNavigator detecta automáticamente que hay sesión y cambia a Home
  };

  const handleOtpCerrar = () => {
    setModalVisible(false);
    // Limpiar la contraseña por seguridad al cancelar
    setContra('');
  };

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={loginStyles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={loginStyles.container}>
            <FadeInView style={loginStyles.logoContainer}>
              <AnimatedLogo size={130} />
            </FadeInView>

            <FadeInView delay={200}>
              <Text style={loginStyles.titulo}>Iniciar Sesión</Text>

              <AnimatedInput
                label="Correo o N° Identificación"
                placeholder="example@email.com"
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
                placeholder="••••••••••"
                secureTextEntry
                value={contra}
                error={errores.contra}
                onChangeText={(v) => {
                  setContra(v);
                  if (errores.contra) setErrores({ ...errores, contra: undefined });
                }}
              />

              <View style={{ marginTop: 10 }}>
                <AnimatedButton
                  texto="Iniciar"
                  onPress={handleLogin}
                  cargando={cargando}
                  mensajeCargando="Enviando código..."
                />
              </View>

              <View style={loginStyles.filaInferior}>
                <Text style={loginStyles.link}>¿Olvidó su Contraseña?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={loginStyles.enlace}>Registrarse</Text>
                </TouchableOpacity>
              </View>
            </FadeInView>
          </View>
        </ScrollView>
        <Footer />
      </KeyboardAvoidingView>

      {/* Modal OTP que se abre tras el paso 1 */}
      <OtpModal
        visible={modalVisible}
        correo={correoParaOtp}
        onCerrar={handleOtpCerrar}
        onExito={handleOtpExito}
      />
    </>
  );
}