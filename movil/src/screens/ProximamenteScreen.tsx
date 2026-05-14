import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';

interface Props {
  navigation: any;
  route: { params?: { titulo?: string } };
}

export default function ProximamenteScreen({ navigation, route }: Props) {
  const { colores, esOscuro } = useTheme();
  const titulo = route.params?.titulo || 'Próximamente';

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader titulo={titulo} onMenuPress={() => navigation.openDrawer()} />
      {esOscuro && <View style={styles.aurora} />}
      <View style={styles.contenido}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={[styles.titulo, { color: colores.textoPrimario }]}>Próximamente</Text>
        <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
          Esta sección está en desarrollo.{'\n'}Estará disponible pronto.
        </Text>
        <TouchableOpacity
          style={[styles.boton, { backgroundColor: colores.verde }]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.botonTexto}>Volver a Mi Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  aurora: {
    position: 'absolute',
    top: 100,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(57,169,0,0.15)',
  },
  contenido: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espacios.grande },
  emoji: { fontSize: 80, marginBottom: espacios.normal },
  titulo: { fontSize: fonts.titulo, fontWeight: 'bold', marginBottom: espacios.pequeno },
  subtitulo: { fontSize: fonts.normal, textAlign: 'center', marginBottom: espacios.grande },
  boton: {
    paddingHorizontal: espacios.grande,
    paddingVertical: 12,
    borderRadius: 25,
  },
  botonTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: fonts.medio },
});