import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import FadeInView from '../components/FadeInView';

const lapizClaro = require('../../assets/lapiz2.png');
const lapizOscuro = require('../../assets/lapiz1.png');

export default function ConfiguracionScreen({ navigation }: any) {
    const { colores, esOscuro, modo, alternarTema } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colores.fondo }]}>
            <SenaHeader
                titulo="Configuración"
                mostrarVolver
                onBackPress={() => navigation.navigate('Home', { screen: 'MiPerfil' })}
            />

            {/* Aurora decorativa solo en oscuro */}
            {esOscuro && (
                <>
                    <View style={styles.auroraTop} />
                    <View style={styles.auroraBottom} />
                </>
            )}

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <FadeInView style={{ flex: 1 }}>
                    <View style={styles.contenido}>
                        {/* ─── SECCIÓN: APARIENCIA ─── */}
                        <Text style={[styles.seccionLabel, { color: colores.textoTenue }]}>
                            APARIENCIA
                        </Text>

                        {/* Card del sol/luna - sin padding interno */}
                        <View
                            style={[
                                styles.cardTema,
                                {
                                    backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                                    borderColor: colores.borde,
                                },
                            ]}
                        >
                            <View style={styles.temaCentro}>
                                <Text style={styles.icono}>
                                    {esOscuro ? '☾' : '☼'}
                                </Text>
                            </View>
                        </View>

                        {/* Preview de cada tema */}
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
                                <Text style={styles.previewLabel}>☼ Claro</Text>
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
                                <Text style={[styles.previewLabel, { color: '#ffffff' }]}>☾ Oscuro</Text>
                                {esOscuro && (
                                    <View style={[styles.previewCheck, { backgroundColor: colores.verde }]}>
                                        <Text style={styles.previewCheckText}>✓</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* ─── SECCIÓN: CUENTA ─── */}
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
                                    {/* Icono lápiz sin fondo verde, cambia según tema */}
                                    <View style={styles.iconoBox}>
                                        <Image
                                            source={esOscuro ? lapizOscuro : lapizClaro}
                                            style={styles.iconoImagen}
                                            resizeMode="contain"
                                        />
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

                        {/* ─── SECCIÓN: INFORMACIÓN (sin íconos) ─── */}
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
                            <View style={styles.cardTexto}>
                                <Text style={[styles.cardTitulo, { color: colores.textoPrimario }]}>
                                    Versión
                                </Text>
                                <Text style={[styles.cardDesc, { color: colores.textoSecundario }]}>
                                    Parqueadero SENA v1.0.0
                                </Text>
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
                            <View style={styles.cardTexto}>
                                <Text style={[styles.cardTitulo, { color: colores.textoPrimario }]}>
                                    SENA Regional Tolima
                                </Text>
                                <Text style={[styles.cardDesc, { color: colores.textoSecundario }]}>
                                    Centro de Industria y de la Construcción
                                </Text>
                            </View>
                        </View>

                        {/* Spacer que empuja el footer hacia abajo */}
                        <View style={styles.spacer} />

                        {/* Footer institucional pegado al fondo */}
                        <View style={styles.footerInfo}>
                            <Text style={[styles.footerTexto, { color: colores.textoTenue }]}>
                                © 2026 SENA · Todos los derechos reservados
                            </Text>
                            <Text style={[styles.footerTextoMini, { color: colores.textoTenue }]}>
                                Centro de Industria y de la Construcción
                            </Text>
                        </View>
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
        flexGrow: 1,
        padding: espacios.medio,
    },
    contenido: {
        flex: 1,
        minHeight: '100%',
    },
    seccionLabel: {
        fontSize: fonts.pequeno,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginLeft: 4,
        marginBottom: espacios.pequeno,
        marginTop: espacios.pequeno,
    },

    // ── Card del tema (sol/luna) — sin padding ──
    cardTema: {
        borderRadius: 16,
        marginBottom: espacios.pequeno,
        borderWidth: 1,
        overflow: 'hidden',
    },
    temaCentro: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
    },
    icono: { fontSize: 44 },

    // ── Card de cuenta/información — con padding ──
    card: {
        borderRadius: 16,
        marginBottom: espacios.pequeno,
        borderWidth: 1,
        padding: espacios.medio,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    // Caja del icono SIN fondo verde — solo contenedor del tamaño
    iconoBox: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: espacios.normal,
    },
    iconoImagen: {
        width: 38,
        height: 38,
        transform: [{ translateY: -2 }],
    },
    cardTexto: { flex: 1, paddingRight: espacios.pequeno },
    cardTitulo: {
        fontSize: fonts.medio,
        fontWeight: '700',
        marginBottom: 2,
    },
    cardDesc: {
        fontSize: fonts.pequeno,
        lineHeight: 18,
    },
    chevron: {
        fontSize: 30,
        fontWeight: '300',
        marginLeft: 4,
    },

    // ── Preview de temas ──
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
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    previewDot: { width: 12, height: 12, borderRadius: 6 },
    previewLinea: { height: 6, borderRadius: 3, flex: 1 },
    previewLineaCorta: {
        height: 5,
        borderRadius: 2.5,
        width: '80%',
        marginTop: 4,
    },
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

    // ── Spacer para empujar footer al fondo ──
    spacer: {
        flex: 1,
        minHeight: espacios.grande,
    },

    // ── Footer institucional ──
    footerInfo: {
        alignItems: 'center',
        paddingTop: espacios.medio,
        paddingBottom: espacios.normal,
    },
    footerTexto: {
        fontSize: fonts.pequeno,
        fontWeight: '600',
    },
    footerTextoMini: {
        fontSize: fonts.pequeno - 1,
        marginTop: 4,
        opacity: 0.7,
    },
});