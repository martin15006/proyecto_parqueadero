import React, { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, fonts, espacios, animaciones } from '../theme/senaTheme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function AnimatedInput({ label, error, ...rest }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const lineaAncho = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const animarLinea = (valor: number) => {
    Animated.timing(lineaAncho, {
      toValue: valor,
      duration: animaciones.media,
      useNativeDriver: false,
    }).start();
  };

  // Cuando hay error, hace un pequeño shake
  React.useEffect(() => {
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

  const colorLinea = error ? colors.error : colors.verde;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
      <Text style={[styles.label, error && { color: colors.error }]}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          {...rest}
          style={styles.input}
          placeholderTextColor="#aaa"
          onFocus={(e) => {
            setEnfocado(true);
            animarLinea(100);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            animarLinea(0);
            rest.onBlur?.(e);
          }}
        />
        <View style={styles.lineaBase} />
        <Animated.View
          style={[
            styles.lineaActiva,
            {
              backgroundColor: colorLinea,
              width: enfocado || error
                ? lineaAncho.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  })
                : error
                ? '100%'
                : '0%',
            },
          ]}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: espacios.normal,
  },
  label: {
    fontSize: fonts.normal,
    color: colors.verde,
    fontWeight: 'bold',
    marginBottom: espacios.pequeno,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    fontSize: fonts.medio,
    paddingVertical: espacios.pequeno,
    color: colors.negro,
  },
  lineaBase: {
    height: 1,
    backgroundColor: colors.gris,
  },
  lineaActiva: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
  },
  error: {
    color: colors.error,
    fontSize: fonts.pequeno,
    marginTop: 4,
  },
});