import React, { useRef } from 'react';
import {
  Animated,
  TouchableWithoutFeedback,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';

interface Props {
  texto: string;
  onPress: () => void;
  cargando?: boolean;
  mensajeCargando?: string;
  variante?: 'primario' | 'secundario' | 'peligro';
  deshabilitado?: boolean;
}

export default function AnimatedButton({
  texto,
  onPress,
  cargando = false,
  mensajeCargando,
  variante = 'primario',
  deshabilitado = false,
}: Props) {
  const { colores, esOscuro } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const presionar = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 8 }).start();
  };

  const soltar = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  const getBackgroundColor = () => {
    if (deshabilitado) return colores.grisClaro;
    if (variante === 'peligro') return colores.error;
    if (variante === 'secundario') return 'transparent';
    return colores.verde;
  };

  const getTextColor = () => {
    if (variante === 'secundario') return colores.verde;
    return '#ffffff';
  };

  const getBorderColor = () => {
    if (variante === 'secundario') return colores.verde;
    return 'transparent';
  };

  return (
    <TouchableWithoutFeedback
      onPress={onPress}
      onPressIn={presionar}
      onPressOut={soltar}
      disabled={cargando || deshabilitado}
    >
      <Animated.View
        style={[
          styles.boton,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: getBorderColor(),
            borderWidth: variante === 'secundario' ? 1.5 : 0,
            transform: [{ scale }],
            shadowColor: colores.verde,
            shadowOpacity: esOscuro ? 0.5 : 0.3,
          },
        ]}
      >
        {cargando ? (
          <View style={styles.fila}>
            <ActivityIndicator color={getTextColor()} size="small" />
            <Text style={[styles.texto, { color: getTextColor(), marginLeft: 8 }]}>
              {mensajeCargando || 'Cargando...'}
            </Text>
          </View>
        ) : (
          <Text style={[styles.texto, { color: getTextColor() }]}>{texto}</Text>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  boton: {
    paddingVertical: 14,
    paddingHorizontal: espacios.grande,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  texto: {
    fontSize: fonts.medio,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  fila: { flexDirection: 'row', alignItems: 'center' },
});