import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, Alert, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import { vehiculoService } from '../services/vehiculoService';
import { VehiculoUsuario } from '../types/vehiculo';

export default function DetalleVehiculoScreen({ navigation, route }: any) {
  const { colores, esOscuro } = useTheme();
  const { placa } = route.params;

  const [vehiculo, setVehiculo] = useState<VehiculoUsuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      const datos = await vehiculoService.obtenerDetalle(placa);
      setVehiculo(datos);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = () => {
    Alert.alert(
      'Eliminar vehículo',
      `¿Estás seguro de quitar el vehículo ${placa} de tu lista?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehiculoService.eliminar(placa);
              Alert.alert('Eliminado', 'Vehículo eliminado correctamente');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ],
    );
  };

  if (cargando) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <SenaHeader
          titulo="Detalle"
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
        titulo="Detalle del Vehículo"
        mostrarVolver
        onBackPress={() => navigation.goBack()}
      />
      {esOscuro && (
        <>
          <View style={styles.auroraTop} />
          <View style={styles.auroraBottom} />
        </>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <FadeInView>
          {/* Placa destacada */}
          <View
            style={[
              styles.placaCard,
              {
                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                borderColor: colores.verde,
              },
            ]}
          >
            <Text style={[styles.placaLabel, { color: colores.textoTenue }]}>PLACA</Text>
            <Text style={[styles.placaValor, { color: colores.textoPrimario }]}>
              {vehiculo.placa}
            </Text>
            <View style={styles.placaInfo}>
              <View
                style={[
                  styles.tipoChip,
                  {
                    backgroundColor: esOscuro
                      ? 'rgba(95,217,36,0.15)'
                      : colores.verdeMuyClaro,
                    borderColor: colores.verde,
                  },
                ]}
              >
                <Text style={[styles.tipoTexto, { color: colores.verde }]}>
                  {vehiculo.tipoVehiculo}
                </Text>
              </View>
              <Text style={[styles.colorTexto, { color: colores.textoSecundario }]}>
                🎨 {vehiculo.color}
              </Text>
            </View>
          </View>

          {/* Foto del vehículo */}
          <Text style={[styles.seccion, { color: colores.textoTenue }]}>
            FOTO DEL VEHÍCULO
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setFotoAmpliada(vehiculo.fotoVehiculo)}
          >
            <Image
              source={{ uri: vehiculo.fotoVehiculo }}
              style={[styles.foto, { borderColor: colores.borde }]}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Foto de la tarjeta */}
          <Text style={[styles.seccion, { color: colores.textoTenue, marginTop: espacios.medio }]}>
            TARJETA DE PROPIEDAD
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setFotoAmpliada(vehiculo.fotoTarjetaP)}
          >
            <Image
              source={{ uri: vehiculo.fotoTarjetaP }}
              style={[styles.foto, { borderColor: colores.borde }]}
              resizeMode="cover"
            />
          </TouchableOpacity>

          {/* Foto de la placa */}
          <Text style={[styles.seccion, { color: colores.textoTenue, marginTop: espacios.medio }]}>
            FOTO DE LA PLACA
          </Text>
          {(vehiculo.fotoPlaca && vehiculo.fotoPlaca.trim() !== '') ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setFotoAmpliada(vehiculo.fotoPlaca!)}
            >
              <Image
                source={{ uri: vehiculo.fotoPlaca }}
                style={[styles.foto, { borderColor: colores.borde }]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <View style={[styles.fotoPlaceholder, { borderColor: colores.borde, backgroundColor: esOscuro ? colores.glassFondo : '#f1f5f9' }]}>
              <Text style={{ color: colores.textoTenue, fontSize: fonts.pequeno }}>
                Foto no disponible
              </Text>
            </View>
          )}

          <Text style={[styles.tip, { color: colores.textoTenue }]}>
            💡 Toca las fotos para verlas en grande
          </Text>

          {/* Botones de acción */}
          <View style={{ marginTop: espacios.grande, gap: espacios.normal }}>
            <AnimatedButton
              texto="Editar Vehículo"
              onPress={() =>
                navigation.navigate('EditarVehiculo', { placa: vehiculo.placa })
              }
            />
            <AnimatedButton
              texto="Eliminar Vehículo"
              variante="peligro"
              onPress={handleEliminar}
            />
          </View>
        </FadeInView>
      </ScrollView>

      {/* Modal de foto ampliada */}
      {fotoAmpliada && (
        <TouchableOpacity
          style={styles.modalFoto}
          activeOpacity={1}
          onPress={() => setFotoAmpliada(null)}
        >
          <Image
            source={{ uri: fotoAmpliada }}
            style={styles.fotoAmpliada}
            resizeMode="contain"
          />
          <Text style={styles.cerrarHint}>Toca para cerrar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  auroraTop: {
    position: 'absolute', top: 100, right: -80, width: 250, height: 250,
    borderRadius: 125, backgroundColor: 'rgba(57,169,0,0.15)',
  },
  auroraBottom: {
    position: 'absolute', bottom: -80, left: -60, width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(0,120,50,0.12)',
  },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: espacios.medio, paddingBottom: espacios.grande * 2 },
  placaCard: {
    borderRadius: 20, padding: espacios.medio, borderWidth: 2,
    alignItems: 'center', marginBottom: espacios.medio,
  },
  placaLabel: {
    fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 1.5,
  },
  placaValor: {
    fontSize: 42, fontWeight: '900', letterSpacing: 4, marginVertical: 4,
  },
  placaInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipoChip: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, borderWidth: 1,
  },
  tipoTexto: { fontSize: fonts.pequeno, fontWeight: '700' },
  colorTexto: { fontSize: fonts.normal, fontWeight: '600' },
  seccion: {
    fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: espacios.pequeno,
  },
  foto: {
    width: '100%', height: 220, borderRadius: 16, borderWidth: 1,
  },
  fotoPlaceholder: {
    width: '100%', height: 100, borderRadius: 16, borderWidth: 1,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  tip: {
    fontSize: fonts.pequeno, textAlign: 'center', marginTop: espacios.normal,
    fontStyle: 'italic',
  },
  modalFoto: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center', zIndex: 99,
  },
  fotoAmpliada: { width: '95%', height: '80%' },
  cerrarHint: { color: '#ffffff', marginTop: 20, fontSize: fonts.normal },
});