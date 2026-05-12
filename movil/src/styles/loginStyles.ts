import { StyleSheet } from 'react-native';
import { colors, fonts, espacios } from '../theme/senaTheme';

export const loginStyles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.blanco,
    justifyContent: 'center',
  },
  container: {
    padding: espacios.grande,
    paddingTop: espacios.grande * 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: espacios.grande,
  },
  titulo: {
    fontSize: fonts.titulo,
    fontWeight: 'bold',
    marginBottom: espacios.grande,
    color: colors.negro,
  },
  filaInferior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: espacios.normal,
  },
  link: {
    color: colors.verde,
    fontSize: fonts.normal,
  },
  enlace: {
    color: colors.verde,
    fontWeight: 'bold',
    fontSize: fonts.normal,
  },
});