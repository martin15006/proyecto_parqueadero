import React, { useEffect, useState, useCallback } from 'react';
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
import { colors, fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';
import { vehiculoService } from '../services/vehiculoService';
import { VehiculoUsuario } from '../types/vehiculo';

export default function VehiculosScreen({ navigation }: any) {
  const [vehiculos, setVehiculos] = useState<VehiculoUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = async () => {
    try {
      const datos = await vehiculoService.listarMios();
      setVehiculos(datos);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, []),
  );

  const handleEliminar = (placa: string) => {
    Alert.alert('Eliminar vehículo', `¿Quitar el vehículo ${placa} de tu lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await vehiculoService.eliminar(placa);
            cargar();
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }: { item: VehiculoUsuario; index: number }) => (
    <FadeInView delay={index * 100}>
      <View style={styles.card}>
        <Image
          source={{ uri: item.fotoVehiculo }}
          style={styles.imagen}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <Text style={styles.placa}>{item.placa}</Text>
          <Text style={styles.tipo}>{item.tipoVehiculo}</Text>
          <Text style={styles.color}>Color: {item.color}</Text>
          <TouchableOpacity
            style={styles.botonEliminar}
            onPress={() => handleEliminar(item.placa)}
          >
            <Text style={styles.botonEliminarTexto}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </FadeInView>
  );

  if (cargando) {
    return (
      <View style={styles.container}>
        <SenaHeader
          titulo="Mis Vehículos"
          onMenuPress={() => navigation.openDrawer()}
        />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colors.verde} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SenaHeader
        titulo="Mis Vehículos"
        onMenuPress={() => navigation.openDrawer()}
      />

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
            colors={[colors.verde]}
          />
        }
        ListEmptyComponent={
          <View style={styles.vacioContainer}>
            <Text style={styles.vacioEmoji}>🚗</Text>
            <Text style={styles.vacioTitulo}>No tienes vehículos registrados</Text>
            <Text style={styles.vacioSubtitulo}>
              Registra tu primer vehículo para comenzar
            </Text>
          </View>
        }
      />

      <View style={styles.fab}>
        <AnimatedButton
          texto="+ Registrar Nuevo Vehículo"
          onPress={() => navigation.navigate('RegistrarVehiculo')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.blanco },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { padding: espacios.normal, paddingBottom: 120 },
  card: {
    backgroundColor: colors.blanco,
    borderRadius: 15,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: espacios.normal,
    elevation: 3,
    shadowColor: colors.negro,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.grisClaro,
  },
  imagen: { width: 120, height: 120 },
  cardContent: { flex: 1, padding: espacios.normal, justifyContent: 'space-between' },
  placa: { fontSize: fonts.grande, fontWeight: 'bold', color: colors.negro, letterSpacing: 1.5 },
  tipo: { fontSize: fonts.normal, color: colors.verde, fontWeight: 'bold' },
  color: { fontSize: fonts.normal, color: colors.grisOscuro },
  botonEliminar: { alignSelf: 'flex-start', marginTop: 4 },
  botonEliminarTexto: { color: colors.error, fontSize: fonts.pequeno, fontWeight: 'bold' },
  vacioContainer: { alignItems: 'center', paddingVertical: 80 },
  vacioEmoji: { fontSize: 70, marginBottom: espacios.normal },
  vacioTitulo: { fontSize: fonts.medio, fontWeight: 'bold', color: colors.negro },
  vacioSubtitulo: { fontSize: fonts.normal, color: colors.gris, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: espacios.medio,
    left: espacios.medio,
    right: espacios.medio,
  },
});