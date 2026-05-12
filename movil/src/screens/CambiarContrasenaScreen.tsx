import React, { useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { colors, fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import SuccessCheck from '../components/SuccessCheck';
import { usuarioService } from '../services/usuarioService';

export default function CambiarContrasenaScreen({ navigation }: any) {
  const [contraActual, setContraActual] = useState('');
  const [contraNueva, setContraNueva] = useState('');
  const [confirmarContra, setConfirmarContra] = useState('');
  const [errores, setErrores] = useState<any>({});
  const [cargando, setCargando] = useState(false);
  const [exitoVisible, setExitoVisible] = useState(false);

  const validar = (): boolean => {
    const e: any = {};
    if (!contraActual) e.contraActual = 'Obligatoria';
    if (!contraNueva) e.contraNueva = 'Obligatoria';
    else if (contraNueva.length < 6) e.contraNueva = 'Mínimo 6 caracteres';
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

  return (
    <View style={styles.container}>
      <SenaHeader
        titulo="Cambiar Contraseña"
        onMenuPress={() => navigation.openDrawer()}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={20}
        enableAutomaticScroll={true}
      >
        <FadeInView>
          <View style={styles.iconoContainer}>
            <View style={styles.iconoCirculo}>
              <Text style={styles.iconoEmoji}>🔒</Text>
            </View>
          </View>
          <Text style={styles.titulo}>Actualiza tu contraseña</Text>
          <Text style={styles.subtitulo}>
            Ingresa tu contraseña actual y la nueva contraseña
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
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
            value={contraNueva}
            error={errores.contraNueva}
            onChangeText={(v) => {
              setContraNueva(v);
              if (errores.contraNueva)
                setErrores({ ...errores, contraNueva: undefined });
            }}
          />

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
  container: { flex: 1, backgroundColor: colors.blanco },
  scroll: {
    padding: espacios.grande,
    paddingBottom: espacios.grande * 2,
    flexGrow: 1,
  },
  iconoContainer: { alignItems: 'center', marginBottom: espacios.medio },
  iconoCirculo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.verde,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  iconoEmoji: { fontSize: 38 },
  titulo: {
    fontSize: fonts.grande,
    fontWeight: 'bold',
    color: colors.negro,
    textAlign: 'center',
    marginBottom: espacios.pequeno,
  },
  subtitulo: {
    fontSize: fonts.normal,
    color: colors.gris,
    textAlign: 'center',
    marginBottom: espacios.grande,
  },
});