import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedInput from '../components/AnimatedInput';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import { vehiculoService } from '../services/vehiculoService';
import { InfoCompartido } from '../types/vehiculo';

export default function CompartirVehiculoScreen({ route, navigation }: any) {
  const { placa } = route.params;
  const { colores, esOscuro } = useTheme();

  const [info, setInfo] = useState<InfoCompartido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [documento, setDocumento] = useState('');
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      const datos = await vehiculoService.obtenerInfoCompartido(placa);
      setInfo(datos);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setCargando(false);
    }
  };

  const handleCompartir = async () => {
    if (!documento.trim()) {
      setError('Ingresa el documento del usuario');
      return;
    }
    if (!/^[0-9]{6,10}$/.test(documento.trim())) {
      setError('Documento inválido (6-10 dígitos)');
      return;
    }

    setProcesando(true);
    setError('');
    try {
      const res = await vehiculoService.compartirConUsuario(placa, documento.trim());
      Alert.alert('Compartido', res.mensaje, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleQuitar = () => {
    Alert.alert(
      'Quitar compartido',
      '¿Estás seguro de dejar de compartir este vehículo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, quitar',
          style: 'destructive',
          onPress: async () => {
            setProcesando(true);
            try {
              await vehiculoService.quitarCompartido(placa);
              Alert.alert('Listo', 'Compartido eliminado', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setProcesando(false);
            }
          },
        },
      ],
    );
  };

  if (cargando) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <SenaHeader titulo="Compartir" mostrarVolver onBackPress={() => navigation.goBack()} />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colores.verde} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader titulo="Compartir Vehículo" mostrarVolver onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FadeInView>
          <View style={[styles.placaBox, { borderColor: colores.verde, backgroundColor: esOscuro ? colores.glassFondo : colores.superficie }]}>
            <Text style={[styles.placaLabel, { color: colores.textoTenue }]}>PLACA</Text>
            <Text style={[styles.placaValor, { color: colores.textoPrimario }]}>{placa}</Text>
          </View>

          {info?.compartido && info.receptor ? (
            // ─── Vehículo YA compartido ──────────────────────────────
            <FadeInView delay={150}>
              <View style={[styles.estadoBox, { backgroundColor: esOscuro ? 'rgba(95,217,36,0.10)' : colores.verdeMuyClaro, borderColor: colores.verde }]}>
                <Text style={[styles.estadoTitulo, { color: colores.verde }]}>✓ Este vehículo está compartido</Text>
                <View style={styles.fila}>
                  <Text style={[styles.etiqueta, { color: colores.textoSecundario }]}>Compartido con:</Text>
                  <Text style={[styles.valor, { color: colores.textoPrimario }]}>{info.receptor.nombre}</Text>
                </View>
                <View style={styles.fila}>
                  <Text style={[styles.etiqueta, { color: colores.textoSecundario }]}>Documento:</Text>
                  <Text style={[styles.valor, { color: colores.textoPrimario }]}>{info.receptor.documento}</Text>
                </View>
                <View style={styles.fila}>
                  <Text style={[styles.etiqueta, { color: colores.textoSecundario }]}>Desde:</Text>
                  <Text style={[styles.valor, { color: colores.textoPrimario }]}>
                    {new Date(info.receptor.compartidoDesde).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <AnimatedButton
                texto="Dejar de compartir"
                variante="peligro"
                onPress={handleQuitar}
                cargando={procesando}
              />
            </FadeInView>
          ) : (
            // ─── Compartir vehículo (formulario) ──────────────────────
            <FadeInView delay={150}>
              <View style={[styles.aviso, { backgroundColor: esOscuro ? 'rgba(33,150,243,0.10)' : '#E3F2FD', borderColor: '#2196F3' }]}>
                <Text style={[styles.avisoTexto, { color: esOscuro ? '#90CAF9' : '#0D47A1' }]}>
                  ℹ Ingresa el documento de la persona con quien quieres compartir
                  este vehículo. Una vez compartido, esa persona podrá ingresar al
                  parqueadero con este vehículo.{'\n\n'}
                  Reglas:{'\n'}
                  • Solo puedes compartir cada vehículo una vez.{'\n'}
                  • Un usuario puede recibir máximo 2 vehículos compartidos.
                </Text>
              </View>

              <AnimatedInput
                label="Documento del usuario"
                placeholder="Ej: 1234567890"
                keyboardType="numeric"
                maxLength={10}
                value={documento}
                error={error}
                onChangeText={(v) => {
                  setDocumento(v.replace(/[^0-9]/g, ''));
                  if (error) setError('');
                }}
              />

              <AnimatedButton
                texto="Compartir Vehículo"
                onPress={handleCompartir}
                cargando={procesando}
                mensajeCargando="Compartiendo..."
              />
            </FadeInView>
          )}
        </FadeInView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: espacios.medio, paddingBottom: espacios.grande * 2 },
  placaBox: {
    borderRadius: 16,
    borderWidth: 2,
    padding: espacios.medio,
    alignItems: 'center',
    marginBottom: espacios.medio,
  },
  placaLabel: { fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 1.5 },
  placaValor: { fontSize: 36, fontWeight: '900', letterSpacing: 4, marginTop: 4 },
  aviso: {
    borderRadius: 12,
    padding: espacios.medio,
    borderWidth: 1,
    marginBottom: espacios.medio,
  },
  avisoTexto: { fontSize: fonts.pequeno, lineHeight: 18 },
  estadoBox: {
    borderRadius: 12,
    padding: espacios.medio,
    borderWidth: 1,
    marginBottom: espacios.medio,
  },
  estadoTitulo: { fontSize: fonts.medio, fontWeight: '800', marginBottom: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  etiqueta: { fontSize: fonts.normal },
  valor: { fontSize: fonts.normal, fontWeight: '600' },
});
