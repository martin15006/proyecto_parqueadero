import React, { useState } from 'react';
import { Pencil } from 'lucide-react-native';
import {
  View, Text, Alert, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AvatarIniciales from '../components/AvatarIniciales';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import SuccessCheck from '../components/SuccessCheck';
import { usuarioService } from '../services/usuarioService';
import { subirImagen } from '../services/uploadService';

export default function EditarPerfilScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const { usuario, iniciarSesion } = useAuth();
  const { sessionService } = require('../services/sessionService');

  const [numTelf, setNumTelf] = useState(usuario?.numTelf || '');
  const [contactoEmerg, setContactoEmerg] = useState(usuario?.contactoEmerg || '');
  const [fotoLocal, setFotoLocal] = useState<string | null>(null);
  const [errores, setErrores] = useState<any>({});
  const [cargando, setCargando] = useState(false);
  const [mensajeCargando, setMensajeCargando] = useState('');
  const [exitoVisible, setExitoVisible] = useState(false);

  const seleccionarFoto = () => {
    Alert.alert('Foto', '¿De dónde quieres tomar la foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => abrir('camara') },
      { text: 'Galería', onPress: () => abrir('galeria') },
    ]);
  };

  const abrir = async (origen: 'camara' | 'galeria') => {
    const permiso =
      origen === 'camara'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permiso.status !== 'granted') {
      Alert.alert('Permiso denegado');
      return;
    }
    const result =
      origen === 'camara'
        ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'], allowsEditing: false, quality: 0.7,
        })
        : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'], allowsEditing: false, quality: 0.7,
        });
    if (!result.canceled && result.assets.length > 0) {
      setFotoLocal(result.assets[0].uri);
    }
  };

  const validar = (): boolean => {
    const e: any = {};
    if (numTelf && !/^[0-9]{10}$/.test(numTelf)) e.numTelf = '10 dígitos';
    if (contactoEmerg && !/^[0-9]{10}$/.test(contactoEmerg)) e.contactoEmerg = '10 dígitos';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    if (!usuario) return;

    setCargando(true);
    try {
      let fotoUrl: string | undefined;
      if (fotoLocal) {
        setMensajeCargando('Subiendo foto...');
        fotoUrl = await subirImagen(fotoLocal);
      }

      setMensajeCargando('Guardando cambios...');
      const datos: any = {};
      if (fotoUrl) datos.fotoPersona = fotoUrl;
      if (numTelf !== usuario.numTelf) datos.numTelf = numTelf;
      if (contactoEmerg !== usuario.contactoEmerg) datos.contactoEmerg = contactoEmerg;

      if (Object.keys(datos).length === 0) {
        Alert.alert('Sin cambios', 'No hay cambios para guardar');
        setCargando(false);
        return;
      }

      const usuarioActualizado = await usuarioService.actualizarPerfil(datos);

      const token = await sessionService.obtenerToken();
      if (token) await iniciarSesion(usuarioActualizado, token);

      setExitoVisible(true);
      setTimeout(() => {
        setExitoVisible(false);
        navigation.goBack();
      }, 1800);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
      setMensajeCargando('');
    }
  };

  if (!usuario) return null;

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader
        titulo="Editar Perfil"
        mostrarVolver
        onBackPress={() => navigation.goBack()}
      />

      {esOscuro && <View style={styles.aurora} />}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <FadeInView>
          <View style={styles.fotoSection}>
            <TouchableOpacity onPress={seleccionarFoto} activeOpacity={0.7}>
              {fotoLocal ? (
                <Image source={{ uri: fotoLocal }} style={styles.fotoPreview} />
              ) : (
                <AvatarIniciales
                  nombre={usuario.nombreCompleto}
                  fotoUrl={usuario.fotoPersona}
                  size={120}
                />
              )}
              <View style={[styles.editIcon, { backgroundColor: colores.verde }]}>
                <Pencil size={14} color="#ffffff" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.fotoHelp, { color: colores.textoTenue }]}>
              Toca la foto para cambiarla
            </Text>
          </View>

          <Text style={[styles.seccion, { color: colores.textoTenue }]}>
            DATOS PERSONALES (no editables)
          </Text>
          <View
            style={[
              styles.cardBloqueada,
              {
                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                borderColor: colores.borde,
              },
            ]}
          >
            <DatoFijo label="Nombre" valor={usuario.nombreCompleto} colores={colores} />
            <View style={[styles.divider, { backgroundColor: colores.borde }]} />
            <DatoFijo label="Documento" valor={usuario.documento} colores={colores} />
            <View style={[styles.divider, { backgroundColor: colores.borde }]} />
            <DatoFijo label="Ficha" valor={usuario.idFormacion || 'Sin asignar'} colores={colores} />
          </View>

          <Text style={[styles.seccion, { color: colores.textoTenue, marginTop: espacios.medio }]}>
            CORREO ELECTRÓNICO
          </Text>
          <TouchableOpacity
            style={[
              styles.cardCorreo,
              {
                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                borderColor: colores.borde,
              },
            ]}
            onPress={() => navigation.navigate('CambiarCorreo')}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.correoLabel, { color: colores.textoTenue }]}>
                Actual
              </Text>
              <Text style={[styles.correoValor, { color: colores.textoPrimario }]} numberOfLines={1}>
                {usuario.correo}
              </Text>
            </View>
            <View style={[styles.cambiarBtn, { backgroundColor: colores.verde }]}>
              <Text style={styles.cambiarBtnText}>Cambiar</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.seccion, { color: colores.textoTenue, marginTop: espacios.medio }]}>
            DATOS DE CONTACTO
          </Text>

          <AnimatedInput
            label="Número de Teléfono"
            placeholder="3001234567"
            keyboardType="phone-pad"
            maxLength={10}
            value={numTelf}
            error={errores.numTelf}
            onChangeText={(v) => {
              setNumTelf(v);
              if (errores.numTelf) setErrores({ ...errores, numTelf: undefined });
            }}
          />

          <AnimatedInput
            label="Contacto de Emergencia"
            placeholder="3007654321"
            keyboardType="phone-pad"
            maxLength={10}
            value={contactoEmerg}
            error={errores.contactoEmerg}
            onChangeText={(v) => {
              setContactoEmerg(v);
              if (errores.contactoEmerg) setErrores({ ...errores, contactoEmerg: undefined });
            }}
          />

          <View style={{ marginTop: espacios.medio }}>
            <AnimatedButton
              texto="Guardar Cambios"
              onPress={handleGuardar}
              cargando={cargando}
              mensajeCargando={mensajeCargando}
            />
          </View>
        </FadeInView>
      </KeyboardAwareScrollView>

      <SuccessCheck visible={exitoVisible} mensaje="¡Perfil actualizado!" />
    </View>
  );
}

function DatoFijo({ label, valor, colores }: any) {
  return (
    <View style={styles.datoFila}>
      <Text style={[styles.datoLabel, { color: colores.textoTenue }]}>{label}</Text>
      <Text style={[styles.datoValor, { color: colores.textoPrimario }]}>{valor}</Text>
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
  scroll: { padding: espacios.medio, paddingBottom: espacios.grande * 2 },
  fotoSection: { alignItems: 'center', marginVertical: espacios.medio },
  fotoPreview: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#ffffff',
  },
  editIcon: {
    position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#ffffff',
  },
  editIconText: { fontSize: 16 },
  fotoHelp: { fontSize: fonts.pequeno, marginTop: 8 },
  seccion: {
    fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: espacios.pequeno, marginTop: espacios.pequeno,
  },
  cardBloqueada: {
    borderRadius: 16, padding: espacios.medio, borderWidth: 1, opacity: 0.85,
  },
  datoFila: { paddingVertical: 10 },
  datoLabel: { fontSize: fonts.pequeno, fontWeight: '600' },
  datoValor: { fontSize: fonts.medio, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, marginVertical: 2 },
  cardCorreo: {
    borderRadius: 16, padding: espacios.medio, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center',
  },
  correoLabel: { fontSize: fonts.pequeno, fontWeight: '600' },
  correoValor: { fontSize: fonts.medio, fontWeight: '600', marginTop: 2 },
  cambiarBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
  },
  cambiarBtnText: { color: '#ffffff', fontSize: fonts.pequeno, fontWeight: '700' },
});