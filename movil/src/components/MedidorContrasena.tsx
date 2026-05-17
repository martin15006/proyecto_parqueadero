import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';

interface Props {
  contrasena: string;
}

export default function MedidorContrasena({ contrasena }: Props) {
  const { colores, esOscuro } = useTheme();

  const requisitos = useMemo(() => {
    const c = contrasena || '';
    return [
      { texto: 'Mínimo 8 caracteres', cumple: c.length >= 8 },
      { texto: 'Una letra mayúscula', cumple: /[A-Z]/.test(c) },
      { texto: 'Una letra minúscula', cumple: /[a-z]/.test(c) },
      { texto: 'Un número', cumple: /[0-9]/.test(c) },
      {
        texto: 'Un carácter especial (!@#$...)',
        cumple: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?¿¡~`]/.test(c),
      },
    ];
  }, [contrasena]);

  const cumplidos = requisitos.filter((r) => r.cumple).length;
  const porcentaje = (cumplidos / requisitos.length) * 100;

  const info = useMemo(() => {
    if (cumplidos <= 2) {
      return { nivel: 'Débil', color: '#e63946' };
    }
    if (cumplidos <= 3) {
      return { nivel: 'Media', color: '#f4a300' };
    }
    if (cumplidos === 4) {
      return { nivel: 'Buena', color: '#7ab800' };
    }
    return { nivel: 'Fuerte', color: '#39A900' };
  }, [cumplidos]);

  if (!contrasena || contrasena.length === 0) {
    return null;
  }

  return (
    <View style={styles.contenedor}>
      <View style={styles.barraContainer}>
        <View
          style={[
            styles.barraFondo,
            { backgroundColor: esOscuro ? 'rgba(255,255,255,0.08)' : '#e8e8e8' },
          ]}
        >
          <View
            style={[
              styles.barraLlena,
              { width: `${porcentaje}%`, backgroundColor: info.color },
            ]}
          />
        </View>
        <Text style={[styles.nivelTexto, { color: info.color }]}>
          {info.nivel}
        </Text>
      </View>

      <View style={styles.requisitosLista}>
        {requisitos.map((req, index) => (
          <View key={index} style={styles.requisitoFila}>
            <View
              style={[
                styles.checkCirculo,
                {
                  backgroundColor: req.cumple
                    ? colores.verde
                    : esOscuro
                      ? 'rgba(255,255,255,0.10)'
                      : '#e8e8e8',
                  borderColor: req.cumple ? colores.verde : colores.borde,
                },
              ]}
            >
              {req.cumple ? <Text style={styles.checkIcono}>✓</Text> : null}
            </View>
            <Text
              style={[
                styles.requisitoTexto,
                {
                  color: req.cumple ? colores.textoPrimario : colores.textoTenue,
                  textDecorationLine: req.cumple ? 'line-through' : 'none',
                  opacity: req.cumple ? 0.7 : 1,
                },
              ]}
            >
              {req.texto}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    marginTop: -espacios.pequeno,
    marginBottom: espacios.normal,
    paddingHorizontal: 4,
  },
  barraContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: espacios.pequeno,
  },
  barraFondo: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  barraLlena: {
    height: '100%',
    borderRadius: 3,
  },
  nivelTexto: {
    fontSize: fonts.pequeno,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'right',
  },
  requisitosLista: {
    marginTop: 2,
  },
  requisitoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  checkCirculo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  checkIcono: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  requisitoTexto: {
    fontSize: fonts.pequeno,
    flex: 1,
  },
});