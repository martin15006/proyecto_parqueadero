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
import { vehiculoService } from '../services/vehiculoService';
import { subirImagen } from '../services/uploadService';
import { TipoVehiculo, VehiculoUsuario } from '../types/vehiculo';

export default function EditarVehiculoScreen({ navigation, route }: any) {
  const { colores, esOscuro } = useTheme();
  const { placa } = route.params;

  const [vehiculo, setVehiculo] = useState<VehiculoUsuario | null>(null);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [color, setColor] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<number | null>(null);
  const [fotoVehiculoLocal, setFotoVehiculoLocal] = useState<string | null>(null);
  const [fotoTarjetaLocal, setFotoTarjetaLocal] = useState<string | null>(null);
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
      const [detalle, listaTipos] = await Promise.all([
        vehiculoService.obtenerDetalle(placa),
        vehiculoService.listarTipos(),
      ]);
      setVehiculo(detalle);
      setTipos(listaTipos);
      setColor(detalle.color);
      setTipoSeleccionado(detalle.idTipoVehiculo);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setCargandoInicial(false);
    }
  };

  const seleccionarFoto = (cual: 'vehiculo' | 'tarjeta') => {
    Alert.alert('Foto', '¿De dónde tomar la foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => abrir(cual, 'camara') },
      { text: 'Galería', onPress: () => abrir(cual, 'galeria') },
    ]);
  };

  const abrir = async (cual: 'vehiculo' | 'tarjeta', origen: 'camara' | 'galeria') => {
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
      if (cual === 'vehiculo') setFotoVehiculoLocal(result.assets[0].uri);
      else setFotoTarjetaLocal(result.assets[0].uri);
    }
  };

  const validar = (): boolean => {
    const e: any = {};
    if (!color.trim()) e.color = 'El color es obligatorio';
    if (!tipoSeleccionado) e.tipo = 'Selecciona un tipo';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar() || !vehiculo) return;
    setCargando(true);
    try {
      const datos: any = {};

      if (fotoVehiculoLocal) {
        setMensajeCargando('Subiendo foto del vehículo...');
        datos.fotoVehiculo = await subirImagen(fotoVehiculoLocal);
      }
      if (fotoTarjetaLocal) {
        setMensajeCargando('Subiendo foto de tarjeta...');
        datos.fotoTarjetaP = await subirImagen(fotoTarjetaLocal);
      }
      if (color !== vehiculo.color) datos.color = color.trim();
      if (tipoSeleccionado !== vehiculo.idTipoVehiculo) datos.idTipoVehiculo = tipoSeleccionado;

      if (Object.keys(datos).length === 0) {
        Alert.alert('Sin cambios', 'No hay cambios para guardar');
        setCargando(false);
        return;
      }

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
        <SenaHeader
          titulo="Editar Vehículo"
          mostrarVolver
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colores.verde} />
        </View>
      </View>
    );
  }

  if (!vehiculo) return null;

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader
        titulo="Editar Vehículo"
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
            <Text style={[styles.placaValor, { color: colores.textoPrimario }]}>
              {vehiculo.placa}
            </Text>
            <Text style={[styles.placaHelp, { color: colores.textoTenue }]}>
              La placa no se puede cambiar
            </Text>
          </View>

          <Text style={[styles.label, { color: colores.verde }]}>Foto del Vehículo</Text>
          <TouchableOpacity
            style={[styles.fotoBox, { backgroundColor: esOscuro ? colores.glassFondo : '#f4f6f4', borderColor: esOscuro ? colores.borde : colores.gris }]}
            onPress={() => seleccionarFoto('vehiculo')}
          >
            <Image
              source={{ uri: fotoVehiculoLocal || vehiculo.fotoVehiculo }}
              style={styles.fotoImg}
            />
            <View style={[styles.cambiarOverlay, { backgroundColor: colores.verde }]}>
              <Text style={styles.cambiarTexto}>📷 Cambiar</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.label, { color: colores.verde }]}>Tarjeta de Propiedad</Text>
          <TouchableOpacity
            style={[styles.fotoBox, { backgroundColor: esOscuro ? colores.glassFondo : '#f4f6f4', borderColor: esOscuro ? colores.borde : colores.gris }]}
            onPress={() => seleccionarFoto('tarjeta')}
          >
            <Image
              source={{ uri: fotoTarjetaLocal || vehiculo.fotoTarjetaP }}
              style={styles.fotoImg}
            />
            <View style={[styles.cambiarOverlay, { backgroundColor: colores.verde }]}>
              <Text style={styles.cambiarTexto}>📷 Cambiar</Text>
            </View>
          </TouchableOpacity>

          <AnimatedInput
            label="Color"
            placeholder="Rojo, Negro, Blanco..."
            value={color}
            error={errores.color}
            onChangeText={(v) => {
              setColor(v);
              if (errores.color) setErrores({ ...errores, color: undefined });
            }}
          />

          <Text style={[styles.label, { color: colores.verde }]}>Tipo de Vehículo</Text>
          <View style={styles.tiposContainer}>
            {tipos.map((tipo) => (
              <TouchableOpacity
                key={tipo.idTipoV}
                style={[
                  styles.tipoChip,
                  {
                    backgroundColor:
                      tipoSeleccionado === tipo.idTipoV
                        ? esOscuro ? 'rgba(95,217,36,0.20)' : colores.verdeMuyClaro
                        : esOscuro ? colores.glassFondo : '#f4f6f4',
                    borderColor: tipoSeleccionado === tipo.idTipoV ? colores.verde : colores.borde,
                  },
                ]}
                onPress={() => {
                  setTipoSeleccionado(tipo.idTipoV);
                  if (errores.tipo) setErrores({ ...errores, tipo: undefined });
                }}
              >
                <Text
                  style={[
                    styles.tipoChipTexto,
                    {
                      color: tipoSeleccionado === tipo.idTipoV ? colores.verde : colores.textoSecundario,
                      fontWeight: tipoSeleccionado === tipo.idTipoV ? 'bold' : '500',
                    },
                  ]}
                >
                  {tipo.tipoVehiculo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errores.tipo && <Text style={[styles.error, { color: colores.error }]}>{errores.tipo}</Text>}

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
  placaHelp: { fontSize: fonts.pequeno, fontStyle: 'italic' },
  label: {
    fontSize: fonts.normal, fontWeight: 'bold',
    marginBottom: espacios.pequeno, marginTop: espacios.normal,
  },
  fotoBox: {
    borderRadius: 12, height: 180, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, overflow: 'hidden', position: 'relative',
  },
  fotoImg: { width: '100%', height: '100%' },
  cambiarOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingVertical: 8, alignItems: 'center',
  },
  cambiarTexto: { color: '#ffffff', fontSize: fonts.pequeno, fontWeight: '700' },
  error: { fontSize: fonts.pequeno, marginTop: 4 },
  tiposContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tipoChip: {
    paddingHorizontal: espacios.normal, paddingVertical: 10,
    borderRadius: 20, borderWidth: 2,
  },
  tipoChipTexto: { fontSize: fonts.normal },
});