import { StyleSheet } from 'react-native';
import { colors, fonts, espacios } from '../theme/senaTheme';

export const loginStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.blanco,
        padding: espacios.grande,
        justifyContent: 'center',
    },
    titulo: {
        fontSize: fonts.titulo,
        fontWeight: 'bold',
        marginBottom: espacios.grande,
        color: colors.negro,
    },
    label: {
        fontSize: fonts.normal,
        color: colors.verde,
        fontWeight: 'bold',
        marginBottom: espacios.pequeno,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: colors.gris,
        marginBottom: espacios.medio,
        fontSize: fonts.medio,
        paddingVertical: espacios.pequeno,
        color: colors.negro,
    },
    boton: {
        backgroundColor: colors.verde,
        borderRadius: 25,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: espacios.pequeno,
        marginBottom: espacios.medio,
    },
    botonTexto: {
        color: colors.blanco,
        fontSize: fonts.medio,
        fontWeight: 'bold',
    },
    filaInferior: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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