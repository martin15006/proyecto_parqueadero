import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import SuccessCheck from '../components/SuccessCheck';
import { vehiculoService } from '../services/vehiculoService';
import { subirImagen } from '../services/uploadService';
import { TipoVehiculo } from '../types/vehiculo';

export default function RegistrarVehiculoScreen({ navigation }: any) {
  const [placa, setPlaca] = useState('');
  const [color, setColor] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<number | null>(null);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [fotoVehiculo, setFotoVehiculo] = useState<string | null>(null);
  const [fotoTarjeta, setFotoTarjeta] = useState<string | null>(null);
  const [errores, setErrores] = useState<any>({});
  const [cargando, setCargando] = useState(false);
  const [mensajeCargando, setMensajeCargando] = useState('');
  const [exitoVisible, setExitoVisible] = useState(false);

  useEffect(() => {
    cargarTipos();
  }, []);

  const cargarTipos = async () => {
    try {
      const datos = await vehiculoService.listarTipos();
      setTipos(datos);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar los tipos de vehículo');
    }
  };

  const seleccionarFoto = async (cual: 'vehiculo' | 'tarjeta') => {
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
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.7,
          });

    if (!result.canceled && result.assets.length > 0) {
      if (cual === 'vehiculo') setFotoVehiculo(result.assets[0].uri);
      else setFotoTarjeta(result.assets[0].uri);
    }
  };

  const validar = (): boolean => {
    const e: any = {};
    if (!placa.trim()) e.placa = 'La placa es obligatoria';
    else if (placa.length < 5 || placa.length > 10) e.placa = 'Entre 5 y 10 caracteres';
    if (!color.trim()) e.color = 'El color es obligatorio';
    if (!tipoSeleccionado) e.tipo = 'Selecciona un tipo';
    if (!fotoVehiculo) e.fotoVehiculo = 'Foto del vehículo obligatoria';
    if (!fotoTarjeta) e.fotoTarjeta = 'Foto de la tarjeta obligatoria';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleRegistrar = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      setMensajeCargando('Subiendo fotos...');
      const urlVehiculo = await subirImagen(fotoVehiculo!);
      const urlTarjeta = await subirImagen(fotoTarjeta!);

      setMensajeCargando('Registrando...');
      await vehiculoService.registrar({
        placa: placa.toUpperCase().trim(),
        fotoVehiculo: urlVehiculo,
        fotoTarjetaP: urlTarjeta,
        color: color.trim(),
        idTipoVehiculo: tipoSeleccionado!,
      });

      setExitoVisible(true);
      setTimeout(() => {
        setExitoVisible(false);
        navigation.navigate('Vehiculos');
      }, 1800);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
      setMensajeCargando('');
    }
  };

  return (
    <View style={styles.container}>
      <SenaHeader
        titulo="Registrar Vehículo"
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
          <Text style={styles.label}>Foto del Vehículo</Text>
          <TouchableOpacity
            style={styles.fotoBox}
            onPress={() => seleccionarFoto('vehiculo')}
          >
            {fotoVehiculo ? (
              <Image source={{ uri: fotoVehiculo }} style={styles.fotoImg} />
            ) : (
              <Text style={styles.fotoPlaceholder}>📷 Toca para agregar</Text>
            )}
          </TouchableOpacity>
          {errores.fotoVehiculo && <Text style={styles.error}>{errores.fotoVehiculo}</Text>}

          <Text style={styles.label}>Foto Tarjeta de Propiedad</Text>
          <TouchableOpacity
            style={styles.fotoBox}
            onPress={() => seleccionarFoto('tarjeta')}
          >
            {fotoTarjeta ? (
              <Image source={{ uri: fotoTarjeta }} style={styles.fotoImg} />
            ) : (
              <Text style={styles.fotoPlaceholder}>📷 Toca para agregar</Text>
            )}
          </TouchableOpacity>
          {errores.fotoTarjeta && <Text style={styles.error}>{errores.fotoTarjeta}</Text>}

          <AnimatedInput
            label="Placa"
            placeholder="ABC123"
            autoCapitalize="characters"
            value={placa}
            error={errores.placa}
            onChangeText={(v) => {
              setPlaca(v.toUpperCase());
              if (errores.placa) setErrores({ ...errores, placa: undefined });
            }}
          />

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

          <Text style={styles.label}>Tipo de Vehículo</Text>
          <View style={styles.tiposContainer}>
            {tipos.map((tipo) => (
              <TouchableOpacity
                key={tipo.idTipoV}
                style={[
                  styles.tipoChip,
                  tipoSeleccionado === tipo.idTipoV && styles.tipoChipActivo,
                ]}
                onPress={() => {
                  setTipoSeleccionado(tipo.idTipoV);
                  if (errores.tipo) setErrores({ ...errores, tipo: undefined });
                }}
              >
                <Text
                  style={[
                    styles.tipoChipTexto,
                    tipoSeleccionado === tipo.idTipoV && styles.tipoChipTextoActivo,
                  ]}
                >
                  {tipo.tipoVehiculo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errores.tipo && <Text style={styles.error}>{errores.tipo}</Text>}

          <View style={{ marginTop: espacios.medio }}>
            <AnimatedButton
              texto="Registrar Vehículo"
              onPress={handleRegistrar}
              cargando={cargando}
              mensajeCargando={mensajeCargando}
            />
          </View>
        </FadeInView>
      </KeyboardAwareScrollView>

      <SuccessCheck visible={exitoVisible} mensaje="¡Vehículo registrado!" />
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
  label: {
    fontSize: fonts.normal,
    fontWeight: 'bold',
    color: colors.verde,
    marginBottom: espacios.pequeno,
    marginTop: espacios.normal,
  },
  fotoBox: {
    backgroundColor: colors.grisClaro,
    borderRadius: 12,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gris,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  fotoImg: { width: '100%', height: '100%' },
  fotoPlaceholder: { color: colors.gris, fontSize: fonts.medio },
  error: { color: colors.error, fontSize: fonts.pequeno, marginTop: 4 },
  tiposContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tipoChip: {
    paddingHorizontal: espacios.normal,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.grisClaro,
    borderWidth: 2,
    borderColor: colors.gris,
  },
  tipoChipActivo: {
    backgroundColor: colors.verdeMuyClaro,
    borderColor: colors.verde,
  },
  tipoChipTexto: { color: colors.grisOscuro, fontWeight: '500' },
  tipoChipTextoActivo: { color: colors.verde, fontWeight: 'bold' },
});