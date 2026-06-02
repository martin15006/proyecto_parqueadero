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
import { VehiculoCompartido } from '../types/vehiculo';

export default function VehiculosCompartidosScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const [vehiculos, setVehiculos] = useState<VehiculoCompartido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = async () => {
    try {
      const datos = await vehiculoService.listarCompartidosConmigo();
      setVehiculos(datos);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const renderItem = ({ item, index }: { item: VehiculoCompartido; index: number }) => (
    <FadeInView delay={index * 100}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
            borderColor: esOscuro ? 'rgba(95,217,36,0.20)' : colores.borde,
          },
        ]}
      >
        <Image source={{ uri: item.fotoVehiculo }} style={styles.imagen} />
        <View style={styles.contenido}>
          <Text style={[styles.placa, { color: colores.textoPrimario }]}>{item.placa}</Text>
          <View
            style={[
              styles.chip,
              {
                backgroundColor: esOscuro ? 'rgba(95,217,36,0.15)' : colores.verdeMuyClaro,
                borderColor: 'rgba(95,217,36,0.30)',
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: colores.verde }]} />
            <Text style={[styles.chipTexto, { color: colores.verde }]}>
              {item.tipoVehiculo}
            </Text>
          </View>
          <Text style={[styles.linea, { color: colores.textoSecundario }]}>🎨 {item.color}</Text>
          <Text style={[styles.linea, { color: colores.textoSecundario }]}>
            👤 Propietario: {item.propietario}
          </Text>
          <Text style={[styles.fecha, { color: colores.textoTenue }]}>
            Compartido el {new Date(item.compartidoDesde).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </FadeInView>
  );

  if (cargando) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <SenaHeader titulo="Compartidos Conmigo" onMenuPress={() => navigation.openDrawer()} />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colores.verde} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader titulo="Compartidos Conmigo" onMenuPress={() => navigation.openDrawer()} />
      <FlatList
        data={vehiculos}
        keyExtractor={(item) => String(item.idCompartir)}
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
        ListHeaderComponent={
          <View style={[styles.banner, { backgroundColor: esOscuro ? 'rgba(95,217,36,0.10)' : colores.verdeMuyClaro, borderColor: colores.verde }]}>
            <Text style={[styles.bannerTexto, { color: colores.verde }]}>
              🤝 Vehículos que otros usuarios han compartido contigo. Puedes usarlos
              para ingresar al parqueadero. Máximo 2 vehículos compartidos.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.emoji}>🤝</Text>
            <Text style={[styles.vacioTitulo, { color: colores.textoPrimario }]}>
              Sin vehículos compartidos
            </Text>
            <Text style={[styles.vacioSub, { color: colores.textoSecundario }]}>
              Cuando alguien comparta un vehículo contigo, aparecerá aquí
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
  banner: {
    borderRadius: 12,
    padding: espacios.normal,
    borderWidth: 1,
    marginBottom: espacios.normal,
  },
  bannerTexto: { fontSize: fonts.pequeno, lineHeight: 18, fontWeight: '500' },
  card: {
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: espacios.normal,
    elevation: 3,
    borderWidth: 1,
  },
  imagen: { width: 130, height: 160 },
  contenido: { flex: 1, padding: espacios.normal, justifyContent: 'space-between' },
  placa: { fontSize: fonts.grande, fontWeight: '800', letterSpacing: 1.5 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  chipTexto: { fontSize: fonts.pequeno, fontWeight: '700' },
  linea: { fontSize: fonts.normal },
  fecha: { fontSize: fonts.pequeno, fontStyle: 'italic', marginTop: 4 },
  vacio: { alignItems: 'center', paddingVertical: 80 },
  emoji: { fontSize: 70, marginBottom: 16 },
  vacioTitulo: { fontSize: fonts.medio, fontWeight: 'bold' },
  vacioSub: { fontSize: fonts.normal, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
});
