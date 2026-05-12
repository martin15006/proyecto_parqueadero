import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts } from '../theme/senaTheme';

interface Props {
  nombre: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function AvatarIniciales({ nombre, size = 80, style }: Props) {
  const obtenerIniciales = (nombreCompleto: string): string => {
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <View
      style={[
        styles.contenedor,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.iniciales, { fontSize: size * 0.4 }]}>
        {obtenerIniciales(nombre)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: colors.verde,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.blanco,
    elevation: 5,
    shadowColor: colors.negro,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  iniciales: {
    color: colors.blanco,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});