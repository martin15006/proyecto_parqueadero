import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, espacios } from '../theme/senaTheme';

export default function Footer() {
  return (
    <View style={styles.container}>
      <Text style={styles.link}>Casos de Uso</Text>
      <View style={styles.divider} />
      <Text style={styles.link}>Términos y{'\n'}Condiciones</Text>
      <View style={styles.divider} />
      <Text style={styles.link}>Privacidad</Text>
      <View style={styles.divider} />
      <Text style={styles.link}>Especificación{'\n'}de requisitos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: espacios.medio,
    paddingHorizontal: espacios.normal,
    borderTopWidth: 1,
    borderTopColor: colors.grisClaro,
    backgroundColor: colors.blanco,
  },
  link: {
    fontSize: fonts.pequeno - 2,
    color: colors.grisOscuro,
    textAlign: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.gris,
  },
});