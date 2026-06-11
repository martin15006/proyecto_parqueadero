import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function BotonTema() {
  const { esOscuro, alternarTema } = useTheme();
  const rotacion = useRef(new Animated.Value(0)).current;
  const escala = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(rotacion, {
      toValue: esOscuro ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [esOscuro]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(escala, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(escala, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    alternarTema();
  };

  const rotacionInterpolada = rotacion.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const topSeguro =
    Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 50;

  return (
    <Animated.View
      style={[
        styles.contenedor,
        { top: topSeguro, transform: [{ scale: escala }] },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[styles.boton, esOscuro ? styles.botonOscuro : styles.botonClaro]}
      >
        <Animated.View style={{ transform: [{ rotate: rotacionInterpolada }] }}>
          {esOscuro ? (
            <Moon size={22} color="#5fd924" />
          ) : (
            <Sun size={22} color="#FDC300" />
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  boton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  botonClaro: {
    backgroundColor: '#ffffff',
    borderColor: 'rgba(57,169,0,0.25)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  botonOscuro: {
    backgroundColor: 'rgba(95,217,36,0.15)',
    borderColor: 'rgba(95,217,36,0.50)',
    elevation: 4,
    shadowColor: '#5fd924',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  emoji: {
    fontSize: 24,
  },
});