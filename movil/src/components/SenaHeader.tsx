import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Platform, StatusBar } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { espacios, fonts } from '../theme/senaTheme';

interface Props {
  titulo?: string;
  onMenuPress?: () => void;
  onBackPress?: () => void;
  mostrarVolver?: boolean;
}

export default function SenaHeader({ titulo, onMenuPress, onBackPress, mostrarVolver = false }: Props) {
  const { colores, esOscuro } = useTheme();

  const paddingTopExtra = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 50;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colores.verdeOscuro,
          paddingTop: paddingTopExtra,
        },
      ]}
    >
      {esOscuro ? <View style={styles.glow} /> : null}

      {mostrarVolver ? (
        <TouchableOpacity
          onPress={onBackPress}
          style={styles.botonIzq}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.flecha}>‹</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onMenuPress}
          style={styles.botonIzq}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.iconoMenu}>
            <View style={styles.lineaMenu} />
            <View style={styles.lineaMenu} />
            <View style={styles.lineaMenu} />
          </View>
        </TouchableOpacity>
      )}

      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : <View style={{ flex: 1 }} />}

      <View style={styles.logoCirculo}>
        <Image
          source={require('../../assets/logoSena.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: espacios.medio,
    paddingHorizontal: espacios.medio,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(95, 217, 36, 0.20)',
  },
  botonIzq: { padding: espacios.pequeno, zIndex: 1, minWidth: 40 },
  iconoMenu: { width: 30, height: 22, justifyContent: 'space-between' },
  lineaMenu: { height: 3.5, backgroundColor: '#ffffff', borderRadius: 2.5 },
  flecha: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '300',
    lineHeight: 38,
    marginTop: -8,
  },
  titulo: {
    color: '#ffffff',
    fontSize: fonts.grande,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    zIndex: 1,
  },
  logoCirculo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 6,
    zIndex: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  logo: { width: '100%', height: '100%' },
});
