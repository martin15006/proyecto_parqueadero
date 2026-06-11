import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
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
import { TipoVehiculo } from '../types/vehiculo';

export default function RegistrarVehiculoScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const [placa, setPlaca] = useState('');
  const [color, setColor] = useState('');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<number | null>(null);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [errorTipos, setErrorTipos] = useState(false);
  const [fotoVehiculo, setFotoVehiculo] = useState<string | null>(null);
  const [fotoTarjeta, setFotoTarjeta] = useState<string | null>(null);
  const [fotoPlaca, setFotoPlaca] = useState<string | null>(null);
  const [errores, setErrores] = useState<any>({});
  const [cargando, setCargando] = useState(false);
  const [mensajeCargando, setMensajeCargando] = useState('');
  const [exitoVisible, setExitoVisible] = useState(false);

  useEffect(() => {
    cargarTipos();
  }, []);

  const cargarTipos = async () => {
    setCargandoTipos(true);
    setErrorTipos(false);
    try {
      const datos = await vehiculoService.listarTipos();
      console.log('Tipos recibidos:', datos);

      if (!datos || datos.length === 0) {
        setErrorTipos(true);
        Alert.alert(
          'Sin tipos',
          'No hay tipos de vehículo disponibles. Contacta al administrador.',
        );
      } else {
        setTipos(datos);
      }
    } catch (error: any) {
      console.log('Error al cargar tipos:', error);
      setErrorTipos(true);
      Alert.alert(
        'Error',
        `No se pudieron cargar los tipos de vehículo: ${error.message}`,
      );
    } finally {
      setCargandoTipos(false);
    }
  };

  const seleccionarFoto = async (cual: 'vehiculo' | 'tarjeta' | 'placa') => {
    Alert.alert('Foto', '¿De dónde tomar la foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cámara', onPress: () => abrir(cual, 'camara') },
      { text: 'Galería', onPress: () => abrir(cual, 'galeria') },
    ]);
  };

  const abrir = async (
    cual: 'vehiculo' | 'tarjeta' | 'placa',
    origen: 'camara' | 'galeria',
  ) => {
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
      else if (cual === 'tarjeta') setFotoTarjeta(result.assets[0].uri);
      else setFotoPlaca(result.assets[0].uri);
    }
  };

  const validar = (): boolean => {
    const e: any = {};
    if (!placa.trim()) e.placa = 'La placa es obligatoria';
    else if (placa.length < 5 || placa.length > 10)
      e.placa = 'Entre 5 y 10 caracteres';
    if (!color.trim()) e.color = 'El color es obligatorio';
    if (!tipoSeleccionado) e.tipo = 'Selecciona un tipo';
    if (!fotoVehiculo) e.fotoVehiculo = 'Foto del vehículo obligatoria';
    if (!fotoTarjeta) e.fotoTarjeta = 'Foto de la tarjeta obligatoria';
    if (!fotoPlaca) e.fotoPlaca = 'Foto de la placa obligatoria';
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
      const urlPlaca = await subirImagen(fotoPlaca!);

      setMensajeCargando('Enviando solicitud...');
      await vehiculoService.solicitarRegistro({
        placa: placa.toUpperCase().trim(),
        fotoVehiculo: urlVehiculo,
        fotoTarjetaP: urlTarjeta,
        fotoPlaca: urlPlaca,
        color: color.trim(),
        idTipoVehiculo: tipoSeleccionado!,
      });

      setExitoVisible(true);
      setTimeout(() => {
        setExitoVisible(false);
        Alert.alert(
          'Solicitud enviada',
          'Tu solicitud fue enviada al administrador. Recibirás una notificación cuando sea revisada.',
          [{ text: 'OK', onPress: () => navigation.navigate('Vehiculos') }],
        );
      }, 1500);
    } catch (error: any) {
      const msg = error?.message || 'No se pudo registrar el vehículo. Intenta de nuevo.';
      // Si el backend rechazó por el tope de vehículos, usamos un título claro.
      const esLimite = /m[áa]ximo|alcanzado/i.test(msg);
      Alert.alert(esLimite ? 'Límite alcanzado' : 'Error', msg);
    } finally {
      setCargando(false);
      setMensajeCargando('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader
        titulo="Registrar Vehículo"
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
          <Text style={[styles.label, { color: colores.verde }]}>
            Foto del Vehículo
          </Text>
          <TouchableOpacity
            style={[
              styles.fotoBox,
              {
                backgroundColor: esOscuro ? colores.glassFondo : '#f4f6f4',
                borderColor: esOscuro ? colores.borde : colores.gris,
              },
            ]}
            onPress={() => seleccionarFoto('vehiculo')}
          >
            {fotoVehiculo ? (
              <Image source={{ uri: fotoVehiculo }} style={styles.fotoImg} />
            ) : (
              <Text
                style={[styles.fotoPlaceholder, { color: colores.textoTenue }]}
              >
                Toca para agregar
              </Text>
            )}
          </TouchableOpacity>
          {errores.fotoVehiculo && (
            <Text style={[styles.error, { color: colores.error }]}>
              {errores.fotoVehiculo}
            </Text>
          )}

          <Text style={[styles.label, { color: colores.verde }]}>
            Foto Tarjeta de Propiedad
          </Text>
          <TouchableOpacity
            style={[
              styles.fotoBox,
              {
                backgroundColor: esOscuro ? colores.glassFondo : '#f4f6f4',
                borderColor: esOscuro ? colores.borde : colores.gris,
              },
            ]}
            onPress={() => seleccionarFoto('tarjeta')}
          >
            {fotoTarjeta ? (
              <Image source={{ uri: fotoTarjeta }} style={styles.fotoImg} />
            ) : (
              <Text
                style={[styles.fotoPlaceholder, { color: colores.textoTenue }]}
              >
                Toca para agregar
              </Text>
            )}
          </TouchableOpacity>
          {errores.fotoTarjeta && (
            <Text style={[styles.error, { color: colores.error }]}>
              {errores.fotoTarjeta}
            </Text>
          )}

          <Text style={[styles.label, { color: colores.verde }]}>
            Foto de la Placa
          </Text>
          <TouchableOpacity
            style={[
              styles.fotoBox,
              {
                backgroundColor: esOscuro ? colores.glassFondo : '#f4f6f4',
                borderColor: esOscuro ? colores.borde : colores.gris,
              },
            ]}
            onPress={() => seleccionarFoto('placa')}
          >
            {fotoPlaca ? (
              <Image source={{ uri: fotoPlaca }} style={styles.fotoImg} />
            ) : (
              <Text
                style={[styles.fotoPlaceholder, { color: colores.textoTenue }]}
              >
                Toca para agregar
              </Text>
            )}
          </TouchableOpacity>
          {errores.fotoPlaca && (
            <Text style={[styles.error, { color: colores.error }]}>
              {errores.fotoPlaca}
            </Text>
          )}

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

          <Text style={[styles.label, { color: colores.verde }]}>
            Tipo de Vehículo
          </Text>

          {/* ─── Lista de tipos con manejo de estados ─── */}
          {cargandoTipos ? (
            <View style={styles.tiposEstado}>
              <ActivityIndicator size="small" color={colores.verde} />
              <Text
                style={[styles.tiposEstadoTexto, { color: colores.textoTenue }]}
              >
                Cargando tipos...
              </Text>
            </View>
          ) : errorTipos || tipos.length === 0 ? (
            <View style={styles.tiposEstado}>
              <Text
                style={[styles.tiposEstadoTexto, { color: colores.error }]}
              >
                No hay tipos disponibles
              </Text>
              <TouchableOpacity onPress={cargarTipos} style={styles.botonReintentar}>
                <Text style={{ color: colores.verde, fontWeight: '700' }}>
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tiposContainer}>
              {tipos.map((tipo) => (
                <TouchableOpacity
                  key={tipo.idTipoV}
                  style={[
                    styles.tipoChip,
                    {
                      backgroundColor:
                        tipoSeleccionado === tipo.idTipoV
                          ? esOscuro
                            ? 'rgba(95,217,36,0.20)'
                            : colores.verdeMuyClaro
                          : esOscuro
                            ? colores.glassFondo
                            : '#f4f6f4',
                      borderColor:
                        tipoSeleccionado === tipo.idTipoV
                          ? colores.verde
                          : colores.borde,
                    },
                  ]}
                  onPress={() => {
                    setTipoSeleccionado(tipo.idTipoV);
                    if (errores.tipo)
                      setErrores({ ...errores, tipo: undefined });
                  }}
                >
                  <Text
                    style={[
                      styles.tipoChipTexto,
                      {
                        color:
                          tipoSeleccionado === tipo.idTipoV
                            ? colores.verde
                            : colores.textoSecundario,
                        fontWeight:
                          tipoSeleccionado === tipo.idTipoV ? 'bold' : '500',
                      },
                    ]}
                  >
                    {tipo.tipoVehiculo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {errores.tipo && (
            <Text style={[styles.error, { color: colores.error }]}>
              {errores.tipo}
            </Text>
          )}

          <View style={{ marginTop: espacios.medio }}>
            <View style={[styles.aviso, { backgroundColor: esOscuro ? 'rgba(255,193,7,0.10)' : '#FFF8E1', borderColor: '#FFC107' }]}>
              <Text style={[styles.avisoTexto, { color: esOscuro ? '#FFD54F' : '#856404' }]}>
                Tu solicitud será revisada por un administrador. El vehículo solo
                quedará registrado cuando sea aprobado.
              </Text>
            </View>
            <AnimatedButton
              texto="Enviar Solicitud"
              onPress={handleRegistrar}
              cargando={cargando}
              mensajeCargando={mensajeCargando}
            />
          </View>
        </FadeInView>
      </KeyboardAwareScrollView>

      <SuccessCheck visible={exitoVisible} mensaje="¡Solicitud enviada!" />
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
  label: {
    fontSize: fonts.normal,
    fontWeight: 'bold',
    marginBottom: espacios.pequeno,
    marginTop: espacios.normal,
  },
  fotoBox: {
    borderRadius: 12,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  fotoImg: { width: '100%', height: '100%' },
  fotoPlaceholder: { fontSize: fonts.medio },
  error: { fontSize: fonts.pequeno, marginTop: 4 },
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
    borderWidth: 2,
  },
  tipoChipTexto: { fontSize: fonts.normal },
  tiposEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacios.normal,
    gap: 8,
  },
  tiposEstadoTexto: {
    fontSize: fonts.normal,
    fontStyle: 'italic',
  },
  botonReintentar: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  aviso: {
    borderRadius: 12,
    padding: espacios.normal,
    borderWidth: 1,
    marginBottom: espacios.normal,
  },
  avisoTexto: {
    fontSize: fonts.pequeno,
    lineHeight: 18,
  },
});