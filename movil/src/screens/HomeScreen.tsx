import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { AlertTriangle, CheckCircle2, XCircle, ClipboardList, Lock, UserMinus, Users, Car, Pencil, Bell, ChevronDown } from 'lucide-react-native';
import AvatarIniciales from '../components/AvatarIniciales';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../services/api';
import { notificacionService } from '../services/notificacionService';

type IndicadorGlobal = 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO' | 'SIN_DATOS';

type EstadoAprendiz = {
  indicadorGlobal: IndicadorGlobal;
  espaciosDisponibles: number;
};

type CodigoAccesoResponse = {
  tokenAccesoVehicular: string | null;
};

type NotificacionUsuario = {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  actorNombre: string | null;
  createdAt: string;
  leidaAt?: string | null;
};

const COLORS = {
  verdeActivo: '#39A900',
  verdeOscuro: '#003939',
  fondoBase: '#F4F7F6',
  alertaOcupacion: '#FF6B00',
  bloqueoEmergencia: '#D32F2F',
  blanco: '#FFFFFF',
  texto: '#0F172A',
  textoSuave: '#475569',
  borde: 'rgba(15, 23, 42, 0.10)',
  sombra: 'rgba(15, 23, 42, 0.14)',
};

export default function HomeScreen({ navigation }: { navigation: any }) {
  const { usuario } = useAuth();
  const { esOscuro } = useTheme();

  const esAprendiz = Number(usuario?.idTipoUsr ?? 0) === 1;
  // Personal SENA (tipo 4) opera como aprendiz para el acceso vehicular (QR + credencial).
  const puedeAcceso = esAprendiz || Number(usuario?.idTipoUsr ?? 0) === 4;

  const T = useMemo(() => ({
    fondo: esOscuro ? '#0B1410' : COLORS.fondoBase,
    superficie: esOscuro ? '#16221C' : COLORS.blanco,
    superficieAlt: esOscuro ? '#1F2D26' : '#F8FAFC',
    textoPrimario: esOscuro ? '#F0F4F1' : COLORS.texto,
    textoSecundario: esOscuro ? 'rgba(240,244,241,0.72)' : COLORS.textoSuave,
    textoTenue: esOscuro ? 'rgba(240,244,241,0.55)' : '#64748B',
    borde: esOscuro ? 'rgba(255,255,255,0.08)' : COLORS.borde,
    headerBg: esOscuro ? '#0F1F1A' : COLORS.verdeOscuro,
    badgeBg: esOscuro ? 'rgba(95,217,36,0.16)' : 'rgba(255,255,255,0.14)',
  }), [esOscuro]);

  const [codigoAcceso, setCodigoAcceso] = useState<string>('');
  const [codigoAccesoQr, setCodigoAccesoQr] = useState<string>('');
  const [estado, setEstado] = useState<EstadoAprendiz>({
    indicadorGlobal: 'SIN_DATOS',
    espaciosDisponibles: 0,
  });
  const [notificaciones, setNotificaciones] = useState<NotificacionUsuario[]>([]);
  const [bandejaAbierta, setBandejaAbierta] = useState<boolean>(true);
  const [verTodasNotif, setVerTodasNotif] = useState<boolean>(false);
  const [cargando, setCargando] = useState<boolean>(true);

  const animSwitch = useRef(new Animated.Value(1)).current;
  const animPulse = useRef(new Animated.Value(0)).current;

  const documentoSanitizado = useMemo(() => {
    const doc = String(usuario?.documento ?? '').trim();
    const last4 = doc.length >= 4 ? doc.slice(-4) : doc;
    return `CC *****${last4}`;
  }, [usuario?.documento]);

  const fichaTexto = useMemo(() => {
    const raw = String(usuario?.idFormacion ?? '').trim();
    return raw.length ? `FICHA ${raw}` : 'FICHA SIN ASIGNAR';
  }, [usuario?.idFormacion]);

  const rolTexto = useMemo(() => {
    const idRol = Number(usuario?.idTipoUsr ?? 0);
    if (idRol === 1) return 'APRENDIZ ACTIVO';
    if (idRol === 2) return 'ADMINISTRADOR';
    if (idRol === 3) return 'OPERATIVO';
    if (idRol === 4) return 'PERSONAL SENA';
    return 'USUARIO';
  }, [usuario?.idTipoUsr]);

  const colorEstado = useMemo(() => {
    if (estado.indicadorGlobal === 'DISPONIBLE') return COLORS.verdeActivo;
    if (estado.indicadorGlobal === 'LLENO') return COLORS.alertaOcupacion;
    if (estado.indicadorGlobal === 'DESHABILITADO') return COLORS.bloqueoEmergencia;
    return '#94A3B8';
  }, [estado.indicadorGlobal]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(animPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [animPulse]);

  // Refresco unificado: estado del parqueadero + notificaciones
  // (sin mover el QR, que se carga solo una vez para no romper el preview).
  const cargarLiveData = useCallback(async (mostrarSpinner = false) => {
    if (!usuario) return;
    if (mostrarSpinner) setCargando(true);

    const estadoPromise = esAprendiz
      ? apiRequest<{ indicadorGlobal: string; espaciosDisponibles: number }>('/bahias/estado-aprendiz', { conAuth: true })
      : apiRequest<{ estadoParqueadero: string; disponibles: number }>('/bahias/ocupacion', { conAuth: true });

    const bandejaPromise = esAprendiz
      ? apiRequest<NotificacionUsuario[]>('/notificaciones/mias', { conAuth: true })
      : Promise.resolve<NotificacionUsuario[]>([]);

    const [estadoResult, bandejaResult] = await Promise.allSettled([estadoPromise, bandejaPromise]);

    if (estadoResult.status === 'fulfilled') {
      const indicador = String(
        esAprendiz
          ? (estadoResult.value as any)?.indicadorGlobal
          : (estadoResult.value as any)?.estadoParqueadero,
      ).toUpperCase().trim() || 'SIN_DATOS';
      const indicadorGlobal: IndicadorGlobal =
        indicador === 'DISPONIBLE' ? 'DISPONIBLE'
          : indicador === 'LLENO' ? 'LLENO'
          : indicador === 'DESHABILITADO' ? 'DESHABILITADO'
          : 'SIN_DATOS';

      setEstado({
        indicadorGlobal,
        espaciosDisponibles: Number(
          esAprendiz
            ? (estadoResult.value as any)?.espaciosDisponibles
            : (estadoResult.value as any)?.disponibles,
        ) || 0,
      });
    }

    if (bandejaResult.status === 'fulfilled') {
      setNotificaciones(Array.isArray(bandejaResult.value) ? bandejaResult.value : []);
    }

    if (mostrarSpinner) setCargando(false);
  }, [usuario, esAprendiz]);

  useEffect(() => {
    let activo = true;
    const normalizeTokenRaw = (value: string) => String(value ?? '').trim();
    const toBarcodeToken = (value: string) =>
      String(value ?? '').trim().replace(/[^0-9a-zA-Z]/g, '').toUpperCase();

    (async () => {
      if (!usuario) return;
      setCargando(true);
      try {
        if (puedeAcceso) {
          let codigo: CodigoAccesoResponse | null = null;
          try {
            codigo = await apiRequest<CodigoAccesoResponse>('/usuarios/codigo-acceso', { conAuth: true });
          } catch { codigo = null; }
          if (!activo) return;
          const tokenRaw = codigo?.tokenAccesoVehicular
            ? normalizeTokenRaw(codigo.tokenAccesoVehicular)
            : normalizeTokenRaw(usuario.qr ?? '');
          setCodigoAccesoQr(tokenRaw);
          setCodigoAcceso(toBarcodeToken(tokenRaw));
        } else {
          setCodigoAccesoQr('');
          setCodigoAcceso('');
        }
        await cargarLiveData(false);
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => { activo = false; };
  }, [usuario, puedeAcceso, cargarLiveData]);

  // Refresco en tiempo real mientras la pantalla está visible: polling cada 10s + refresco al recibir foco.
  useFocusEffect(
    useCallback(() => {
      cargarLiveData(false);

      const intervalId = setInterval(() => {
        cargarLiveData(false);
      }, 10000);

      return () => clearInterval(intervalId);
    }, [cargarLiveData]),
  );

  const [refrescando, setRefrescando] = useState(false);
  const onPullToRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarLiveData(false);
    setRefrescando(false);
  }, [cargarLiveData]);

  if (!usuario) return null;

  const toggleBandeja = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setBandejaAbierta((v) => !v);
  };

  const eliminarNotificacion = (id: number) => {
    Alert.alert('Eliminar notificación', '¿Eliminar esta notificación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await notificacionService.eliminar(id);
            setNotificaciones((prev) => prev.filter((n) => n.id !== id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const formatFecha = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const iconoNotificacion = (tipo: string): React.ComponentType<{ size?: number; color?: string }> => {
    const t = String(tipo ?? '').toUpperCase();
    if (t.includes('SALIDA_EMERGENCIA')) return AlertTriangle;
    if (t.includes('DESHABILITADO')) return AlertTriangle;
    if (t.includes('SOLICITUD_VEHICULO_APROBADA')) return CheckCircle2;
    if (t.includes('SOLICITUD_VEHICULO_RECHAZADA')) return XCircle;
    if (t.includes('SOLICITUD_VEHICULO')) return ClipboardList;
    if (t.includes('COMPARTIDO_VEHICULO_ELIMINADO')) return XCircle;
    if (t.includes('COMPARTIDO_REVOCADO')) return Lock;
    if (t.includes('COMPARTIDO_RENUNCIADO')) return UserMinus;
    if (t.includes('COMPARTIDO_ACEPTADO')) return Users;
    if (t.includes('COMPARTIDO_RECHAZADO')) return XCircle;
    if (t.includes('COMPARTIDO')) return Users;
    if (t.includes('VEHICULO_REGISTRADO_POR_ADMIN')) return Car;
    if (t.includes('VEHICULO_EDITADO_POR_ADMIN')) return Pencil;
    if (t.includes('VEHICULO_ELIMINADO_POR_ADMIN')) return XCircle;
    if (t.includes('PARQUEADERO_LLENO')) return AlertTriangle;
    if (t.includes('PARQUEADERO_UMBRAL_80')) return AlertTriangle;
    return Bell;
  };

  const colorNotificacion = (tipo: string) => {
    const t = String(tipo ?? '').toUpperCase();
    if (t.includes('SALIDA_EMERGENCIA')) return COLORS.bloqueoEmergencia;
    if (t.includes('DESHABILITADO')) return COLORS.bloqueoEmergencia;
    if (t.includes('RECHAZADA') || t.includes('RECHAZADO') || t.includes('ELIMINADO') || t.includes('REVOCADO')) return COLORS.bloqueoEmergencia;
    if (t.includes('APROBADA') || t.includes('ACEPTADO')) return COLORS.verdeActivo;
    return COLORS.alertaOcupacion;
  };

  const codigoAccesoBarras = String(codigoAcceso ?? '').trim();
  const codigoAccesoQrSeguro = String(codigoAccesoQr ?? '').trim();
  const tieneCodigoAcceso = Boolean(puedeAcceso && (codigoAccesoBarras || codigoAccesoQrSeguro));
  const pulseOpacity = animPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <View style={[styles.screen, { backgroundColor: T.fondo }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onPullToRefresh}
            colors={[COLORS.verdeActivo]}
            tintColor={COLORS.verdeActivo}
          />
        }
      >
        <View style={[styles.header, { backgroundColor: T.headerBg }]}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation?.openDrawer?.()}>
            <Text style={styles.menuButtonText}>≡</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <AvatarIniciales
              nombre={usuario.nombreCompleto}
              fotoUrl={usuario.fotoPersona}
              size={56}
            />

            <View style={styles.headerTextBlock}>
              <Text style={styles.bienvenida}>BIENVENIDO</Text>
              <Text style={styles.nombre} numberOfLines={2}>
                {String(usuario?.nombreCompleto ?? '').trim() || 'Cargando...'}
              </Text>
              <Text style={styles.documento}>{documentoSanitizado}</Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
            <View style={styles.badgeChip}>
              <Text style={styles.badgeChipText}>{esAprendiz ? fichaTexto : rolTexto}</Text>
            </View>
            <Animated.View style={[styles.badgeChip, { opacity: pulseOpacity }]}>
              <Text style={styles.badgeChipText}>{esAprendiz ? 'APRENDIZ ACTIVO' : 'SESIÓN ACTIVA'}</Text>
            </Animated.View>
          </View>
        </View>

        <View style={[styles.capacidadBanner, { backgroundColor: colorEstado }]}>
          <Text style={styles.capacidadTitulo}>ESTADO PARQUEADERO SENA</Text>
          <View style={styles.capacidadRow}>
            <Text style={styles.capacidadEstado}>{estado?.indicadorGlobal ?? 'SIN_DATOS'}</Text>
            <View style={styles.capacidadDivider} />
            <Text style={styles.capacidadCupos}>{Number(estado?.espaciosDisponibles ?? 0)}</Text>
            <Text style={styles.capacidadCuposLabel}>CUPOS LIBRES</Text>
          </View>

          {cargando ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.blanco} />
              <Text style={[styles.loadingText, { color: 'rgba(255,255,255,0.9)' }]}>Sincronizando datos institucionales...</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: T.superficie, borderColor: T.borde }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: esOscuro ? '#7FE34F' : COLORS.verdeOscuro }]}>CREDENCIAL VEHICULAR</Text>
          </View>

          <View style={styles.credencialBody}>
            <View style={styles.codeFrame}>
              <Animated.View style={[styles.codeInner, { opacity: animSwitch, transform: [{ scale: animSwitch.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }]}>
                {cargando ? (
                  <ActivityIndicator color={COLORS.verdeActivo} />
                ) : !puedeAcceso ? (
                  <Text style={[styles.codeUnavailable, { color: T.textoSecundario }]}>Disponible solo para Aprendiz</Text>
                ) : tieneCodigoAcceso ? (
                  <QRCode
                    value={codigoAccesoQrSeguro || codigoAccesoBarras}
                    size={170}
                    backgroundColor={COLORS.blanco}
                    color="#111827"
                  />
                ) : (
                  <Text style={[styles.codeUnavailable, { color: T.textoSecundario }]}>Código no disponible</Text>
                )}
              </Animated.View>
            </View>

            <Text style={[styles.credencialHint, { color: T.textoSecundario }]}>Presenta este código QR en la portería vehicular</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: T.superficie, borderColor: T.borde }]}>
          <TouchableOpacity style={styles.bandejaHeader} onPress={toggleBandeja} activeOpacity={0.85}>
            <Text style={[styles.cardTitle, { color: esOscuro ? '#7FE34F' : COLORS.verdeOscuro }]}>NOTIFICACIONES</Text>
            <Text style={[styles.bandejaToggle, { color: esOscuro ? '#7FE34F' : COLORS.verdeOscuro }]}>
              {bandejaAbierta ? 'OCULTAR' : 'MOSTRAR'}
            </Text>
          </TouchableOpacity>

          {bandejaAbierta ? (
            <View style={styles.bandejaBody}>
              {notificaciones.length === 0 ? (
                <Text style={[styles.bandejaEmpty, { color: T.textoSecundario }]}>
                  No hay notificaciones institucionales registradas.
                </Text>
              ) : (
                <View style={styles.bandejaList}>
                  {(verTodasNotif ? notificaciones : notificaciones.slice(0, 2)).map((n) => (
                    <View
                      key={n.id}
                      style={[
                        styles.notifCard,
                        {
                          backgroundColor: T.superficieAlt,
                          borderColor: T.borde,
                          borderLeftColor: colorNotificacion(n.tipo),
                        },
                      ]}
                    >
                      <View style={[styles.notifIcon, { backgroundColor: colorNotificacion(n.tipo) }]}>
                        {(() => { const IconoNotif = iconoNotificacion(n.tipo); return <IconoNotif size={18} color="#ffffff" />; })()}
                      </View>

                      <View style={styles.notifContent}>
                        <Text style={[styles.notifTitle, { color: T.textoPrimario }]} numberOfLines={2}>
                          {String(n?.titulo ?? '')}
                        </Text>
                        <Text style={[styles.notifMessage, { color: T.textoSecundario }]} numberOfLines={4}>
                          {String(n?.mensaje ?? '')}
                        </Text>
                        <View style={styles.notifMetaRow}>
                          <Text style={[styles.notifMetaText, { color: T.textoTenue }]}>
                            {formatFecha(String(n?.createdAt ?? ''))}
                          </Text>
                          <Text style={[styles.notifMetaDot, { color: T.textoTenue }]}>•</Text>
                          <Text style={[styles.notifMetaText, { color: T.textoTenue }]}>
                            {n?.actorNombre ? `Firmado: ${String(n.actorNombre)}` : 'Firmado: Sistema'}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.notifEliminarBtn}
                        onPress={() => eliminarNotificacion(n.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.notifEliminarTxt}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {notificaciones.length > 2 ? (
                    <TouchableOpacity
                      style={styles.verMasBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setVerTodasNotif((v) => !v);
                      }}
                    >
                      <Text style={[styles.verMasTexto, { color: esOscuro ? '#7FE34F' : COLORS.verdeOscuro }]}>
                        {verTodasNotif
                          ? `Mostrar solo las últimas 2`
                          : `Ver todas (${notificaciones.length})`}
                      </Text>
                      <ChevronDown
                        size={18}
                        color={esOscuro ? '#7FE34F' : COLORS.verdeOscuro}
                        style={{ transform: [{ rotate: verTodasNotif ? '180deg' : '0deg' }] }}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.fondoBase,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  header: {
    backgroundColor: COLORS.verdeOscuro,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44) + 12,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 0,
  },
  menuButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  menuButtonText: {
    color: COLORS.blanco,
    fontSize: 18,
    fontWeight: '900',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.blanco,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerTextBlock: {
    flex: 1,
  },
  bienvenida: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  nombre: {
    color: COLORS.blanco,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  documento: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badgeChip: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  badgeChipText: {
    color: COLORS.blanco,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: COLORS.blanco,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borde,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: COLORS.sombra, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 4 },
    }),
  },
  capacidadBanner: {
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: COLORS.sombra, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 4 },
    }),
  },
  capacidadTitulo: {
    color: COLORS.blanco,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  capacidadRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  capacidadEstado: {
    color: COLORS.blanco,
    fontSize: 18,
    fontWeight: '900',
  },
  capacidadDivider: {
    width: 10,
  },
  capacidadCupos: {
    color: COLORS.blanco,
    fontSize: 34,
    fontWeight: '900',
    marginLeft: 8,
    lineHeight: 36,
  },
  capacidadCuposLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginLeft: 8,
    marginBottom: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  loadingText: {
    color: COLORS.textoSuave,
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    color: COLORS.verdeOscuro,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    color: COLORS.textoSuave,
    fontSize: 11,
    fontWeight: '700',
  },
  credencialBody: {
    marginTop: 14,
  },
  codeFrame: {
    height: 210,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borde,
    backgroundColor: COLORS.blanco,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeInner: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  codeUnavailable: {
    color: COLORS.textoSuave,
    fontSize: 13,
    fontWeight: '700',
  },
  credencialHint: {
    color: COLORS.textoSuave,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
  bandejaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bandejaToggle: {
    color: COLORS.verdeOscuro,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  bandejaBody: {
    marginTop: 12,
  },
  bandejaEmpty: {
    color: COLORS.textoSuave,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
  },
  bandejaList: {
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borde,
    borderLeftWidth: 6,
    backgroundColor: COLORS.blanco,
  },
  notifIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIconText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: '900',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    color: COLORS.texto,
    fontSize: 13,
    fontWeight: '900',
  },
  notifMessage: {
    color: COLORS.textoSuave,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  notifMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  notifMetaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  notifMetaDot: {
    color: '#94A3B8',
    marginHorizontal: 6,
    fontWeight: '900',
  },
  footerSpace: {
    height: 10,
  },
  notifEliminarBtn: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(211,47,47,0.08)',
  },
  notifEliminarTxt: {
    color: '#D32F2F',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
    textAlign: 'center',
  },
  verMasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
    gap: 6,
  },
  verMasTexto: {
    color: COLORS.verdeOscuro,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  verMasFlecha: {
    color: COLORS.verdeOscuro,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 22,
    transform: [{ rotate: '0deg' }],
  },
  verMasFlechaUp: {
    transform: [{ rotate: '180deg' }],
  },
});
