import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import SuccessCheck from '../components/SuccessCheck';
import { usuarioService } from '../services/usuarioService';
import MedidorContrasena from '../components/MedidorContrasena';
import { validarContrasenaSegura } from '../utils/validacionContrasena';

// Logo SENA importado correctamente como recurso
const logoSena = require('../../assets/logoSena.png');

export default function CambiarContrasenaScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const [contraActual, setContraActual] = useState('');
  const [contraNueva, setContraNueva] = useState('');
  const [confirmarContra, setConfirmarContra] = useState('');
  const [errores, setErrores] = useState<any>({});
  const [cargando, setCargando] = useState(false);
  const [exitoVisible, setExitoVisible] = useState(false);

  const validar = (): boolean => {
    const e: any = {};
    if (!contraActual) e.contraActual = 'Obligatoria';
    const errorContra = validarContrasenaSegura(contraNueva);
    if (errorContra) e.contraNueva = errorContra;
    if (contraNueva !== confirmarContra) e.confirmarContra = 'No coinciden';
    if (contraActual && contraActual === contraNueva)
      e.contraNueva = 'Debe ser diferente a la actual';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleCambiar = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      await usuarioService.cambiarContrasena(contraActual, contraNueva);

      // Limpiar los campos después del cambio exitoso
      setContraActual('');
      setContraNueva('');
      setConfirmarContra('');
      setErrores({});

      setExitoVisible(true);
      setTimeout(() => {
        setExitoVisible(false);
        navigation.navigate('Home');
      }, 1800);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  // Limpiar campos al salir de la pantalla (seguridad)
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setContraActual('');
        setContraNueva('');
        setConfirmarContra('');
        setErrores({});
      };
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader
        titulo="Cambiar Contraseña"
        mostrarVolver
        onBackPress={() => navigation.goBack()}
      />

      {esOscuro && <View style={styles.auroraTop} />}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
      >
        <FadeInView>
          <View style={styles.iconoContainer}>
            <View
              style={[
                styles.iconoCirculo,
                {
                  backgroundColor: '#ffffff',
                  shadowColor: colores.verde,
                  shadowOpacity: esOscuro ? 0.6 : 0.3,
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
          </View>

          <Text style={[styles.titulo, { color: colores.textoPrimario }]}>
            Actualiza tu contraseña
          </Text>
          <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
            Ingresa tu contraseña actual y la nueva
          </Text>

          <AnimatedInput
            label="Contraseña Actual"
            placeholder="Tu contraseña actual"
            secureTextEntry
            value={contraActual}
            error={errores.contraActual}
            onChangeText={(v) => {
              setContraActual(v);
              if (errores.contraActual)
                setErrores({ ...errores, contraActual: undefined });
            }}
          />

          <AnimatedInput
            label="Nueva Contraseña"
            placeholder="Crea una contraseña segura"
            secureTextEntry
            value={contraNueva}
            error={errores.contraNueva}
            onChangeText={(v) => {
              setContraNueva(v);
              if (errores.contraNueva)
                setErrores({ ...errores, contraNueva: undefined });
            }}
          />

          {/* Medidor visual de fortaleza */}
          <MedidorContrasena contrasena={contraNueva} />

          <AnimatedInput
            label="Confirmar Nueva Contraseña"
            placeholder="Repite la nueva contraseña"
            secureTextEntry
            value={confirmarContra}
            error={errores.confirmarContra}
            onChangeText={(v) => {
              setConfirmarContra(v);
              if (errores.confirmarContra)
                setErrores({ ...errores, confirmarContra: undefined });
            }}
          />

          <View style={{ marginTop: espacios.medio }}>
            <AnimatedButton
              texto="Cambiar Contraseña"
              onPress={handleCambiar}
              cargando={cargando}
              mensajeCargando="Actualizando..."
            />
          </View>
        </FadeInView>
      </KeyboardAwareScrollView>

      <SuccessCheck visible={exitoVisible} mensaje="¡Contraseña actualizada!" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  auroraTop: {
    position: 'absolute',
    top: 100,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(57,169,0,0.15)',
  },
  scroll: {
    padding: espacios.grande,
    paddingBottom: espacios.grande * 2,
    flexGrow: 1,
  },
  iconoContainer: { alignItems: 'center', marginBottom: espacios.medio },
  iconoCirculo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    borderWidth: 2.5,
    padding: 8,
  },
  iconoImagen: {
    width: '100%',
    height: '100%',
  },
  titulo: {
    fontSize: fonts.grande,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: espacios.pequeno,
  },
  subtitulo: {
    fontSize: fonts.normal,
    textAlign: 'center',
    marginBottom: espacios.grande,
  },
});