import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import FadeInView from '../components/FadeInView';
import { vehiculoService } from '../services/vehiculoService';
import { SolicitudVehiculo, EstadoSolicitud } from '../types/vehiculo';

const colorEstado = (estado: EstadoSolicitud) => {
  switch (estado) {
    case 'PENDIENTE': return '#FFC107';
    case 'APROBADO':  return '#39A900';
    case 'RECHAZADO': return '#E53935';
    default:          return '#999';
  }
};

const iconoEstado = (estado: EstadoSolicitud) => {
  switch (estado) {
    case 'PENDIENTE': return '⏳';
    case 'APROBADO':  return '✓';
    case 'RECHAZADO': return '✕';
  }
};

export default function MisSolicitudesScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const [solicitudes, setSolicitudes] = useState<SolicitudVehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = async () => {
    try {
      const datos = await vehiculoService.listarMisSolicitudes();
      setSolicitudes(datos);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const renderItem = ({ item, index }: { item: SolicitudVehiculo; index: number }) => {
    const color = colorEstado(item.estado);
    return (
      <FadeInView delay={index * 80}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
              borderColor: color,
            },
          ]}
        >
          <Image source={{ uri: item.fotoVehiculo }} style={styles.imagen} />
          <View style={styles.contenido}>
            <View style={styles.cabeceraFila}>
              <Text style={[styles.placa, { color: colores.textoPrimario }]}>{item.placa}</Text>
              <View style={[styles.estadoChip, { backgroundColor: color }]}>
                <Text style={styles.estadoTexto}>
                  {iconoEstado(item.estado)} {item.estado}
                </Text>
              </View>
            </View>
            <Text style={[styles.color, { color: colores.textoSecundario }]}>🎨 {item.color}</Text>
            <Text style={[styles.fecha, { color: colores.textoTenue }]}>
              📅 {new Date(item.creadoEn).toLocaleDateString()}
            </Text>
            {item.estado === 'RECHAZADO' && item.motivoRechazo ? (
              <View style={[styles.motivoBox, { backgroundColor: 'rgba(229,57,53,0.10)' }]}>
                <Text style={[styles.motivoTitulo, { color: '#E53935' }]}>Motivo del rechazo:</Text>
                <Text style={[styles.motivoTexto, { color: colores.textoPrimario }]}>
                  {item.motivoRechazo}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </FadeInView>
    );
  };

  if (cargando) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <SenaHeader titulo="Mis Solicitudes" mostrarVolver onBackPress={() => navigation.goBack()} />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colores.verde} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader titulo="Mis Solicitudes" mostrarVolver onBackPress={() => navigation.goBack()} />
      <FlatList
        data={solicitudes}
        keyExtractor={(item) => String(item.idSolicitud)}
        renderItem={renderItem}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => { setRefrescando(true); cargar(); }}
            colors={[colores.verde]}
            tintColor={colores.verde}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.emoji}>📋</Text>
            <Text style={[styles.vacioTitulo, { color: colores.textoPrimario }]}>
              No tienes solicitudes
            </Text>
            <Text style={[styles.vacioSub, { color: colores.textoSecundario }]}>
              Tus solicitudes de registro aparecerán aquí
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { padding: espacios.medio, paddingBottom: espacios.grande },
  card: {
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: espacios.normal,
    borderLeftWidth: 5,
    borderWidth: 1,
    elevation: 3,
  },
  imagen: { width: 110, height: '100%', minHeight: 110 },
  contenido: { flex: 1, padding: espacios.normal },
  cabeceraFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  placa: { fontSize: fonts.grande, fontWeight: '800', letterSpacing: 1.5 },
  estadoChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  estadoTexto: { color: '#fff', fontWeight: '700', fontSize: fonts.pequeno },
  color: { fontSize: fonts.normal, marginTop: 4 },
  fecha: { fontSize: fonts.pequeno, marginTop: 2 },
  motivoBox: { marginTop: 8, padding: 8, borderRadius: 8 },
  motivoTitulo: { fontSize: fonts.pequeno, fontWeight: '700' },
  motivoTexto: { fontSize: fonts.pequeno, marginTop: 2 },
  vacio: { alignItems: 'center', paddingVertical: 80 },
  emoji: { fontSize: 70, marginBottom: 16 },
  vacioTitulo: { fontSize: fonts.medio, fontWeight: 'bold' },
  vacioSub: { fontSize: fonts.normal, marginTop: 4 },
});
