import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import { usuarioService } from '../services/usuarioService';
import { subirImagen } from '../services/uploadService';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedLogo from '../components/AnimatedLogo';
import FadeInView from '../components/FadeInView';
import Footer from '../components/Footer';
import SuccessCheck from '../components/SuccessCheck';
import BotonTema from '../components/BotonTema';
import MedidorContrasena from '../components/MedidorContrasena';
import { validarContrasenaSegura } from '../utils/validacionContrasena';

interface FormState {
  nombreCompleto: string;
  documento: string;
  correo: string;
  contra: string;
  confirmarContra: string;
  numTelf: string;
  contactoEmerg: string;
  idFormacion: string;
}

const FORM_INICIAL: FormState = {
  nombreCompleto: '',
  documento: '',
  correo: '',
  contra: '',
  confirmarContra: '',
  numTelf: '',
  contactoEmerg: '',
  idFormacion: '',
};

export default function RegisterScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof FormState | 'foto', string>>>({});
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensajeCargando, setMensajeCargando] = useState('');
  const [exitoVisible, setExitoVisible] = useState(false);
  const paddingTopSeguro =
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 50;

  const verdeSena = '#39A900';
  const grisOscuro = '#232323';
  const tituloColor = esOscuro ? colores.textoPrimario : grisOscuro;
  const linkColor = esOscuro ? colores.verde : verdeSena;

  const actualizarCampo = (campo: keyof FormState, valor: string) => {
    setForm({ ...form, [campo]: valor });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  const seleccionarFoto = async () => {
    Alert.alert('Foto de perfil', '¿De dónde tomar la foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => abrirCamara() },
      { text: 'Galería', onPress: () => abrirGaleria() },
    ]);
  };

  const abrirCamara = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setFotoLocal(result.assets[0].uri);
      if (errores.foto) setErrores({ ...errores, foto: undefined });
    }
  };

  const abrirGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setFotoLocal(result.assets[0].uri);
      if (errores.foto) setErrores({ ...errores, foto: undefined });
    }
  };

  const validarFormulario = (): boolean => {
    const e: Partial<Record<keyof FormState | 'foto', string>> = {};
    if (!form.nombreCompleto.trim()) e.nombreCompleto = 'El nombre es obligatorio';
    else if (form.nombreCompleto.length < 3) e.nombreCompleto = 'Mínimo 3 caracteres';
    if (!form.documento.trim()) e.documento = 'El documento es obligatorio';
    else if (!/^[0-9]+$/.test(form.documento)) e.documento = 'Solo números';
    else if (form.documento.length < 6 || form.documento.length > 10)
      e.documento = 'Entre 6 y 10 dígitos';
    if (!form.correo.trim()) e.correo = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo))
      e.correo = 'Formato inválido';
    const errorContra = validarContrasenaSegura(form.contra);
    if (errorContra) e.contra = errorContra;
    if (form.contra !== form.confirmarContra) e.confirmarContra = 'No coinciden';
    if (!form.numTelf.trim()) e.numTelf = 'El teléfono es obligatorio';
    else if (!/^[0-9]{10}$/.test(form.numTelf)) e.numTelf = '10 dígitos';
    if (!form.contactoEmerg.trim()) e.contactoEmerg = 'Obligatorio';
    else if (!/^[0-9]{10}$/.test(form.contactoEmerg)) e.contactoEmerg = '10 dígitos';
    if (!form.idFormacion.trim()) e.idFormacion = 'La ficha es obligatoria';
    else if (!/^[0-9]{7}$/.test(form.idFormacion)) e.idFormacion = '7 dígitos';
    if (!fotoLocal) e.foto = 'Debes seleccionar una foto';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleRegistro = async () => {
    if (!validarFormulario()) return;
    setCargando(true);
    try {
      setMensajeCargando('Subiendo foto...');
      const urlFoto = await subirImagen(fotoLocal!);

      setMensajeCargando('Registrando...');
      await usuarioService.registrar({
        documento: form.documento,
        fotoPersona: urlFoto,
        nombreCompleto: form.nombreCompleto,
        numTelf: form.numTelf,
        contactoEmerg: form.contactoEmerg,
        correo: form.correo,
        contra: form.contra,
        idFormacion: form.idFormacion,
      });

      setExitoVisible(true);
      const correoRegistrado = form.correo;
      setTimeout(() => {
        setExitoVisible(false);
        setForm(FORM_INICIAL);
        setFotoLocal(null);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login', params: { correo: correoRegistrado } }],
        });
      }, 900);
    } catch (error: any) {
      Alert.alert('Error en el registro', error.message);
    } finally {
      setCargando(false);
      setMensajeCargando('');
    }
  };

  return (
    <>
      <View style={[{ flex: 1, backgroundColor: esOscuro ? colores.fondo : '#F4F6F4' }, styles.relative]}>
        {esOscuro && (
          <>
            <View style={styles.auroraTop} />
            <View style={styles.auroraBottom} />
          </>
        )}
        <BotonTema />

        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={20}
        >
          <View style={[styles.container, { paddingTop: paddingTopSeguro }]}>
            <FadeInView style={styles.logoContainer}>
              <AnimatedLogo size={70} pulse={false} />
            </FadeInView>
            <FadeInView delay={150}>
              <Text style={[styles.titulo, { color: tituloColor }]}>Registro</Text>

              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                    borderColor: esOscuro ? colores.glassBorde : 'rgba(35,35,35,0.08)',
                    shadowColor: esOscuro ? '#000000' : 'rgba(15, 23, 42, 0.16)',
                  },
                ]}
              >
                <View style={styles.fotoContainer}>
                  {fotoLocal ? (
                    <Image source={{ uri: fotoLocal }} style={[styles.fotoPreview, { borderColor: linkColor }]} />
                  ) : (
                    <View
                      style={[
                        styles.fotoPlaceholder,
                        {
                          backgroundColor: esOscuro ? colores.glassFondo : '#f4f6f4',
                          borderColor: 'rgba(57,169,0,0.35)',
                        },
                      ]}
                    >
                      <Text style={[styles.fotoPlaceholderTexto, { color: colores.textoTenue }]}>
                        Sin foto
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.botonFoto, { backgroundColor: linkColor, shadowColor: linkColor }]}
                    onPress={seleccionarFoto}
                    disabled={cargando}
                  >
                    <Text style={styles.botonFotoTexto}>
                      {fotoLocal ? 'Cambiar Foto' : 'Subir Foto'}
                    </Text>
                  </TouchableOpacity>
                  {errores.foto ? (
                    <Text style={[styles.textoError, { color: colores.error }]}>
                      {errores.foto}
                    </Text>
                  ) : null}
                </View>

                <AnimatedInput
                  label="Nombre y Apellido"
                  placeholder="Nombres y apellidos"
                  value={form.nombreCompleto}
                  error={errores.nombreCompleto}
                  onChangeText={(v) => actualizarCampo('nombreCompleto', v)}
                />

                <AnimatedInput
                  label="Número de Documento"
                  placeholder="Número de documento"
                  keyboardType="numeric"
                  maxLength={10}
                  value={form.documento}
                  error={errores.documento}
                  onChangeText={(v) => actualizarCampo('documento', v)}
                />

                <AnimatedInput
                  label="Correo"
                  placeholder="ejemplo@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.correo}
                  error={errores.correo}
                  onChangeText={(v) => actualizarCampo('correo', v)}
                />

                <AnimatedInput
                  label="Número Telefónico"
                  placeholder="3001234567"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.numTelf}
                  error={errores.numTelf}
                  onChangeText={(v) => actualizarCampo('numTelf', v)}
                />

                <AnimatedInput
                  label="Contacto de Emergencia"
                  placeholder="3007654321"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={form.contactoEmerg}
                  error={errores.contactoEmerg}
                  onChangeText={(v) => actualizarCampo('contactoEmerg', v)}
                />

                <AnimatedInput
                  label="Ficha de Formación"
                  placeholder="7 dígitos"
                  keyboardType="numeric"
                  maxLength={7}
                  value={form.idFormacion}
                  error={errores.idFormacion}
                  onChangeText={(v) => actualizarCampo('idFormacion', v)}
                />

                {/* ─── CONTRASEÑAS AL FINAL ─── */}
                <AnimatedInput
                  label="Contraseña"
                  placeholder="Crea una contraseña segura"
                  secureTextEntry
                  value={form.contra}
                  error={errores.contra}
                  onChangeText={(v) => actualizarCampo('contra', v)}
                />

                {/* Medidor de fortaleza - solo aparece al escribir */}
                <MedidorContrasena contrasena={form.contra} />

                <AnimatedInput
                  label="Confirmar Contraseña"
                  placeholder="Repite la contraseña"
                  secureTextEntry
                  value={form.confirmarContra}
                  error={errores.confirmarContra}
                  onChangeText={(v) => actualizarCampo('confirmarContra', v)}
                />

                <View style={{ marginTop: 16 }}>
                  <AnimatedButton
                    texto="Continuar"
                    onPress={handleRegistro}
                    cargando={cargando}
                    mensajeCargando={mensajeCargando}
                  />
                </View>

                <View style={styles.filaInferior}>
                  <Text style={[styles.textoNormal, { color: colores.textoTenue }]}>
                    ¿Tienes una cuenta?
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={[styles.enlace, { color: linkColor }]}>Iniciar Sesión</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </FadeInView>
          </View>
          <Footer />
        </KeyboardAwareScrollView>
      </View>
      <SuccessCheck visible={exitoVisible} mensaje="¡Registro exitoso!" />
    </>
  );
}

const styles = StyleSheet.create({
  relative: { position: 'relative' },
  auroraTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(57,169,0,0.20)',
  },
  auroraBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(0,120,50,0.15)',
  },
  scrollContainer: { flexGrow: 1 },
  container: {
    paddingHorizontal: espacios.grande,
    paddingBottom: espacios.grande,
  },
  logoContainer: { alignItems: 'center', marginBottom: espacios.medio },
  titulo: {
    fontSize: fonts.enorme,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: espacios.medio,
    letterSpacing: -0.5,
  },
  card: {
    borderRadius: 24,
    padding: espacios.grande,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  fotoContainer: { alignItems: 'center', marginBottom: espacios.medio },
  fotoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 2,
  },
  fotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  fotoPlaceholderTexto: { fontSize: fonts.normal },
  botonFoto: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  botonFotoTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: fonts.pequeno },
  textoError: { fontSize: fonts.pequeno, marginTop: 4 },
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
