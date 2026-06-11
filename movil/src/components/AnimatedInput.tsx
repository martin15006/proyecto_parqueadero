import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import { Eye, EyeOff } from 'lucide-react-native';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function AnimatedInput({
  label,
  error,
  secureTextEntry,
  value,
  ...rest
}: Props) {
  const { colores, esOscuro } = useTheme();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const esContrasena = !!secureTextEntry;
  const secureFinal = esContrasena && !mostrarContrasena;

  const borderColor = error
    ? colores.error
    : focused
      ? colores.verde
      : colores.borde;

  const renderOjito = () => {
    if (!esContrasena) return null;
    return (
      <TouchableOpacity
        style={styles.ojitoBoton}
        onPress={() => setMostrarContrasena(!mostrarContrasena)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {mostrarContrasena ? (
          <EyeOff size={20} color={colores.textoTenue} />
        ) : (
          <Eye size={20} color={colores.textoTenue} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View style={[styles.contenedor, { transform: [{ translateX: shakeAnim }] }]}>
      <Text style={[styles.label, { color: colores.textoPrimario }]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
            borderColor: borderColor,
            borderWidth: focused || error ? 2 : 1,
          },
        ]}
      >
        <TextInput
          {...rest}
          value={value}
          secureTextEntry={secureFinal}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={colores.textoTenue}
          style={[
            styles.input,
            {
              color: colores.textoPrimario,
              paddingRight: esContrasena ? 48 : espacios.normal,
            },
          ]}
        />
        {renderOjito()}
      </View>
      {error ? <Text style={[styles.error, { color: colores.error }]}>{error}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginBottom: espacios.normal,
  },
  label: {
    fontSize: fonts.normal,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    borderRadius: 12,
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    paddingHorizontal: espacios.normal,
    paddingVertical: 14,
    fontSize: fonts.normal,
  },
  ojitoBoton: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
  },
  ojitoTexto: {
    fontSize: fonts.pequeno - 1,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  error: {
    fontSize: fonts.pequeno,
    marginTop: 4,
    marginLeft: 4,
  },
});