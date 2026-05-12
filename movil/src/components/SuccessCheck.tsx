import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/senaTheme';

interface Props {
  visible: boolean;
  mensaje?: string;
}

export default function SuccessCheck({ visible, mensaje = '¡Listo!' }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0);
      opacity.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale }], opacity },
        ]}
      >
        <View style={styles.circulo}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.mensaje}>{mensaje}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  container: {
    backgroundColor: colors.blanco,
    paddingVertical: 40,
    paddingHorizontal: 50,
    borderRadius: 20,
    alignItems: 'center',
  },
  circulo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.verde,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  check: {
    color: colors.blanco,
    fontSize: 50,
    fontWeight: 'bold',
  },
  mensaje: {
    fontSize: fonts.medio,
    fontWeight: 'bold',
    color: colors.negro,
  },
});