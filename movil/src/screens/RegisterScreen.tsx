import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { registerStyles } from '../styles/registerStyles';
import { usuarioService } from '../services/usuarioService';
import { subirImagen } from '../services/uploadService';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedLogo from '../components/AnimatedLogo';
import FadeInView from '../components/FadeInView';
import Footer from '../components/Footer';
import SuccessCheck from '../components/SuccessCheck';

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
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [errores, setErrores] = useState<Partial<Record<keyof FormState | 'foto', string>>>({});
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [mensajeCargando, setMensajeCargando] = useState('');
  const [exitoVisible, setExitoVisible] = useState(false);

  const actualizarCampo = (campo: keyof FormState, valor: string) => {
    setForm({ ...form, [campo]: valor });
    if (errores[campo]) setErrores({ ...errores, [campo]: undefined });
  };

  const seleccionarFoto = async () => {
    Alert.alert('Foto de perfil', '¿De dónde quieres tomar la foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => abrirCamara() },
      { text: 'Galería', onPress: () => abrirGaleria() },
    ]);
  };

  const abrirCamara = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
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
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tus fotos');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
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
      e.correo = 'Formato de correo inválido';

    if (!form.contra) e.contra = 'La contraseña es obligatoria';
    else if (form.contra.length < 6) e.contra = 'Mínimo 6 caracteres';

    if (form.contra !== form.confirmarContra) e.confirmarContra = 'Las contraseñas no coinciden';

    if (!form.numTelf.trim()) e.numTelf = 'El teléfono es obligatorio';
    else if (!/^[0-9]{10}$/.test(form.numTelf)) e.numTelf = 'Debe tener 10 dígitos';

    if (!form.contactoEmerg.trim()) e.contactoEmerg = 'Obligatorio';
    else if (!/^[0-9]{10}$/.test(form.contactoEmerg))
      e.contactoEmerg = 'Debe tener 10 dígitos';

    if (!form.idFormacion.trim()) e.idFormacion = 'La ficha es obligatoria';
    else if (!/^[0-9]{7}$/.test(form.idFormacion)) e.idFormacion = 'Debe tener 7 dígitos';

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
      setTimeout(() => {
        setExitoVisible(false);
        navigation.navigate('Login');
      }, 1800);
    } catch (error: any) {
      Alert.alert('Error en el registro', error.message);
    } finally {
      setCargando(false);
      setMensajeCargando('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={registerStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={registerStyles.container}>
          <FadeInView style={registerStyles.logoContainer}>
            <AnimatedLogo size={80} pulse={false} />
          </FadeInView>

          <FadeInView delay={150}>
            <Text style={registerStyles.titulo}>Registro</Text>

            <View style={registerStyles.fotoContainer}>
              {fotoLocal ? (
                <Image source={{ uri: fotoLocal }} style={registerStyles.fotoPreview} />
              ) : (
                <View style={registerStyles.fotoPlaceholder}>
                  <Text style={registerStyles.fotoPlaceholderTexto}>Sin foto</Text>
                </View>
              )}
              <TouchableOpacity
                style={registerStyles.botonFoto}
                onPress={seleccionarFoto}
                disabled={cargando}
              >
                <Text style={registerStyles.botonFotoTexto}>
                  {fotoLocal ? 'Cambiar Foto' : 'Subir Foto'}
                </Text>
              </TouchableOpacity>
              {errores.foto && (
                <Text style={registerStyles.textoError}>{errores.foto}</Text>
              )}
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
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={form.contra}
              error={errores.contra}
              onChangeText={(v) => actualizarCampo('contra', v)}
            />

            <AnimatedInput
              label="Confirmar Contraseña"
              placeholder="Repite la contraseña"
              secureTextEntry
              value={form.confirmarContra}
              error={errores.confirmarContra}
              onChangeText={(v) => actualizarCampo('confirmarContra', v)}
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

            <View style={{ marginTop: 16 }}>
              <AnimatedButton
                texto="Continuar"
                onPress={handleRegistro}
                cargando={cargando}
                mensajeCargando={mensajeCargando}
              />
            </View>

            <View style={registerStyles.filaInferior}>
              <Text style={registerStyles.textoNormal}>¿Tienes una cuenta?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={registerStyles.enlace}>Iniciar Sesión</Text>
              </TouchableOpacity>
            </View>
          </FadeInView>
        </View>
      </ScrollView>
      <Footer />
      <SuccessCheck visible={exitoVisible} mensaje="¡Registro exitoso!" />
    </KeyboardAvoidingView>
  );
}