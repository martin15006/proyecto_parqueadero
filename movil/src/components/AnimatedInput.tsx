import React, { useRef, useEffect, useState } from 'react';
import {
  TextInput,
  View,
  Text,
  Animated,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function AnimatedInput({ label, error, ...rest }: Props) {
  const { colores, esOscuro } = useTheme();
  const [focused, setFocused] = useState(false);
  const lineAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(lineAnim, {
      toValue: focused ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
      <Text style={[styles.label, { color: error ? colores.error : colores.textoSecundario }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
            borderColor: error
              ? colores.error
              : focused
                ? colores.verde
                : colores.borde,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colores.textoPrimario }]}
          placeholderTextColor={colores.textoTenue}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        <Animated.View
          style={[
            styles.lineaFocus,
            {
              backgroundColor: error ? colores.error : colores.verde,
              width: lineAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      {error && (
        <Text style={[styles.textoError, { color: colores.error }]}>{error}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: espacios.medio },
  label: {
    fontSize: fonts.pequeno,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fonts.normal,
    fontFamily: undefined,
  },
  lineaFocus: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
  },
  textoError: {
    fontSize: fonts.pequeno,
    marginTop: 4,
    marginLeft: 4,
  },
});