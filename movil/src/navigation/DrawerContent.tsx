import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AvatarIniciales from '../components/AvatarIniciales';
import { fonts, espacios } from '../theme/senaTheme';

interface ItemMenu {
  nombre: string;
  ruta: string;
  icono: string;
}

const ITEMS: ItemMenu[] = [
  { nombre: 'Mi Perfil', ruta: 'Home', icono: '🏠' },
  { nombre: 'Mis Vehículos', ruta: 'VehiculosStack', icono: '🚗' },
  { nombre: 'Cambiar Contraseña', ruta: 'CambiarContrasena', icono: '🔒' },
  { nombre: 'Configuración', ruta: 'ConfiguracionStack', icono: '⚙️' },
];

export default function DrawerContent(props: any) {
  const { usuario, cerrarSesion } = useAuth();
  const { colores, esOscuro } = useTheme();
  const rutaActual = props.state?.routeNames?.[props.state.index];

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
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      {esOscuro && (
        <>
          <View style={styles.auroraTop} />
          <View style={styles.auroraBottom} />
        </>
      )}

      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colores.verdeOscuro }]}>
          <View style={styles.circuloDeco1} />
          <View style={styles.circuloDeco2} />
          <View style={styles.circuloDeco3} />

          <View style={styles.avatarWrapper}>
            {esOscuro && <View style={styles.avatarGlow} />}
            <AvatarIniciales
              nombre={usuario.nombreCompleto}
              fotoUrl={usuario.fotoPersona}
              size={80}
            />
          </View>

          <Text style={styles.nombre} numberOfLines={1}>
            {usuario.nombreCompleto}
          </Text>
          <Text style={styles.correo} numberOfLines={1}>
            {usuario.correo}
          </Text>

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
                  style={[
                    styles.item,
                    activo && {
                      backgroundColor: esOscuro
                        ? 'rgba(95,217,36,0.15)'
                        : colores.verdeMuyClaro,
                    },
                  ]}
                  onPress={() => navegar(item.ruta)}
                  activeOpacity={0.7}
                >
                  {activo && (
                    <View
                      style={[styles.indicadorActivo, { backgroundColor: colores.verde }]}
                    />
                  )}
                  <Text style={styles.iconoItem}>{item.icono}</Text>
                  <Text
                    style={[
                      styles.textoItem,
                      {
                        color: activo
                          ? colores.verde
                          : colores.textoPrimario,
                        fontWeight: activo ? 'bold' : '400',
                      },
                    ]}
                  >
                    {item.nombre}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* CERRAR SESIÓN */}
      <View style={[styles.footer, { borderTopColor: colores.borde }]}>
        <TouchableOpacity
          style={[
            styles.botonCerrar,
            {
              backgroundColor: esOscuro
                ? 'rgba(255,107,107,0.10)'
                : '#fff5f5',
              borderColor: esOscuro
                ? 'rgba(255,107,107,0.30)'
                : 'transparent',
              borderWidth: esOscuro ? 1 : 0,
            },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.iconoCerrar}>🚪</Text>
          <Text style={[styles.textoCerrar, { color: colores.error }]}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, position: 'relative' },
  auroraTop: {
    position: 'absolute',
    top: 200,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(57,169,0,0.15)',
  },
  auroraBottom: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0,120,50,0.12)',
  },
  scroll: { paddingTop: 0 },
  header: {
    padding: espacios.medio,
    paddingTop: espacios.grande * 2,
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
    backgroundColor: 'rgba(95,217,36,0.25)',
  },
  circuloDeco2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  circuloDeco3: {
    position: 'absolute',
    top: 20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  avatarWrapper: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  avatarGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(95,217,36,0.30)',
  },
  nombre: {
    color: '#ffffff',
    fontSize: fonts.medio,
    fontWeight: 'bold',
    marginTop: espacios.normal,
    textAlign: 'center',
  },
  correo: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fonts.pequeno,
    marginTop: 4,
    textAlign: 'center',
  },
  logoSena: {
    width: 40,
    height: 40,
    marginTop: espacios.normal,
    opacity: 0.95,
  },
  itemsContainer: {
    paddingTop: espacios.medio,
    paddingHorizontal: espacios.pequeno,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: espacios.normal,
    borderRadius: 12,
    marginBottom: 4,
    position: 'relative',
  },
  indicadorActivo: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 4,
    borderRadius: 2,
  },
  iconoItem: { fontSize: 22, marginRight: espacios.normal },
  textoItem: { fontSize: fonts.medio, flex: 1 },
  footer: {
    borderTopWidth: 1,
    padding: espacios.medio,
  },
  botonCerrar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  iconoCerrar: { fontSize: 22, marginRight: espacios.normal },
  textoCerrar: { fontSize: fonts.medio, fontWeight: 'bold' },
});