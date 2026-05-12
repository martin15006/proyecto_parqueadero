import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { colors, fonts, espacios, animaciones } from '../theme/senaTheme';

interface Props {
  onPress: () => void;
  texto: string;
  cargando?: boolean;
  mensajeCargando?: string;
  deshabilitado?: boolean;
  variante?: 'primario' | 'peligro';
  style?: ViewStyle;
}

export default function AnimatedButton({
  onPress,
  texto,
  cargando = false,
  mensajeCargando,
  deshabilitado = false,
  variante = 'primario',
  style,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.96,
      duration: animaciones.rapida,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: animaciones.rapida,
      useNativeDriver: true,
    }).start();
  };

  const bgColor =
    variante === 'peligro' ? colors.error : deshabilitado ? colors.gris : colors.verde;

  return (
    <Animated.View style={{ transform: [{ scale }], width: '100%' }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={cargando || deshabilitado}
        style={[styles.boton, { backgroundColor: bgColor }, style]}
      >
        {cargando ? (
          <View style={styles.contenedorCargando}>
            <ActivityIndicator color={colors.blanco} />
            {mensajeCargando && (
              <Text style={[styles.texto, { marginLeft: 10 }]}>{mensajeCargando}</Text>
            )}
          </View>
        ) : (
          <Text style={styles.texto}>{texto}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  boton: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    color: colors.blanco,
    fontSize: fonts.medio,
    fontWeight: 'bold',
  },
  contenedorCargando: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});