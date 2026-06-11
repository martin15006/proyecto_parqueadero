import React, { useState, useCallback } from 'react';
import { Car, ClipboardList } from 'lucide-react-native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import { vehiculoService } from '../services/vehiculoService';
import { VehiculoUsuario, SolicitudVehiculo } from '../types/vehiculo';

const MAX_VEHICULOS = 3;

export default function VehiculosScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const [vehiculos, setVehiculos] = useState<VehiculoUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [pendientes, setPendientes] = useState(0);

  const cargar = async () => {
    try {
      const [datos, solicitudes] = await Promise.all([
        vehiculoService.listarMios(),
        vehiculoService.listarMisSolicitudes().catch((): SolicitudVehiculo[] => []),
      ]);
      setVehiculos(datos);
      setPendientes(solicitudes.filter((s) => s.estado === 'PENDIENTE').length);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  // Verificación proactiva: avisamos del límite ANTES de abrir el formulario.
  const irARegistrar = () => {
    if (vehiculos.length + pendientes >= MAX_VEHICULOS) {
      Alert.alert(
        'Límite alcanzado',
        `Has alcanzado el máximo de ${MAX_VEHICULOS} vehículos registrados. Elimina uno para poder registrar otro.`,
      );
      return;
    }
    navigation.navigate('RegistrarVehiculo');
  };

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, []),
  );

  const renderItem = ({ item, index }: { item: VehiculoUsuario; index: number }) => (
    <FadeInView delay={index * 100}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DetalleVehiculo', { placa: item.placa })}
        style={[
          styles.card,
          {
            backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
            borderColor: esOscuro ? 'rgba(95,217,36,0.20)' : colores.borde,
          },
        ]}
      >
        <Image
          source={{ uri: item.fotoVehiculo }}
          style={styles.imagen}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <Text style={[styles.placa, { color: colores.textoPrimario }]}>{item.placa}</Text>
          <View
            style={[
              styles.tipoChip,
              {
                backgroundColor: esOscuro
                  ? 'rgba(95,217,36,0.15)'
                  : colores.verdeMuyClaro,
                borderColor: esOscuro
                  ? 'rgba(95,217,36,0.30)'
                  : 'transparent',
              },
            ]}
          >
            <View style={[styles.tipoDot, { backgroundColor: colores.verde }]} />
            <Text style={[styles.tipoTexto, { color: colores.verde }]}>
              {item.tipoVehiculo}
            </Text>
          </View>
          <Text style={[styles.color, { color: colores.textoSecundario }]}>
            {item.color}
          </Text>
          <Text style={[styles.verDetalle, { color: colores.textoTenue }]}>
            Toca para ver detalles ›
          </Text>
        </View>
      </TouchableOpacity>
    </FadeInView>
  );

  if (cargando) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <SenaHeader
          titulo="Mis Vehículos"
          onMenuPress={() => navigation.openDrawer()}
        />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colores.verde} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader
        titulo="Mis Vehículos"
        onMenuPress={() => navigation.openDrawer()}
      />

      {esOscuro && (
        <>
          <View style={styles.auroraTop} />
          <View style={styles.auroraBottom} />
        </>
      )}

      <FlatList
        data={vehiculos}
        keyExtractor={(item) => item.placa}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              cargar();
            }}
            colors={[colores.verde]}
            tintColor={colores.verde}
          />
        }
        ListHeaderComponent={
          <TouchableOpacity
            style={[styles.banner, { borderColor: colores.verde, backgroundColor: esOscuro ? 'rgba(95,217,36,0.10)' : colores.verdeMuyClaro }]}
            onPress={() => navigation.navigate('MisSolicitudes')}
            activeOpacity={0.7}
          >
            <ClipboardList size={22} color="#39A900" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitulo, { color: colores.verde }]}>
                Ver mis solicitudes
              </Text>
              <Text style={[styles.bannerSub, { color: colores.textoSecundario }]}>
                Revisa el estado de tus solicitudes de registro
              </Text>
            </View>
            <Text style={[styles.bannerFlecha, { color: colores.verde }]}>›</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.vacioContainer}>
            <Car size={56} color="#9CA3AF" />
            <Text style={[styles.vacioTitulo, { color: colores.textoPrimario }]}>
              Sin vehículos registrados
            </Text>
            <Text style={[styles.vacioSubtitulo, { color: colores.textoSecundario }]}>
              Solicita el registro de tu primer vehículo
            </Text>
          </View>
        }
      />

      <View style={styles.fab}>
        <AnimatedButton
          texto="+ Solicitar Registro de Vehículo"
          onPress={irARegistrar}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  auroraTop: {
    position: 'absolute',
    top: 100,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(57,169,0,0.15)',
  },
  auroraBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,120,50,0.12)',
  },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { padding: espacios.medio, paddingBottom: 120 },
  card: {
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: espacios.normal,
    elevation: 3,
    borderWidth: 1,
  },
  imagen: { width: 130, height: 150 },
  cardContent: {
    flex: 1,
    padding: espacios.normal,
    justifyContent: 'space-between',
  },
  placa: {
    fontSize: fonts.grande,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  tipoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  tipoDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  tipoTexto: { fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 0.3 },
  color: { fontSize: fonts.normal },
  verDetalle: { fontSize: fonts.pequeno, fontStyle: 'italic', marginTop: 4 },
  vacioContainer: { alignItems: 'center', paddingVertical: 80 },
  vacioEmoji: { fontSize: 70, marginBottom: espacios.normal },
  vacioTitulo: { fontSize: fonts.medio, fontWeight: 'bold' },
  vacioSubtitulo: { fontSize: fonts.normal, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: espacios.medio,
    left: espacios.medio,
    right: espacios.medio,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: espacios.normal,
    borderWidth: 1,
    marginBottom: espacios.normal,
    gap: 12,
  },
  bannerEmoji: { fontSize: 24 },
  bannerTitulo: { fontSize: fonts.normal, fontWeight: '700' },
  bannerSub: { fontSize: fonts.pequeno, marginTop: 2 },
  bannerFlecha: { fontSize: 28, fontWeight: '300' },
});