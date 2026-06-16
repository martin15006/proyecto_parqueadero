import React, { useState, useCallback } from 'react';
import { Users, Inbox } from 'lucide-react-native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
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
  const [pendientes, setPendientes] = useState<number>(0);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = async () => {
    try {
      const [datos, invs] = await Promise.all([
        vehiculoService.listarCompartidosConmigo(),
        vehiculoService.listarInvitacionesPendientes(),
      ]);
      setVehiculos(datos);
      setPendientes(invs.length);
    } catch (error: any) {
      // No se exponen errores técnicos crudos; en este contexto lo habitual es
      // que un vehículo compartido haya dejado de estar disponible.
      Alert.alert('Vehículo no disponible', 'El vehículo compartido ya no se encuentra disponible.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const handleEliminar = (item: VehiculoCompartido) => {
    Alert.alert(
      'Eliminar vehículo compartido',
      `¿Eliminar el vehículo ${item.placa} de tu lista de compartidos?\n\nYa no podrás usarlo en el parqueadero.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await vehiculoService.eliminarVehiculoCompartido(item.idCompartir);
              setVehiculos((prev) => prev.filter((v) => v.idCompartir !== item.idCompartir));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

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
          <View style={styles.cabeceraFila}>
            <Text style={[styles.placa, { color: colores.textoPrimario }]}>{item.placa}</Text>
            <TouchableOpacity
              style={styles.btnEliminar}
              onPress={() => handleEliminar(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.btnEliminarTexto, { color: colores.error }]}>×</Text>
            </TouchableOpacity>
          </View>
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
          <Text style={[styles.linea, { color: colores.textoSecundario }]}>{item.color}</Text>
          <Text style={[styles.linea, { color: colores.textoSecundario }]}>
            Propietario: {item.propietario}
          </Text>
          <Text style={[styles.fecha, { color: colores.textoTenue }]}>
            Compartido el {new Date(item.compartidoDesde).toLocaleDateString()}
          </Text>

          <TouchableOpacity
            style={[styles.btnEliminarFull, { borderColor: colores.error }]}
            onPress={() => handleEliminar(item)}
            activeOpacity={0.7}
          >
            <Text style={[styles.btnEliminarFullTexto, { color: colores.error }]}>
              Eliminar acceso
            </Text>
          </TouchableOpacity>
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
          <View>
            {pendientes > 0 && (
              <TouchableOpacity
                style={[styles.bannerPendiente, { backgroundColor: esOscuro ? 'rgba(255,193,7,0.10)' : '#FFF8E1', borderColor: '#FFC107' }]}
                onPress={() => navigation.navigate('InvitacionesCompartido')}
                activeOpacity={0.7}
              >
                <Inbox size={22} color="#39A900" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerPendienteTitulo, { color: esOscuro ? '#FFD54F' : '#856404' }]}>
                    Tienes {pendientes} {pendientes === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}
                  </Text>
                  <Text style={[styles.bannerPendienteSub, { color: colores.textoSecundario }]}>
                    Toca para aceptarlas o rechazarlas
                  </Text>
                </View>
                <Text style={[styles.bannerFlecha, { color: esOscuro ? '#FFD54F' : '#856404' }]}>›</Text>
              </TouchableOpacity>
            )}
            <View style={[styles.banner, { backgroundColor: esOscuro ? 'rgba(95,217,36,0.10)' : colores.verdeMuyClaro, borderColor: colores.verde }]}>
              <Text style={[styles.bannerTexto, { color: colores.verde }]}>
                Vehículos que otros usuarios han compartido contigo y que ya aceptaste.
                Puedes usarlos para ingresar al parqueadero. Máximo 2 vehículos.
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Users size={56} color="#9CA3AF" />
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
  bannerPendiente: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: espacios.normal,
    borderWidth: 1,
    marginBottom: espacios.normal,
  },
  bannerPendienteTitulo: { fontSize: fonts.normal, fontWeight: '700' },
  bannerPendienteSub: { fontSize: fonts.pequeno, marginTop: 2 },
  bannerFlecha: { fontSize: 28, fontWeight: '300' },
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
  cabeceraFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  placa: { fontSize: fonts.grande, fontWeight: '800', letterSpacing: 1.5 },
  btnEliminar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(211,47,47,0.08)',
  },
  btnEliminarTexto: { fontSize: 24, fontWeight: '700', lineHeight: 26 },
  btnEliminarFull: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  btnEliminarFullTexto: { fontWeight: '700', fontSize: fonts.pequeno },
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
