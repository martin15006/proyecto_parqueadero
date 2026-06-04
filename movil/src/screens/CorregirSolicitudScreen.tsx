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
import { SolicitudVehiculo, TipoVehiculo, CorregirSolicitudDto } from '../types/vehiculo';

const CAMPO_LABELS: Record<string, string> = {
  placa: 'Placa',
  color: 'Color',
  idTipoVehiculo: 'Tipo de vehículo',
  fotoVehiculo: 'Foto del vehículo',
  fotoTarjetaP: 'Foto tarjeta de propiedad',
  fotoPlaca: 'Foto de la placa',
};

const esImagenRemota = (uri: string | null) =>
  !!uri && /^https?:\/\//i.test(uri);

export default function CorregirSolicitudScreen({ navigation, route }: any) {
  const { colores, esOscuro } = useTheme();
  const solicitud: SolicitudVehiculo = route.params?.solicitud;
  const campos: string[] = Array.isArray(solicitud?.camposRechazados)
    ? solicitud.camposRechazados
    : [];

  const debeCorregir = (campo: string) => campos.includes(campo);

  // Valores pre-cargados con la solicitud original
  const [placa, setPlaca] = useState(solicitud?.placa ?? '');
  const [color, setColor] = useState(solicitud?.color ?? '');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<number | null>(
    solicitud?.idTipoVehiculo ?? null,
  );
  const [fotoVehiculo, setFotoVehiculo] = useState<string | null>(solicitud?.fotoVehiculo ?? null);
  const [fotoTarjeta, setFotoTarjeta] = useState<string | null>(solicitud?.fotoTarjetaP ?? null);
  const [fotoPlaca, setFotoPlaca] = useState<string | null>(solicitud?.fotoPlaca ?? null);

  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(false);
  const [errores, setErrores] = useState<any>({});
  const [cargando, setCargando] = useState(false);
  const [mensajeCargando, setMensajeCargando] = useState('');
  const [exitoVisible, setExitoVisible] = useState(false);

  useEffect(() => {
    if (debeCorregir('idTipoVehiculo')) cargarTipos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarTipos = async () => {
    setCargandoTipos(true);
    try {
      const datos = await vehiculoService.listarTipos();
      setTipos(datos ?? []);
    } catch (error: any) {
      Alert.alert('Error', `No se pudieron cargar los tipos: ${error.message}`);
    } finally {
      setCargandoTipos(false);
    }
  };

  const seleccionarFoto = (cual: 'vehiculo' | 'tarjeta' | 'placa') => {
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
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });

    if (!result.canceled && result.assets.length > 0) {
      if (cual === 'vehiculo') setFotoVehiculo(result.assets[0].uri);
      else if (cual === 'tarjeta') setFotoTarjeta(result.assets[0].uri);
      else setFotoPlaca(result.assets[0].uri);
    }
  };

  const validar = (): boolean => {
    const e: any = {};
    if (debeCorregir('placa')) {
      if (!placa.trim()) e.placa = 'La placa es obligatoria';
      else if (placa.length < 5 || placa.length > 10) e.placa = 'Entre 5 y 10 caracteres';
    }
    if (debeCorregir('color') && !color.trim()) e.color = 'El color es obligatorio';
    if (debeCorregir('idTipoVehiculo') && !tipoSeleccionado) e.tipo = 'Selecciona un tipo';
    // Para fotos marcadas, exigimos que el usuario tome una NUEVA imagen (local).
    if (debeCorregir('fotoVehiculo') && esImagenRemota(fotoVehiculo))
      e.fotoVehiculo = 'Toma una nueva foto del vehículo';
    if (debeCorregir('fotoTarjetaP') && esImagenRemota(fotoTarjeta))
      e.fotoTarjeta = 'Toma una nueva foto de la tarjeta';
    if (debeCorregir('fotoPlaca') && esImagenRemota(fotoPlaca))
      e.fotoPlaca = 'Toma una nueva foto de la placa';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleCorregir = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      const payload: CorregirSolicitudDto = {};

      if (debeCorregir('placa')) payload.placa = placa.toUpperCase().trim();
      if (debeCorregir('color')) payload.color = color.trim();
      if (debeCorregir('idTipoVehiculo')) payload.idTipoVehiculo = tipoSeleccionado!;

      if (debeCorregir('fotoVehiculo') && fotoVehiculo && !esImagenRemota(fotoVehiculo)) {
        setMensajeCargando('Subiendo foto del vehículo...');
        payload.fotoVehiculo = await subirImagen(fotoVehiculo);
      }
      if (debeCorregir('fotoTarjetaP') && fotoTarjeta && !esImagenRemota(fotoTarjeta)) {
        setMensajeCargando('Subiendo foto de la tarjeta...');
        payload.fotoTarjetaP = await subirImagen(fotoTarjeta);
      }
      if (debeCorregir('fotoPlaca') && fotoPlaca && !esImagenRemota(fotoPlaca)) {
        setMensajeCargando('Subiendo foto de la placa...');
        payload.fotoPlaca = await subirImagen(fotoPlaca);
      }

      setMensajeCargando('Reenviando solicitud...');
      await vehiculoService.corregirSolicitud(solicitud.idSolicitud, payload);

      setExitoVisible(true);
      setTimeout(() => {
        setExitoVisible(false);
        Alert.alert(
          'Solicitud reenviada',
          'Corregiste los datos marcados. Tu solicitud volvió a revisión.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }, 1500);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
      setMensajeCargando('');
    }
  };

  const renderFotoBox = (
    uri: string | null,
    onPress: () => void,
    errorMsg?: string,
  ) => (
    <>
      <TouchableOpacity
        style={[
          styles.fotoBox,
          {
            backgroundColor: esOscuro ? colores.glassFondo : '#f4f6f4',
            borderColor: esOscuro ? colores.borde : colores.gris,
          },
        ]}
        onPress={onPress}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.fotoImg} />
        ) : (
          <Text style={[styles.fotoPlaceholder, { color: colores.textoTenue }]}>
            📷 Toca para agregar
          </Text>
        )}
      </TouchableOpacity>
      {errorMsg && <Text style={[styles.error, { color: colores.error }]}>{errorMsg}</Text>}
    </>
  );

  if (!solicitud) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <SenaHeader titulo="Corregir Solicitud" mostrarVolver onBackPress={() => navigation.goBack()} />
        <View style={styles.centrado}>
          <Text style={{ color: colores.textoSecundario }}>Solicitud no disponible.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader
        titulo="Corregir Solicitud"
        mostrarVolver
        onBackPress={() => navigation.goBack()}
      />

      {esOscuro && <View style={styles.auroraTop} />}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
      >
        <FadeInView>
          <View style={[styles.aviso, { backgroundColor: esOscuro ? 'rgba(229,57,53,0.10)' : '#FFEBEE', borderColor: '#E53935' }]}>
            <Text style={[styles.avisoTitulo, { color: '#E53935' }]}>
              El administrador pidió corregir:
            </Text>
            <Text style={[styles.avisoTexto, { color: esOscuro ? '#FFCDD2' : '#B71C1C' }]}>
              {campos.map((c) => `• ${CAMPO_LABELS[c] ?? c}`).join('\n')}
            </Text>
            {solicitud.motivoRechazo ? (
              <Text style={[styles.avisoMotivo, { color: esOscuro ? '#FFCDD2' : '#B71C1C' }]}>
                “{solicitud.motivoRechazo}”
              </Text>
            ) : null}
          </View>

          {debeCorregir('fotoVehiculo') && (
            <>
              <Text style={[styles.label, { color: colores.verde }]}>Foto del Vehículo</Text>
              {renderFotoBox(fotoVehiculo, () => seleccionarFoto('vehiculo'), errores.fotoVehiculo)}
            </>
          )}

          {debeCorregir('fotoTarjetaP') && (
            <>
              <Text style={[styles.label, { color: colores.verde }]}>Foto Tarjeta de Propiedad</Text>
              {renderFotoBox(fotoTarjeta, () => seleccionarFoto('tarjeta'), errores.fotoTarjeta)}
            </>
          )}

          {debeCorregir('fotoPlaca') && (
            <>
              <Text style={[styles.label, { color: colores.verde }]}>Foto de la Placa</Text>
              {renderFotoBox(fotoPlaca, () => seleccionarFoto('placa'), errores.fotoPlaca)}
            </>
          )}

          {debeCorregir('placa') && (
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
          )}

          {debeCorregir('color') && (
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
          )}

          {debeCorregir('idTipoVehiculo') && (
            <>
              <Text style={[styles.label, { color: colores.verde }]}>Tipo de Vehículo</Text>
              {cargandoTipos ? (
                <View style={styles.tiposEstado}>
                  <ActivityIndicator size="small" color={colores.verde} />
                  <Text style={[styles.tiposEstadoTexto, { color: colores.textoTenue }]}>
                    Cargando tipos...
                  </Text>
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
                            tipoSeleccionado === tipo.idTipoV ? colores.verde : colores.borde,
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
                            color:
                              tipoSeleccionado === tipo.idTipoV
                                ? colores.verde
                                : colores.textoSecundario,
                            fontWeight: tipoSeleccionado === tipo.idTipoV ? 'bold' : '500',
                          },
                        ]}
                      >
                        {tipo.tipoVehiculo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {errores.tipo && <Text style={[styles.error, { color: colores.error }]}>{errores.tipo}</Text>}
            </>
          )}

          <View style={{ marginTop: espacios.medio }}>
            <AnimatedButton
              texto="Reenviar Solicitud"
              onPress={handleCorregir}
              cargando={cargando}
              mensajeCargando={mensajeCargando}
            />
          </View>
        </FadeInView>
      </KeyboardAwareScrollView>

      <SuccessCheck visible={exitoVisible} mensaje="¡Solicitud reenviada!" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  auroraTop: {
    position: 'absolute',
    top: 100,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(57,169,0,0.15)',
  },
  scroll: { padding: espacios.grande, paddingBottom: espacios.grande * 2, flexGrow: 1 },
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
  tiposContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
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
  tiposEstadoTexto: { fontSize: fonts.normal, fontStyle: 'italic' },
  aviso: {
    borderRadius: 12,
    padding: espacios.normal,
    borderWidth: 1,
    marginBottom: espacios.normal,
  },
  avisoTitulo: { fontSize: fonts.normal, fontWeight: 'bold', marginBottom: 6 },
  avisoTexto: { fontSize: fonts.normal, lineHeight: 22 },
  avisoMotivo: { fontSize: fonts.pequeno, fontStyle: 'italic', marginTop: 8 },
});
