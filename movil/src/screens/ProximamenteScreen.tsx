import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';

interface Props {
  navigation: any;
  route: { params?: { titulo?: string } };
}

export default function ProximamenteScreen({ navigation, route }: Props) {
  const titulo = route.params?.titulo || 'Próximamente';

  return (
    <View style={styles.container}>
      <SenaHeader titulo={titulo} onMenuPress={() => navigation.openDrawer()} />
      <View style={styles.contenido}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={styles.titulo}>Próximamente</Text>
        <Text style={styles.subtitulo}>
          Esta sección está en desarrollo.{'\n'}Estará disponible pronto.
        </Text>
        <TouchableOpacity
          style={styles.boton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.botonTexto}>Volver a Mi Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.blanco },
  contenido: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: espacios.grande },
  emoji: { fontSize: 80, marginBottom: espacios.normal },
  titulo: { fontSize: fonts.titulo - 4, fontWeight: 'bold', color: colors.negro, marginBottom: espacios.pequeno },
  subtitulo: { fontSize: fonts.normal, color: colors.gris, textAlign: 'center', marginBottom: espacios.grande },
  boton: {
    backgroundColor: colors.verde,
    paddingHorizontal: espacios.grande,
    paddingVertical: 12,
    borderRadius: 25,
  },
  botonTexto: { color: colors.blanco, fontWeight: 'bold', fontSize: fonts.medio },
});