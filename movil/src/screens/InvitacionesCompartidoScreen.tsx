import React, { useState, useCallback } from 'react';
import { Inbox } from 'lucide-react-native';
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
import { InvitacionCompartido } from '../types/vehiculo';

export default function InvitacionesCompartidoScreen({ navigation }: any) {
  const { colores, esOscuro } = useTheme();
  const [invitaciones, setInvitaciones] = useState<InvitacionCompartido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<number | null>(null);

  const cargar = async () => {
    try {
      const datos = await vehiculoService.listarInvitacionesPendientes();
      setInvitaciones(datos);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const handleAceptar = (inv: InvitacionCompartido) => {
    Alert.alert(
      'Aceptar vehículo',
      `¿Aceptas el vehículo ${inv.placa} compartido por ${inv.propietario}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            setProcesandoId(inv.idCompartir);
            try {
              await vehiculoService.aceptarInvitacion(inv.idCompartir);
              Alert.alert('Listo', `Aceptaste el vehículo ${inv.placa}`);
              await cargar();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setProcesandoId(null);
            }
          },
        },
      ],
    );
  };

  const handleRechazar = (inv: InvitacionCompartido) => {
    Alert.alert(
      'Rechazar invitación',
      `¿Rechazas la invitación del vehículo ${inv.placa}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, rechazar',
          style: 'destructive',
          onPress: async () => {
            setProcesandoId(inv.idCompartir);
            try {
              await vehiculoService.rechazarInvitacion(inv.idCompartir);
              await cargar();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setProcesandoId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item, index }: { item: InvitacionCompartido; index: number }) => {
    const procesando = procesandoId === item.idCompartir;
    return (
      <FadeInView delay={index * 80}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
              borderColor: '#FFC107',
            },
          ]}
        >
          <Image source={{ uri: item.fotoVehiculo }} style={styles.imagen} />
          <View style={styles.contenido}>
            <View style={styles.cabeceraFila}>
              <Text style={[styles.placa, { color: colores.textoPrimario }]}>{item.placa}</Text>
              <View style={[styles.estadoChip, { backgroundColor: '#FFC107' }]}>
                <Text style={styles.estadoTexto}>PENDIENTE</Text>
              </View>
            </View>
            <Text style={[styles.linea, { color: colores.textoSecundario }]}>{item.color}</Text>
            <Text style={[styles.linea, { color: colores.textoSecundario }]}>{item.tipoVehiculo}</Text>
            <Text style={[styles.linea, { color: colores.textoSecundario }]}>
              De: {item.propietario}
            </Text>
            <Text style={[styles.fecha, { color: colores.textoTenue }]}>
              {new Date(item.recibidaEn).toLocaleDateString()}
            </Text>

            <View style={styles.botonesFila}>
              <TouchableOpacity
                style={[styles.botonRechazar, { borderColor: colores.error }]}
                onPress={() => handleRechazar(item)}
                disabled={procesando}
                activeOpacity={0.7}
              >
                {procesando ? (
                  <ActivityIndicator size="small" color={colores.error} />
                ) : (
                  <Text style={[styles.botonRechazarTexto, { color: colores.error }]}>Rechazar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonAceptar, { backgroundColor: colores.verde }]}
                onPress={() => handleAceptar(item)}
                disabled={procesando}
                activeOpacity={0.85}
              >
                {procesando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.botonAceptarTexto}>Aceptar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </FadeInView>
    );
  };

  if (cargando) {
    return (
      <View style={[styles.container, { backgroundColor: colores.fondo }]}>
        <SenaHeader titulo="Invitaciones" mostrarVolver onBackPress={() => navigation.goBack()} />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colores.verde} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader titulo="Invitaciones de Compartido" mostrarVolver onBackPress={() => navigation.goBack()} />
      <FlatList
        data={invitaciones}
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
          <View style={[styles.banner, { backgroundColor: esOscuro ? 'rgba(255,193,7,0.10)' : '#FFF8E1', borderColor: '#FFC107' }]}>
            <Text style={[styles.bannerTexto, { color: esOscuro ? '#FFD54F' : '#856404' }]}>
              Aquí ves los vehículos que otros usuarios quieren compartir contigo.
              Acéptalos para usarlos en el parqueadero, o recházalos.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Inbox size={56} color="#9CA3AF" />
            <Text style={[styles.vacioTitulo, { color: colores.textoPrimario }]}>
              Sin invitaciones pendientes
            </Text>
            <Text style={[styles.vacioSub, { color: colores.textoSecundario }]}>
              Cuando alguien quiera compartirte un vehículo, aparecerá aquí
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
  banner: { borderRadius: 12, padding: espacios.normal, borderWidth: 1, marginBottom: espacios.normal },
  bannerTexto: { fontSize: fonts.pequeno, lineHeight: 18, fontWeight: '500' },
  card: { borderRadius: 16, flexDirection: 'row', overflow: 'hidden', marginBottom: espacios.normal, borderLeftWidth: 5, borderWidth: 1, elevation: 3 },
  imagen: { width: 110, minHeight: 180 },
  contenido: { flex: 1, padding: espacios.normal },
  cabeceraFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  placa: { fontSize: fonts.grande, fontWeight: '800', letterSpacing: 1.5 },
  estadoChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  estadoTexto: { color: '#fff', fontWeight: '700', fontSize: 10 },
  linea: { fontSize: fonts.normal, marginTop: 2 },
  fecha: { fontSize: fonts.pequeno, marginTop: 4 },
  botonesFila: { flexDirection: 'row', gap: 8, marginTop: 12 },
  botonRechazar: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  botonRechazarTexto: { fontWeight: '700', fontSize: fonts.normal },
  botonAceptar: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  botonAceptarTexto: { color: '#fff', fontWeight: '700', fontSize: fonts.normal },
  vacio: { alignItems: 'center', paddingVertical: 80 },
  emoji: { fontSize: 70, marginBottom: 16 },
  vacioTitulo: { fontSize: fonts.medio, fontWeight: 'bold' },
  vacioSub: { fontSize: fonts.normal, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 },
});
