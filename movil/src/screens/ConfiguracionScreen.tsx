import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import FadeInView from '../components/FadeInView';

export default function ConfiguracionScreen({ navigation }: any) {
    const { colores, esOscuro, modo, alternarTema } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colores.fondo }]}>
            <SenaHeader
                titulo="Configuración"
                onMenuPress={() => navigation.openDrawer()}
            />

            {/* Aurora decorativa solo en oscuro */}
            {esOscuro && (
                <>
                    <View style={styles.auroraTop} />
                    <View style={styles.auroraBottom} />
                </>
            )}

            <ScrollView contentContainerStyle={styles.scroll}>
                <FadeInView>
                    {/* SECCIÓN: APARIENCIA */}
                    <Text style={[styles.seccionLabel, { color: colores.textoTenue }]}>
                        APARIENCIA
                    </Text>

                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                                borderColor: colores.borde,
                            },
                        ]}
                    >
                        <View style={styles.cardRow}>
                            <View style={styles.cardInfo}>
                                <View
                                    style={[
                                        styles.iconoBox,
                                        {
                                            backgroundColor: esOscuro
                                                ? 'rgba(95,217,36,0.20)'
                                                : colores.verdeMuyClaro,
                                        },
                                    ]}
                                >
                                    <Text style={styles.icono}>{esOscuro ? '🌙' : '☀️'}</Text>
                                </View>
                                <View style={styles.cardTexto}>
                                    <Text style={[styles.cardTitulo, { color: colores.textoPrimario }]}>
                                        Modo {esOscuro ? 'Oscuro' : 'Claro'}
                                    </Text>
                                    <Text style={[styles.cardDesc, { color: colores.textoSecundario }]}>
                                        {esOscuro
                                            ? 'Ideal para usar en ambientes con poca luz'
                                            : 'Ideal para usar de día'}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={esOscuro}
                                onValueChange={alternarTema}
                                trackColor={{
                                    false: colores.grisClaro,
                                    true: colores.verde,
                                }}
                                thumbColor={'#ffffff'}
                                ios_backgroundColor={colores.grisClaro}
                            />
                        </View>
                    </View>

                    {/* Preview de cómo se ve cada tema */}
                    <View style={styles.previewContainer}>
                        <TouchableOpacity
                            style={[
                                styles.previewCard,
                                {
                                    borderColor: !esOscuro ? colores.verde : colores.borde,
                                    borderWidth: !esOscuro ? 2 : 1,
                                    backgroundColor: '#ffffff',
                                },
                            ]}
                            onPress={() => modo === 'dark' && alternarTema()}
                            activeOpacity={0.7}
                        >
                            <View style={styles.previewHeader}>
                                <View style={[styles.previewDot, { backgroundColor: '#39A900' }]} />
                                <View style={[styles.previewLinea, { backgroundColor: '#e0e0e0' }]} />
                            </View>
                            <View style={[styles.previewLineaCorta, { backgroundColor: '#e0e0e0' }]} />
                            <View style={[styles.previewLineaCorta, { backgroundColor: '#e0e0e0', width: '60%' }]} />
                            <Text style={styles.previewLabel}>☀️ Claro</Text>
                            {!esOscuro && (
                                <View style={[styles.previewCheck, { backgroundColor: colores.verde }]}>
                                    <Text style={styles.previewCheckText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.previewCard,
                                {
                                    borderColor: esOscuro ? colores.verde : colores.borde,
                                    borderWidth: esOscuro ? 2 : 1,
                                    backgroundColor: '#001f12',
                                },
                            ]}
                            onPress={() => modo === 'light' && alternarTema()}
                            activeOpacity={0.7}
                        >
                            <View style={styles.previewHeader}>
                                <View style={[styles.previewDot, { backgroundColor: '#5fd924' }]} />
                                <View style={[styles.previewLinea, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                            </View>
                            <View style={[styles.previewLineaCorta, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                            <View style={[styles.previewLineaCorta, { backgroundColor: 'rgba(255,255,255,0.15)', width: '60%' }]} />
                            <Text style={[styles.previewLabel, { color: '#ffffff' }]}>🌙 Oscuro</Text>
                            {esOscuro && (
                                <View style={[styles.previewCheck, { backgroundColor: colores.verde }]}>
                                    <Text style={styles.previewCheckText}>✓</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* SECCIÓN: CUENTA */}
                    <Text
                        style={[
                            styles.seccionLabel,
                            { color: colores.textoTenue, marginTop: espacios.grande },
                        ]}
                    >
                        CUENTA
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.card,
                            {
                                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                                borderColor: colores.borde,
                            },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('EditarPerfil')}
                    >
                        <View style={styles.cardRow}>
                            <View style={styles.cardInfo}>
                                <View
                                    style={[
                                        styles.iconoBox,
                                        {
                                            backgroundColor: esOscuro
                                                ? 'rgba(95,217,36,0.20)'
                                                : colores.verdeMuyClaro,
                                        },
                                    ]}
                                >
                                    <Text style={styles.icono}>✏️</Text>
                                </View>
                                <View style={styles.cardTexto}>
                                    <Text style={[styles.cardTitulo, { color: colores.textoPrimario }]}>
                                        Editar Perfil
                                    </Text>
                                    <Text style={[styles.cardDesc, { color: colores.textoSecundario }]}>
                                        Cambia tu foto, teléfono o contacto de emergencia
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.chevron, { color: colores.textoTenue }]}>›</Text>
                        </View>
                    </TouchableOpacity>

                    {/* SECCIÓN: INFORMACIÓN */}

                    {/* SECCIÓN: INFORMACIÓN */}
                    <Text
                        style={[
                            styles.seccionLabel,
                            { color: colores.textoTenue, marginTop: espacios.grande },
                        ]}
                    >
                        INFORMACIÓN
                    </Text>

                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                                borderColor: colores.borde,
                            },
                        ]}
                    >
                        <View style={styles.cardRow}>
                            <View style={styles.cardInfo}>
                                <View
                                    style={[
                                        styles.iconoBox,
                                        {
                                            backgroundColor: esOscuro
                                                ? 'rgba(95,217,36,0.20)'
                                                : colores.verdeMuyClaro,
                                        },
                                    ]}
                                >
                                    <Text style={styles.icono}>📱</Text>
                                </View>
                                <View style={styles.cardTexto}>
                                    <Text style={[styles.cardTitulo, { color: colores.textoPrimario }]}>
                                        Versión
                                    </Text>
                                    <Text style={[styles.cardDesc, { color: colores.textoSecundario }]}>
                                        Parqueadero SENA v1.0.0
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                                borderColor: colores.borde,
                            },
                        ]}
                    >
                        <View style={styles.cardRow}>
                            <View style={styles.cardInfo}>
                                <View
                                    style={[
                                        styles.iconoBox,
                                        {
                                            backgroundColor: esOscuro
                                                ? 'rgba(95,217,36,0.20)'
                                                : colores.verdeMuyClaro,
                                        },
                                    ]}
                                >
                                    <Text style={styles.icono}>🏛️</Text>
                                </View>
                                <View style={styles.cardTexto}>
                                    <Text style={[styles.cardTitulo, { color: colores.textoPrimario }]}>
                                        SENA Regional Tolima
                                    </Text>
                                    <Text style={[styles.cardDesc, { color: colores.textoSecundario }]}>
                                        Centro de Industria y de la Construcción
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Footer institucional */}
                    <View style={styles.footerInfo}>
                        <Text style={[styles.footerTexto, { color: colores.textoTenue }]}>
                            © 2026 SENA · Todos los derechos reservados
                        </Text>
                    </View>
                </FadeInView>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, position: 'relative' },
    auroraTop: {
        position: 'absolute',
        top: 80,
        right: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(57,169,0,0.18)',
    },
    auroraBottom: {
        position: 'absolute',
        bottom: -100,
        left: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(0,120,50,0.15)',
    },
    scroll: {
        padding: espacios.medio,
        paddingBottom: espacios.grande * 2,
    },
    seccionLabel: {
        fontSize: fonts.pequeno,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginLeft: 4,
        marginBottom: espacios.pequeno,
        marginTop: espacios.pequeno,
    },
    card: {
        borderRadius: 16,
        padding: espacios.medio,
        marginBottom: espacios.pequeno,
        borderWidth: 1,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconoBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: espacios.normal,
    },
    icono: { fontSize: 22 },
    cardTexto: { flex: 1 },
    cardTitulo: { fontSize: fonts.medio, fontWeight: '700' },
    cardDesc: { fontSize: fonts.pequeno, marginTop: 2 },

    // Preview de temas
    previewContainer: {
        flexDirection: 'row',
        gap: espacios.normal,
        marginTop: espacios.medio,
        marginBottom: espacios.pequeno,
    },
    previewCard: {
        flex: 1,
        borderRadius: 16,
        padding: espacios.medio,
        height: 130,
        position: 'relative',
        justifyContent: 'space-between',
    },
    previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    previewDot: { width: 12, height: 12, borderRadius: 6 },
    previewLinea: { height: 6, borderRadius: 3, flex: 1 },
    previewLineaCorta: { height: 5, borderRadius: 2.5, width: '80%', marginTop: 4 },
    previewLabel: {
        fontSize: fonts.pequeno,
        fontWeight: '700',
        marginTop: 8,
        color: '#000',
    },
    previewCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewCheckText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

    footerInfo: {
        alignItems: 'center',
        marginTop: espacios.grande,
    },
    footerTexto: { fontSize: fonts.pequeno },
    chevron: { fontSize: 28, fontWeight: '300' },
});