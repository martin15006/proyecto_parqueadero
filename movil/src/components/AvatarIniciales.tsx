import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/senaTheme';

interface Props {
  nombre: string;
  fotoUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
  bordeBlanco?: boolean;
}

export default function AvatarIniciales({
  nombre,
  fotoUrl,
  size = 80,
  style,
  bordeBlanco = true,
}: Props) {
  const { colores } = useTheme();
  const [errorFoto, setErrorFoto] = useState(false);

  const obtenerIniciales = (nombreCompleto: string): string => {
    const partes = nombreCompleto.trim().split(/\s+/);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  };

  const mostrarFoto = fotoUrl && !errorFoto;

  return (
    <View
      style={[
        styles.contenedor,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colores.verde,
          borderWidth: bordeBlanco ? 3 : 0,
          borderColor: '#ffffff',
        },
        style,
      ]}
    >
      {mostrarFoto ? (
        <Image
          source={{ uri: fotoUrl! }}
          style={{
            width: size - (bordeBlanco ? 6 : 0),
            height: size - (bordeBlanco ? 6 : 0),
            borderRadius: (size - (bordeBlanco ? 6 : 0)) / 2,
          }}
          onError={() => setErrorFoto(true)}
        />
      ) : (
        <Text style={[styles.iniciales, { fontSize: size * 0.4 }]}>
          {obtenerIniciales(nombre)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  iniciales: {
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});