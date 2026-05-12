import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors, espacios, fonts } from '../theme/senaTheme';

interface Props {
  titulo?: string;
  onMenuPress?: () => void;
}

export default function SenaHeader({ titulo, onMenuPress }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onMenuPress} style={styles.botonMenu}>
        <View style={styles.iconoMenu}>
          <View style={styles.lineaMenu} />
          <View style={styles.lineaMenu} />
          <View style={styles.lineaMenu} />
        </View>
      </TouchableOpacity>

      {titulo ? <Text style={styles.titulo}>{titulo}</Text> : <View style={{ flex: 1 }} />}

      <Image
        source={require('../../assets/logoSena.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.verde,
    paddingTop: espacios.grande * 1.3,
    paddingBottom: espacios.medio,
    paddingHorizontal: espacios.medio,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botonMenu: {
    padding: espacios.pequeno,
  },
  iconoMenu: {
    width: 22,
    height: 16,
    justifyContent: 'space-between',
  },
  lineaMenu: {
    height: 2.5,
    backgroundColor: colors.blanco,
    borderRadius: 2,
  },
  titulo: {
    color: colors.blanco,
    fontSize: fonts.grande,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  logo: {
    width: 45,
    height: 45,
  },
});