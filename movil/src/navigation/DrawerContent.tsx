import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import AvatarIniciales from '../components/AvatarIniciales';
import { colors, fonts, espacios } from '../theme/senaTheme';

interface ItemMenu {
  nombre: string;
  ruta: string;
  icono: string;
  color?: string;
}

const ITEMS: ItemMenu[] = [
  { nombre: 'Mi Perfil', ruta: 'Home', icono: '🏠' },
  { nombre: 'Mis Vehículos', ruta: 'VehiculosStack', icono: '🚗' },
  { nombre: 'Cambiar Contraseña', ruta: 'CambiarContrasena', icono: '🔒' },
  { nombre: 'Configuración', ruta: 'Configuracion', icono: '⚙️' },
];

export default function DrawerContent(props: any) {
  const { usuario, cerrarSesion } = useAuth();
  const rutaActual = props.state?.routeNames?.[props.state.index];

  // Animación cascada de items
  const animaciones = useRef(ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      80,
      animaciones.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, []);

  if (!usuario) return null;

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, cerrar', style: 'destructive', onPress: cerrarSesion },
    ]);
  };

  const navegar = (ruta: string) => {
    props.navigation.navigate(ruta);
  };

  return (
    <View style={styles.contenedor}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        {/* HEADER con avatar y datos */}
        <View style={styles.header}>
          {/* Decoración */}
          <View style={styles.circuloDeco1} />
          <View style={styles.circuloDeco2} />
          <View style={styles.circuloDeco3} />

          <AvatarIniciales nombre={usuario.nombreCompleto} size={75} />
          <Text style={styles.nombre} numberOfLines={1}>
            {usuario.nombreCompleto}
          </Text>
          <Text style={styles.correo} numberOfLines={1}>
            {usuario.correo}
          </Text>

          {/* Logo SENA pequeño */}
          <Image
            source={require('../../assets/logoSena.png')}
            style={styles.logoSena}
            resizeMode="contain"
          />
        </View>

        {/* ITEMS DEL MENÚ */}
        <View style={styles.itemsContainer}>
          {ITEMS.map((item, indice) => {
            const activo = rutaActual === item.ruta;
            return (
              <Animated.View
                key={item.ruta}
                style={{
                  opacity: animaciones[indice],
                  transform: [
                    {
                      translateX: animaciones[indice].interpolate({
                        inputRange: [0, 1],
                        outputRange: [-30, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[styles.item, activo && styles.itemActivo]}
                  onPress={() => navegar(item.ruta)}
                  activeOpacity={0.7}
                >
                  {activo && <View style={styles.indicadorActivo} />}
                  <Text style={styles.iconoItem}>{item.icono}</Text>
                  <Text style={[styles.textoItem, activo && styles.textoItemActivo]}>
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* CERRAR SESIÓN al fondo */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.botonCerrar}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.iconoCerrar}>🚪</Text>
          <Text style={styles.textoCerrar}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colors.blanco },
  scroll: { paddingTop: 0 },
  header: {
    backgroundColor: colors.verde,
    padding: espacios.medio,
    paddingTop: espacios.grande * 1.5,
    paddingBottom: espacios.grande,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  circuloDeco1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.verdeOscuro,
    opacity: 0.3,
  },
  circuloDeco2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.verdeOscuro,
    opacity: 0.2,
  },
  circuloDeco3: {
    position: 'absolute',
    top: 20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.blanco,
    opacity: 0.1,
  },
  nombre: {
    color: colors.blanco,
    fontSize: fonts.medio,
    fontWeight: 'bold',
    marginTop: espacios.normal,
    textAlign: 'center',
  },
  correo: {
    color: colors.blanco,
    fontSize: fonts.pequeno,
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  logoSena: {
    width: 40,
    height: 40,
    marginTop: espacios.normal,
    opacity: 0.9,
  },
  itemsContainer: { paddingTop: espacios.medio, paddingHorizontal: espacios.pequeno },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: espacios.normal,
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  itemActivo: { backgroundColor: colors.verdeMuyClaro },
  indicadorActivo: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    backgroundColor: colors.verde,
    borderRadius: 2,
  },
  iconoItem: { fontSize: 22, marginRight: espacios.normal },
  textoItem: { fontSize: fonts.medio, color: colors.negro, flex: 1 },
  textoItemActivo: { color: colors.verde, fontWeight: 'bold' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.grisClaro,
    padding: espacios.medio,
  },
  botonCerrar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
  },
  iconoCerrar: { fontSize: 22, marginRight: espacios.normal },
  textoCerrar: { fontSize: fonts.medio, color: colors.error, fontWeight: 'bold' },
});