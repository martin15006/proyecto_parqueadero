import React, { useRef, useState, useEffect } from 'react';
import {
  TextInput,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { colors, espacios } from '../theme/senaTheme';

interface Props {
  longitud?: number;
  onCompleto: (codigo: string) => void;
  error?: boolean;
  deshabilitado?: boolean;
}

export default function OtpInput({
  longitud = 6,
  onCompleto,
  error = false,
  deshabilitado = false,
}: Props) {
  const [valores, setValores] = useState<string[]>(Array(longitud).fill(''));
  const inputsRef = useRef<Array<TextInput | null>>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
      setValores(Array(longitud).fill(''));
      setTimeout(() => inputsRef.current[0]?.focus(), 300);
    }
  }, [error]);

  const manejarCambio = (texto: string, indice: number) => {
    // Soportar pegar el código completo
    if (texto.length > 1) {
      const numeros = texto.replace(/[^0-9]/g, '').slice(0, longitud);
      const nuevosValores = numeros.split('').concat(Array(longitud).fill('')).slice(0, longitud);
      setValores(nuevosValores);

      const ultimoLleno = numeros.length - 1;
      const indiceEnfocar = Math.min(ultimoLleno, longitud - 1);
      inputsRef.current[indiceEnfocar]?.focus();

      if (numeros.length === longitud) {
        onCompleto(numeros);
      }
      return;
    }

    if (texto && !/^[0-9]$/.test(texto)) return;

    const nuevosValores = [...valores];
    nuevosValores[indice] = texto;
    setValores(nuevosValores);

    if (texto && indice < longitud - 1) {
      inputsRef.current[indice + 1]?.focus();
    }

    const codigoCompleto = nuevosValores.join('');
    if (codigoCompleto.length === longitud) {
      onCompleto(codigoCompleto);
    }
  };

  const manejarBackspace = (
    evento: NativeSyntheticEvent<TextInputKeyPressEventData>,
    indice: number,
  ) => {
    if (evento.nativeEvent.key === 'Backspace' && !valores[indice] && indice > 0) {
      inputsRef.current[indice - 1]?.focus();
      const nuevosValores = [...valores];
      nuevosValores[indice - 1] = '';
      setValores(nuevosValores);
    }
  };

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}
    >
      {valores.map((valor, indice) => (
        <TextInput
          key={indice}
          ref={(ref) => {
            inputsRef.current[indice] = ref;
          }}
          style={[
            styles.input,
            valor !== '' && styles.inputLleno,
            error && styles.inputError,
            deshabilitado && styles.inputDeshabilitado,
          ]}
          value={valor}
          onChangeText={(texto) => manejarCambio(texto, indice)}
          onKeyPress={(evento) => manejarBackspace(evento, indice)}
          keyboardType="numeric"
          maxLength={indice === 0 ? longitud : 1} // El primero permite pegar todo el código
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          editable={!deshabilitado}
          selectionColor={colors.verde}
          textAlign="center"
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: espacios.normal,
  },
  input: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: colors.gris,
    borderRadius: 10,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.negro,
    backgroundColor: colors.blanco,
  },
  inputLleno: {
    borderColor: colors.verde,
    backgroundColor: colors.verdeMuyClaro,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#ffebee',
  },
  inputDeshabilitado: {
    backgroundColor: colors.grisClaro,
    opacity: 0.6,
  },
});