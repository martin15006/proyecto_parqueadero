import { StyleSheet } from 'react-native';
import { colors, fonts, espacios } from '../theme/senaTheme';

export const registerStyles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.blanco,
  },
  container: {
    padding: espacios.grande,
    paddingTop: espacios.medio,
    paddingBottom: espacios.grande,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: espacios.normal,
  },
  titulo: {
    fontSize: fonts.titulo,
    fontWeight: 'bold',
    marginBottom: espacios.medio,
    color: colors.negro,
    textAlign: 'center',
  },
  fotoContainer: {
    alignItems: 'center',
    marginBottom: espacios.medio,
  },
  fotoPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: espacios.pequeno,
    borderWidth: 2,
    borderColor: colors.verde,
  },
  fotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: espacios.pequeno,
    backgroundColor: colors.grisClaro,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gris,
    borderStyle: 'dashed',
  },
  fotoPlaceholderTexto: {
    color: colors.gris,
    fontSize: fonts.pequeno,
    textAlign: 'center',
  },
  botonFoto: {
    backgroundColor: colors.verde,
    paddingHorizontal: espacios.medio,
    paddingVertical: espacios.pequeno,
    borderRadius: 20,
  },
  botonFotoTexto: {
    color: colors.blanco,
    fontSize: fonts.normal,
    fontWeight: 'bold',
  },
  textoError: {
    color: colors.error,
    fontSize: fonts.pequeno,
    marginTop: 4,
  },
  filaInferior: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: espacios.normal,
  },
  textoNormal: {
    color: colors.negro,
    fontSize: fonts.normal,
  },
  enlace: {
    color: colors.verde,
    fontWeight: 'bold',
    fontSize: fonts.normal,
    marginLeft: 5,
  },
});