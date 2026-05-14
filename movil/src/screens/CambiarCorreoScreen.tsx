import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import OtpInput from '../components/OtpInput';
import SuccessCheck from '../components/SuccessCheck';
import { usuarioService } from '../services/usuarioService';
import { sessionService } from '../services/sessionService';

type Paso = 'correo' | 'codigo';

export default function CambiarCorreoScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const { usuario, iniciarSesion } = useAuth();

  const [paso, setPaso] = useState<Paso>('correo');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [errores, setErrores] = useState<any>({});
  const [cargando, setCargando] = useState(false);
  const [errorOtp, setErrorOtp] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [exitoVisible, setExitoVisible] = useState(false);

  const validarCorreo = (): boolean => {
    const e: any = {};
    if (!nuevoCorreo.trim()) e.correo = 'Obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoCorreo)) e.correo = 'Formato inválido';
    else if (nuevoCorreo === usuario?.correo) e.correo = 'Debe ser diferente al actual';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleEnviarCodigo = async () => {
    if (!validarCorreo()) return;
    setCargando(true);
    try {
      await usuarioService.solicitarCambioCorreo(nuevoCorreo);
      setPaso('codigo');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
    }
  };

  const handleVerificar = async (codigo: string) => {
    if (!usuario) return;
    setCargando(true);
    setErrorOtp(false);
    setMensajeError('');
    try {
      const usuarioActualizado = await usuarioService.confirmarCambioCorreo(nuevoCorreo, codigo);
      const token = await sessionService.obtenerToken();
      if (token) await iniciarSesion(usuarioActualizado, token);

      setExitoVisible(true);
      setTimeout(() => {
        setExitoVisible(false);
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      setErrorOtp(true);
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader
        titulo="Cambiar Correo"
        mostrarVolver
        onBackPress={() => navigation.goBack()}
      />

      {esOscuro && <View style={styles.aurora} />}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
      >
        <FadeInView>
          <View
            style={[
              styles.iconoCirculo,
              {
                backgroundColor: colores.verde,
                shadowColor: colores.verde,
                shadowOpacity: esOscuro ? 0.6 : 0.3,
              },
            ]}
          >
            <Text style={styles.iconoEmoji}>{paso === 'correo' ? '📧' : '🔐'}</Text>
          </View>

          {paso === 'correo' ? (
            <>
              <Text style={[styles.titulo, { color: colores.textoPrimario }]}>
                Nuevo correo electrónico
              </Text>
              <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
                Te enviaremos un código de verificación al nuevo correo para confirmar el cambio.
              </Text>

              <View
                style={[
                  styles.cardActual,
                  {
                    backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                    borderColor: colores.borde,
                  },
                ]}
              >
                <Text style={[styles.cardLabel, { color: colores.textoTenue }]}>
                  Correo actual
                </Text>
                <Text style={[styles.cardValor, { color: colores.textoPrimario }]}>
                  {usuario?.correo}
                </Text>
              </View>

              <AnimatedInput
                label="Nuevo Correo"
                placeholder="nuevo@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={nuevoCorreo}
                error={errores.correo}
                onChangeText={(v) => {
                  setNuevoCorreo(v);
                  if (errores.correo) setErrores({ ...errores, correo: undefined });
                }}
              />

              <View style={{ marginTop: espacios.medio }}>
                <AnimatedButton
                  texto="Enviar Código"
                  onPress={handleEnviarCodigo}
                  cargando={cargando}
                  mensajeCargando="Enviando..."
                />
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.titulo, { color: colores.textoPrimario }]}>
                Verifica tu nuevo correo
              </Text>
              <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
                Te enviamos un código de 6 dígitos a
              </Text>
              <Text style={[styles.correo, { color: colores.verde }]}>{nuevoCorreo}</Text>

              <OtpInput
                onCompleto={handleVerificar}
                error={errorOtp}
                deshabilitado={cargando}
              />

              {errorOtp && mensajeError !== '' && (
                <Text style={[styles.error, { color: colores.error }]}>{mensajeError}</Text>
              )}

              <View style={{ marginTop: espacios.medio }}>
                <AnimatedButton
                  texto="Cambiar correo"
                  onPress={() => setPaso('correo')}
                  variante="secundario"
                />
              </View>
            </>
          )}
        </FadeInView>
      </KeyboardAwareScrollView>

      <SuccessCheck visible={exitoVisible} mensaje="¡Correo actualizado!" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  aurora: {
    position: 'absolute',
    top: 100,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(57,169,0,0.15)',
  },
  scroll: { padding: espacios.grande, paddingBottom: espacios.grande * 2 },
  iconoCirculo: {
    width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', elevation: 5, marginBottom: espacios.medio,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 8,
  },
  iconoEmoji: { fontSize: 38 },
  titulo: {
    fontSize: fonts.grande, fontWeight: 'bold', textAlign: 'center',
    marginBottom: espacios.pequeno,
  },
  subtitulo: {
    fontSize: fonts.normal, textAlign: 'center', marginBottom: espacios.medio,
    paddingHorizontal: espacios.pequeno,
  },
  correo: {
    fontSize: fonts.medio, fontWeight: 'bold', textAlign: 'center',
    marginBottom: espacios.medio,
  },
  cardActual: {
    borderRadius: 12, padding: espacios.normal, borderWidth: 1,
    marginBottom: espacios.medio,
  },
  cardLabel: { fontSize: fonts.pequeno, fontWeight: '600' },
  cardValor: { fontSize: fonts.medio, fontWeight: '600', marginTop: 2 },
  error: { fontSize: fonts.normal, textAlign: 'center', marginTop: espacios.pequeno },
});