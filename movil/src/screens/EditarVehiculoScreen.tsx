import React, { useEffect, useState } from 'react';
import {
  View, Text, Alert, StyleSheet, Image, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import SuccessCheck from '../components/SuccessCheck';
import { vehiculoService, EstadoEdicionVehiculo } from '../services/vehiculoService';
import { subirImagen } from '../services/uploadService';
import { VehiculoUsuario } from '../types/vehiculo';

/**
 * Edición restringida:
 *  - Solo se permite cambiar la FOTO del vehículo y el COLOR.
 *  - Hay un cooldown de 15 días entre ediciones.
 */
export default function EditarVehiculoScreen({ navigation, route }: any) {
  const { colores, esOscuro } = useTheme();
  const { placa } = route.params;

  const [vehiculo, setVehiculo] = useState<VehiculoUsuario | null>(null);
  const [estadoEdicion, setEstadoEdicion] = useState<EstadoEdicionVehiculo | null>(null);
  const [color, setColor] = useState('');
  const [fotoVehiculoLocal, setFotoVehiculoLocal] = useState<string | null>(null);
  const [errores, setErrores] = useState<any>({});
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [mensajeCargando, setMensajeCargando] = useState('');
  const [exitoVisible, setExitoVisible] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [detalle, edicion] = await Promise.all([
        vehiculoService.obtenerDetalle(placa),
        vehiculoService.puedeEditar(placa).catch(() => null),
      ]);
      setVehiculo(detalle);
      setColor(detalle.color);
      if (edicion) setEstadoEdicion(edicion);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setCargandoInicial(false);
    }
  };

  const seleccionarFoto = () => {
    if (estadoEdicion && !estadoEdicion.puedeEditar) {
      Alert.alert(
        'Edición bloqueada',
        `Solo puedes editar este vehículo cada 15 días. Te faltan ${estadoEdicion.diasRestantes} día(s).`,
      );
      return;
    }
    Alert.alert('Foto del vehículo', '¿De dónde tomar la foto?', [
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
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets.length > 0) {
      setFotoVehiculoLocal(result.assets[0].uri);
    }
  };

  const validar = (): boolean => {
    const e: any = {};
    if (!color.trim()) e.color = 'El color es obligatorio';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar() || !vehiculo) return;
    if (estadoEdicion && !estadoEdicion.puedeEditar) {
      Alert.alert(
        'Edición bloqueada',
        `Solo puedes editar este vehículo cada 15 días. Te faltan ${estadoEdicion.diasRestantes} día(s).`,
      );
      return;
    }

    const datos: any = {};
    if (fotoVehiculoLocal) {
      try {
        setCargando(true);
        setMensajeCargando('Subiendo foto del vehículo...');
        datos.fotoVehiculo = await subirImagen(fotoVehiculoLocal);
      } catch (error: any) {
        setCargando(false);
        Alert.alert('Error subiendo foto', error.message);
        return;
      }
    }
    if (color.trim() !== vehiculo.color) datos.color = color.trim();

    if (Object.keys(datos).length === 0) {
      setCargando(false);
      Alert.alert('Sin cambios', 'No hay cambios para guardar');
      return;
    }

    try {
      setCargando(true);
      setMensajeCargando('Guardando cambios...');
      await vehiculoService.actualizar(vehiculo.placa, datos);

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

  if (cargandoInicial) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <SenaHeader titulo="Editar Vehículo" mostrarVolver onBackPress={() => navigation.goBack()} />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colores.verde} />
        </View>
      </View>
    );
  }

  if (!vehiculo) return null;

  const bloqueado = !!estadoEdicion && !estadoEdicion.puedeEditar;

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader titulo="Editar Vehículo" mostrarVolver onBackPress={() => navigation.goBack()} />
      {esOscuro && <View style={styles.aurora} />}

      <KeyboardAwareScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" enableOnAndroid>
        <FadeInView>
          {/* Placa solo informativa */}
          <View
            style={[
              styles.placaInfo,
              {
                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                borderColor: colores.borde,
              },
            ]}
          >
            <Text style={[styles.placaLabel, { color: colores.textoTenue }]}>PLACA</Text>
            <Text style={[styles.placaValor, { color: colores.textoPrimario }]}>{vehiculo.placa}</Text>
            <Text style={[styles.placaHelp, { color: colores.textoTenue }]}>
              La placa, tipo y tarjeta de propiedad no se pueden modificar
            </Text>
          </View>

          {/* Aviso de cooldown */}
          {bloqueado ? (
            <View style={[styles.aviso, { backgroundColor: esOscuro ? 'rgba(229,57,53,0.10)' : '#FFEBEE', borderColor: '#E53935' }]}>
              <Text style={[styles.avisoTitulo, { color: '#E53935' }]}>Edición bloqueada</Text>
              <Text style={[styles.avisoTexto, { color: colores.textoPrimario }]}>
                Solo puedes editar este vehículo cada 15 días.{'\n'}
                Faltan <Text style={{ fontWeight: '900' }}>{estadoEdicion!.diasRestantes} día(s)</Text> para tu próxima edición.
              </Text>
              {estadoEdicion?.proximaEdicionDisponible && (
                <Text style={[styles.avisoTexto, { color: colores.textoSecundario, marginTop: 4 }]}>
                  Disponible el {new Date(estadoEdicion.proximaEdicionDisponible).toLocaleDateString('es-CO')}
                </Text>
              )}
            </View>
          ) : (
            <View style={[styles.aviso, { backgroundColor: esOscuro ? 'rgba(255,193,7,0.10)' : '#FFF8E1', borderColor: '#FFC107' }]}>
              <Text style={[styles.avisoTitulo, { color: esOscuro ? '#FFD54F' : '#856404' }]}>Edición restringida</Text>
              <Text style={[styles.avisoTexto, { color: esOscuro ? '#FFD54F' : '#856404' }]}>
                Solo puedes editar la foto y el color del vehículo.{'\n'}
                Después de guardar, deberás esperar 15 días para poder editar de nuevo.
              </Text>
            </View>
          )}

          {/* Foto del vehículo (editable) */}
          <Text style={[styles.label, { color: colores.verde }]}>Foto del Vehículo</Text>
          <TouchableOpacity
            style={[
              styles.fotoBox,
              {
                backgroundColor: esOscuro ? colores.glassFondo : '#f4f6f4',
                borderColor: esOscuro ? colores.borde : colores.gris,
                opacity: bloqueado ? 0.6 : 1,
              },
            ]}
            onPress={seleccionarFoto}
            disabled={bloqueado}
          >
            <Image source={{ uri: fotoVehiculoLocal || vehiculo.fotoVehiculo }} style={styles.fotoImg} />
            {!bloqueado && (
              <View style={[styles.cambiarOverlay, { backgroundColor: colores.verde }]}>
                <Text style={styles.cambiarTexto}>Cambiar foto</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Color (editable) */}
          <AnimatedInput
            label="Color"
            placeholder="Rojo, Negro, Blanco..."
            value={color}
            error={errores.color}
            onChangeText={(v) => {
              setColor(v);
              if (errores.color) setErrores({ ...errores, color: undefined });
            }}
            editable={!bloqueado}
          />

          {/* Bloque de campos NO editables (solo informativo) */}
          <View style={[styles.bloqueadoBox, { backgroundColor: esOscuro ? 'rgba(255,255,255,0.04)' : '#F5F5F5', borderColor: colores.borde }]}>
            <Text style={[styles.bloqueadoTitulo, { color: colores.textoSecundario }]}>Datos no editables</Text>
            <View style={styles.bloqueadoFila}>
              <Text style={[styles.bloqueadoEtiqueta, { color: colores.textoTenue }]}>Tipo:</Text>
              <Text style={[styles.bloqueadoValor, { color: colores.textoPrimario }]}>{vehiculo.tipoVehiculo}</Text>
            </View>
            <View style={styles.bloqueadoFila}>
              <Text style={[styles.bloqueadoEtiqueta, { color: colores.textoTenue }]}>Tarjeta:</Text>
              <Text style={[styles.bloqueadoValor, { color: colores.textoTenue, fontSize: fonts.pequeno }]}>
                Disponible en detalle
              </Text>
            </View>
            <View style={styles.bloqueadoFila}>
              <Text style={[styles.bloqueadoEtiqueta, { color: colores.textoTenue }]}>Foto placa:</Text>
              <Text style={[styles.bloqueadoValor, { color: colores.textoTenue, fontSize: fonts.pequeno }]}>
                Disponible en detalle
              </Text>
            </View>
          </View>

          <View style={{ marginTop: espacios.medio }}>
            <AnimatedButton
              texto={bloqueado ? `Disponible en ${estadoEdicion!.diasRestantes} día(s)` : 'Guardar Cambios'}
              onPress={handleGuardar}
              cargando={cargando}
              mensajeCargando={mensajeCargando}
              deshabilitado={bloqueado}
            />
          </View>
        </FadeInView>
      </KeyboardAwareScrollView>

      <SuccessCheck visible={exitoVisible} mensaje="¡Vehículo actualizado!" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  aurora: {
    position: 'absolute', top: 100, right: -80, width: 250, height: 250,
    borderRadius: 125, backgroundColor: 'rgba(57,169,0,0.15)',
  },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: espacios.medio, paddingBottom: espacios.grande * 2 },
  placaInfo: {
    borderRadius: 16, padding: espacios.medio, borderWidth: 1,
    alignItems: 'center', marginBottom: espacios.medio,
  },
  placaLabel: { fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 1.2 },
  placaValor: { fontSize: 32, fontWeight: '900', letterSpacing: 3, marginVertical: 4 },
  placaHelp: { fontSize: fonts.pequeno, fontStyle: 'italic', textAlign: 'center' },
  aviso: {
    borderRadius: 12,
    padding: espacios.normal,
    borderWidth: 1,
    marginBottom: espacios.normal,
  },
  avisoTitulo: { fontWeight: '800', fontSize: fonts.normal, marginBottom: 4 },
  avisoTexto: { fontSize: fonts.pequeno, lineHeight: 18 },
  label: {
    fontSize: fonts.normal, fontWeight: 'bold',
    marginBottom: espacios.pequeno, marginTop: espacios.normal,
  },
  fotoBox: {
    borderRadius: 12, height: 200, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, overflow: 'hidden', position: 'relative',
  },
  fotoImg: { width: '100%', height: '100%' },
  cambiarOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 8, alignItems: 'center',
  },
  cambiarTexto: { color: '#ffffff', fontSize: fonts.pequeno, fontWeight: '700' },
  bloqueadoBox: {
    borderRadius: 12,
    padding: espacios.normal,
    borderWidth: 1,
    marginTop: espacios.medio,
  },
  bloqueadoTitulo: {
    fontSize: fonts.pequeno,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  bloqueadoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bloqueadoEtiqueta: { fontSize: fonts.pequeno },
  bloqueadoValor: { fontSize: fonts.normal, fontWeight: '600' },
});
