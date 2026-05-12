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
import { usuarioService } from '../services/usuarioService';
import { useAuth } from '../context/AuthContext';
import AnimatedLogo from '../components/AnimatedLogo';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedInput from '../components/AnimatedInput';
import FadeInView from '../components/FadeInView';
import Footer from '../components/Footer';

export default function LoginScreen({ navigation }: any) {
  const { iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contra, setContra] = useState('');
  const [errores, setErrores] = useState<{ correo?: string; contra?: string }>({});
  const [cargando, setCargando] = useState(false);

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
      const usuario = await usuarioService.login({ correo, contra });
      await iniciarSesion(usuario);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
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
              <AnimatedButton texto="Iniciar" onPress={handleLogin} cargando={cargando} />
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
  );
}