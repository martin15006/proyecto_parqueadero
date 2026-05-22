import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts } from '../theme/senaTheme';

interface Props {
  nombre?: string | null;
  fotoUrl?: string | null;
  size?: number;
}

/**
 * Obtiene las iniciales de un nombre completo de forma segura.
 * Si el nombre es null/undefined/vacío, devuelve "?".
 */
function obtenerIniciales(nombre?: string | null): string {
  // Protección triple: null, undefined, vacío
  if (!nombre || typeof nombre !== 'string') return '?';

  const limpio = nombre.trim();
  if (limpio.length === 0) return '?';

  const partes = limpio.split(' ').filter((p) => p.length > 0);
  if (partes.length === 0) return '?';

  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase();
  }

  const primera = partes[0].charAt(0).toUpperCase();
  const ultima = partes[partes.length - 1].charAt(0).toUpperCase();
  return `${primera}${ultima}`;
}

/**
 * Genera un color de fondo consistente basado en el nombre.
 */
function generarColor(nombre?: string | null): string {
  const colores = ['#39A900', '#007832', '#00304D', '#71277A', '#5fd924'];

  if (!nombre || typeof nombre !== 'string' || nombre.length === 0) {
    return colores[0];
  }

  let suma = 0;
  for (let i = 0; i < nombre.length; i++) {
    suma += nombre.charCodeAt(i);
  }
  return colores[suma % colores.length];
}

export default function AvatarIniciales({
  nombre,
  fotoUrl,
  size = 80,
}: Props) {
  const { colores } = useTheme();

  // Si hay foto válida (URL no vacía), mostrarla
  if (fotoUrl && typeof fotoUrl === 'string' && fotoUrl.trim().length > 0) {
    return (
      <Image
        source={{ uri: fotoUrl }}
        style={[
          styles.imagen,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: '#ffffff',
          },
        ]}
      />
    );
  }

  // Sino, mostrar iniciales con color de fondo
  const iniciales = obtenerIniciales(nombre);
  const colorFondo = generarColor(nombre);

  return (
    <View
      style={[
        styles.circulo,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colorFondo,
        },
      ]}
    >
      <Text
        style={[
          styles.iniciales,
          {
            fontSize: size * 0.4,
          },
        ]}
      >
        {iniciales}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  imagen: {
    borderWidth: 3,
  },
  circulo: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  iniciales: {
    color: '#ffffff',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});