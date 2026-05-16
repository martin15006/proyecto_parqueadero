import React, { useState } from 'react';
import {
    View,
    Text,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import AnimatedLogo from '../components/AnimatedLogo';
import AnimatedButton from '../components/AnimatedButton';
import AnimatedInput from '../components/AnimatedInput';
import FadeInView from '../components/FadeInView';
import OtpInput from '../components/OtpInput';
import SuccessCheck from '../components/SuccessCheck';
import { authService } from '../services/authService';
import BotonTema from '../components/BotonTema';

type Paso = 'correo' | 'codigo' | 'nueva';

export default function RecuperarContrasenaScreen({ navigation }: any) {
    const { colores, esOscuro } = useTheme();

    const [paso, setPaso] = useState<Paso>('correo');
    const [correo, setCorreo] = useState('');
    const [codigo, setCodigo] = useState('');
    const [contraNueva, setContraNueva] = useState('');
    const [confirmarContra, setConfirmarContra] = useState('');
    const [errores, setErrores] = useState<any>({});
    const [cargando, setCargando] = useState(false);
    const [errorOtp, setErrorOtp] = useState(false);
    const [mensajeError, setMensajeError] = useState('');
    const [exitoVisible, setExitoVisible] = useState(false);

    // Padding superior dinámico según la barra de estado del celular
    const paddingTopSeguro =
        Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 50;

    // PASO 1
    const handleEnviarCorreo = async () => {
        const e: any = {};
        if (!correo.trim()) e.correo = 'Obligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))
            e.correo = 'Formato inválido';
        setErrores(e);
        if (Object.keys(e).length > 0) return;

        setCargando(true);
        try {
            await authService.solicitarRecuperacion(correo);
            setPaso('codigo');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCargando(false);
        }
    };

    // PASO 2
    const handleVerificarCodigo = async (codigoCompleto: string) => {
        setCargando(true);
        setErrorOtp(false);
        setMensajeError('');
        try {
            const respuesta = await authService.verificarRecuperacion(
                correo,
                codigoCompleto,
            );
            if (respuesta.valido) {
                setCodigo(codigoCompleto);
                setPaso('nueva');
            }
        } catch (error: any) {
            setErrorOtp(true);
            setMensajeError(error.message);
        } finally {
            setCargando(false);
        }
    };

    // PASO 3
    const handleRestablecer = async () => {
        const e: any = {};
        if (!contraNueva) e.contraNueva = 'Obligatoria';
        else if (contraNueva.length < 6) e.contraNueva = 'Mínimo 6 caracteres';
        if (contraNueva !== confirmarContra)
            e.confirmarContra = 'Las contraseñas no coinciden';
        setErrores(e);
        if (Object.keys(e).length > 0) return;

        setCargando(true);
        try {
            await authService.restablecerContrasena(correo, codigo, contraNueva);
            setExitoVisible(true);
            setTimeout(() => {
                setExitoVisible(false);
                navigation.navigate('Login');
            }, 2000);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setCargando(false);
        }
    };

    const correoCensurado = (() => {
        const [u, dominio] = correo.split('@');
        if (!u || !dominio) return correo;
        const visibles = Math.min(2, u.length);
        return `${u.slice(0, visibles)}${'*'.repeat(Math.max(u.length - visibles, 3))}@${dominio}`;
    })();

    return (
        <View style={[styles.container, { backgroundColor: colores.fondo }]}>
            {esOscuro && (
                <>
                    <View style={styles.auroraTop} />
                    <View style={styles.auroraBottom} />
                </>
            )}
            <BotonTema />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Botón volver con padding seguro arriba */}
                <View style={[styles.headerVolver, { paddingTop: paddingTopSeguro }]}>
                    <TouchableOpacity
                        style={styles.botonVolver}
                        onPress={() => {
                            if (paso === 'correo') navigation.goBack();
                            else if (paso === 'codigo') setPaso('correo');
                            else setPaso('codigo');
                        }}
                    >
                        <Text style={[styles.flechaVolver, { color: colores.textoPrimario }]}>
                            ‹
                        </Text>
                        <Text style={[styles.textoVolver, { color: colores.textoPrimario }]}>
                            Volver
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* LOGO CON WRAPPER PARA CENTRAR CORRECTAMENTE */}
                    <FadeInView style={styles.logoContainer}>
                        <View style={styles.logoWrapper}>
                            {esOscuro && <View style={styles.anilloLogo} />}
                            <View style={[styles.logoBox, esOscuro && styles.logoBoxGlow]}>
                                <AnimatedLogo size={70} pulse={false} />
                            </View>
                        </View>
                    </FadeInView>

                    <FadeInView delay={200}>
                        {/* Indicador de progreso */}
                        <View style={styles.progresoContainer}>
                            <View
                                style={[
                                    styles.progresoPunto,
                                    { backgroundColor: colores.verde },
                                ]}
                            />
                            <View
                                style={[
                                    styles.progresoLinea,
                                    {
                                        backgroundColor:
                                            paso !== 'correo' ? colores.verde : colores.grisClaro,
                                    },
                                ]}
                            />
                            <View
                                style={[
                                    styles.progresoPunto,
                                    {
                                        backgroundColor:
                                            paso !== 'correo' ? colores.verde : colores.grisClaro,
                                    },
                                ]}
                            />
                            <View
                                style={[
                                    styles.progresoLinea,
                                    {
                                        backgroundColor:
                                            paso === 'nueva' ? colores.verde : colores.grisClaro,
                                    },
                                ]}
                            />
                            <View
                                style={[
                                    styles.progresoPunto,
                                    {
                                        backgroundColor:
                                            paso === 'nueva' ? colores.verde : colores.grisClaro,
                                    },
                                ]}
                            />
                        </View>

                        {/* PASO 1 */}
                        {paso === 'correo' && (
                            <>
                                <Text style={[styles.titulo, { color: colores.textoPrimario }]}>
                                    Recuperar contraseña
                                </Text>
                                <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
                                    Ingresa tu correo registrado y te enviaremos un código de
                                    verificación.
                                </Text>

                                <AnimatedInput
                                    label="Correo electrónico"
                                    placeholder="ejemplo@correo.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={correo}
                                    error={errores.correo}
                                    onChangeText={(v) => {
                                        setCorreo(v);
                                        if (errores.correo) setErrores({ ...errores, correo: undefined });
                                    }}
                                />

                                <View style={{ marginTop: espacios.medio }}>
                                    <AnimatedButton
                                        texto="Enviar código"
                                        onPress={handleEnviarCorreo}
                                        cargando={cargando}
                                        mensajeCargando="Enviando..."
                                    />
                                </View>
                            </>
                        )}

                        {/* PASO 2 */}
                        {paso === 'codigo' && (
                            <>
                                <Text style={[styles.titulo, { color: colores.textoPrimario }]}>
                                    Verifica tu correo
                                </Text>
                                <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
                                    Si el correo está registrado, recibirás un código de 6 dígitos en
                                </Text>
                                <Text style={[styles.correoResaltado, { color: colores.verde }]}>
                                    {correoCensurado}
                                </Text>

                                <OtpInput
                                    onCompleto={handleVerificarCodigo}
                                    error={errorOtp}
                                    deshabilitado={cargando}
                                />

                                {errorOtp && mensajeError !== '' && (
                                    <Text style={[styles.error, { color: colores.error }]}>
                                        {mensajeError}
                                    </Text>
                                )}

                                <TouchableOpacity
                                    style={styles.linkReenviar}
                                    onPress={handleEnviarCorreo}
                                    disabled={cargando}
                                >
                                    <Text style={[styles.linkReenviarTexto, { color: colores.verde }]}>
                                        Reenviar código
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* PASO 3 */}
                        {paso === 'nueva' && (
                            <>
                                <Text style={[styles.titulo, { color: colores.textoPrimario }]}>
                                    Nueva contraseña
                                </Text>
                                <Text style={[styles.subtitulo, { color: colores.textoSecundario }]}>
                                    Crea una nueva contraseña segura para tu cuenta.
                                </Text>

                                <AnimatedInput
                                    label="Nueva Contraseña"
                                    placeholder="Mínimo 6 caracteres"
                                    secureTextEntry
                                    value={contraNueva}
                                    error={errores.contraNueva}
                                    onChangeText={(v) => {
                                        setContraNueva(v);
                                        if (errores.contraNueva)
                                            setErrores({ ...errores, contraNueva: undefined });
                                    }}
                                />

                                <AnimatedInput
                                    label="Confirmar Contraseña"
                                    placeholder="Repite la nueva contraseña"
                                    secureTextEntry
                                    value={confirmarContra}
                                    error={errores.confirmarContra}
                                    onChangeText={(v) => {
                                        setConfirmarContra(v);
                                        if (errores.confirmarContra)
                                            setErrores({ ...errores, confirmarContra: undefined });
                                    }}
                                />

                                <View style={{ marginTop: espacios.medio }}>
                                    <AnimatedButton
                                        texto="Restablecer Contraseña"
                                        onPress={handleRestablecer}
                                        cargando={cargando}
                                        mensajeCargando="Guardando..."
                                    />
                                </View>
                            </>
                        )}
                    </FadeInView>
                </ScrollView>
            </KeyboardAvoidingView>

            <SuccessCheck visible={exitoVisible} mensaje="¡Contraseña restablecida!" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, position: 'relative' },
    auroraTop: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(57,169,0,0.20)',
    },
    auroraBottom: {
        position: 'absolute',
        bottom: -100,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(0,120,50,0.15)',
    },
    headerVolver: {
        paddingHorizontal: espacios.medio,
        paddingBottom: espacios.pequeno,
        zIndex: 10,
    },
    botonVolver: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        padding: 8,
    },
    flechaVolver: {
        fontSize: 32,
        fontWeight: '300',
        marginRight: 4,
        lineHeight: 32,
        marginTop: -6,
    },
    textoVolver: { fontSize: fonts.normal, fontWeight: '600' },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: espacios.grande,
        paddingTop: espacios.medio,
        paddingBottom: espacios.grande,
    },

    // ─── LOGO CENTRADO CORRECTAMENTE ───
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: espacios.medio,
    },
    logoWrapper: {
        width: 170,
        height: 170,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    anilloLogo: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        borderWidth: 1.5,
        borderColor: 'rgba(95,217,36,0.35)',
        borderStyle: 'dashed',
        top: 0,
        left: 0,
    },
    logoBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    logoBoxGlow: {
        backgroundColor: 'rgba(57,169,0,0.20)',
        shadowColor: '#5fd924',
        shadowOpacity: 0.7,
        shadowRadius: 25,
        shadowOffset: { width: 0, height: 0 },
        elevation: 15,
    },

    progresoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: espacios.grande,
        marginTop: espacios.pequeno,
    },
    progresoPunto: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    progresoLinea: {
        width: 50,
        height: 3,
        marginHorizontal: 4,
    },
    titulo: {
        fontSize: fonts.titulo,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: espacios.pequeno,
    },
    subtitulo: {
        fontSize: fonts.normal,
        textAlign: 'center',
        marginBottom: espacios.medio,
        lineHeight: 22,
    },
    correoResaltado: {
        fontSize: fonts.medio,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: espacios.medio,
    },
    error: {
        fontSize: fonts.normal,
        textAlign: 'center',
        marginTop: espacios.pequeno,
    },
    linkReenviar: {
        alignItems: 'center',
        marginTop: espacios.medio,
        padding: espacios.pequeno,
    },
    linkReenviarTexto: {
        fontSize: fonts.normal,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});