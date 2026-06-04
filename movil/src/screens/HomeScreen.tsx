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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import AvatarIniciales from '../components/AvatarIniciales';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../services/api';
import { notificacionService } from '../services/notificacionService';

type IndicadorGlobal = 'DISPONIBLE' | 'LLENO' | 'DESHABILITADO' | 'SIN_DATOS'; // RF16: estados de capacidad consumibles por UI.

type EstadoAprendiz = { // RF16: payload mínimo que el backend expone al aprendiz sin información administrativa sensible.
  indicadorGlobal: IndicadorGlobal; // RF16: estado global del parqueadero.
  espaciosDisponibles: number; // RF16: contador de cupos libres para lectura rápida.
}; // RF16: estructura tipada para evitar errores de integración.

type CodigoAccesoResponse = { // RF8: payload del endpoint /usuarios/codigo-acceso.
  tokenAccesoVehicular: string | null; // RNF2: token opaco (sin cédula) codificable en Code128/QR.
}; // RF8: estructura tipada para estabilidad.

type NotificacionUsuario = { // RF25: estructura de notificación consumida por bandeja del aprendiz.
  id: number; // RF25: id interno para key estable.
  tipo: string; // RF25: tipo semántico (SALIDA_EMERGENCIA, PARQUEADERO_DESHABILITADO, etc.).
  titulo: string; // RF25: título corto para lectura rápida.
  mensaje: string; // RF25: detalle legible del evento.
  actorNombre: string | null; // RF25: nombre del administrador que firmó el evento.
  createdAt: string; // RF25: fecha de creación (orden y display).
  leidaAt?: string | null; // RF25: estado de lectura (si el backend lo expone).
}; // RF25: tipado estricto para UI confiable.

const COLORS = { // UI: paleta oficial SENA exigida por requerimiento.
  verdeActivo: '#39A900', // Requisito: Verde Activo SENA (éxito/Disponible/botones).
  verdeOscuro: '#003939', // Requisito: Verde Oscuro Institucional (encabezados/títulos).
  fondoBase: '#F4F7F6', // Requisito: Fondo base de la app (baja fatiga visual).
  alertaOcupacion: '#FF6B00', // Requisito: color para LLENO / alerta.
  bloqueoEmergencia: '#D32F2F', // Requisito: color para DESHABILITADO / emergencia.
  blanco: '#FFFFFF', // UI: base de tarjetas premium.
  texto: '#0F172A', // UI: alto contraste para accesibilidad institucional.
  textoSuave: '#475569', // UI: texto secundario legible.
  borde: 'rgba(15, 23, 42, 0.10)', // UI: borde sutil para tarjetas (premium).
  sombra: 'rgba(15, 23, 42, 0.14)', // UI: sombra suave para iOS.
}; // UI: constantes centralizadas para consistencia visual.

export default function HomeScreen({ navigation }: { navigation: any }) {
  const { usuario } = useAuth();
  const { esOscuro } = useTheme();

  const esAprendiz = Number(usuario?.idTipoUsr ?? 0) === 1;

  // Paleta dinámica según tema
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

  const [codigoAcceso, setCodigoAcceso] = useState<string>(''); // RF8/RNF2: token opaco (alfanumérico) para render Code128.
  const [codigoAccesoQr, setCodigoAccesoQr] = useState<string>(''); // RF8/RNF2: token opaco (puede incluir guiones) para render QR.
  const [estado, setEstado] = useState<EstadoAprendiz>({ // RF16: estado inicial neutral mientras carga.
    indicadorGlobal: 'SIN_DATOS', // RF16: valor seguro si aún no hay respuesta.
    espaciosDisponibles: 0, // RF16: contador inicial.
  }); // RF16: estado tipado.
  const [notificaciones, setNotificaciones] = useState<NotificacionUsuario[]>([]); // RF25: historial de eventos para bandeja del aprendiz.
  const [bandejaAbierta, setBandejaAbierta] = useState<boolean>(true); // RF25: colapsable por UX (menos ruido visual).
  const [verTodasNotif, setVerTodasNotif] = useState<boolean>(false); // RF25: por defecto solo se muestran las 2 más recientes.
  const [cargando, setCargando] = useState<boolean>(true); // UX: loading global para sincronización de datos críticos.

  const animSwitch = useRef(new Animated.Value(1)).current; // UX: controla fade/scale al alternar BARRAS/QR (evita layout thrashing).
  const animPulse = useRef(new Animated.Value(0)).current; // UX: pulse sutil para dar vida a la UI sin distraer.

  const initiales = useMemo(() => { // RF7: avatar minimalista basado en iniciales (sin exponer PII extra).
    const nombre = String(usuario?.nombreCompleto ?? '').trim(); // RF7: toma nombre completo del perfil.
    if (!nombre) return 'S'; // RF7: fallback institucional si falta nombre.
    const partes = nombre.split(/\s+/).filter(Boolean); // RF7: separa palabras para iniciales.
    const primera = partes[0]?.[0] ?? 'S'; // RF7: inicial 1.
    const segunda = partes.length > 1 ? (partes[1]?.[0] ?? '') : ''; // RF7: inicial 2 si existe.
    return `${primera}${segunda}`.toUpperCase(); // RF7: normaliza a mayúsculas.
  }, [usuario?.nombreCompleto]); // UX: recalcula solo si cambia el nombre.

  const documentoSanitizado = useMemo(() => { // RNF2/RF7: máscara defensiva de documento para privacidad.
    const doc = String(usuario?.documento ?? '').trim(); // RNF2: obtiene documento sin asumir formato.
    const last4 = doc.length >= 4 ? doc.slice(-4) : doc; // RNF2: conserva solo últimos 4 para identificación visual mínima.
    return `CC *****${last4}`; // RNF2: evita exposición de cédula completa.
  }, [usuario?.documento]); // RNF2: recalcula solo si cambia el documento.

  const fichaTexto = useMemo(() => { // RF7: muestra ficha de formación (badge).
    const raw = String(usuario?.idFormacion ?? '').trim(); // RF7: idFormacion es el dato disponible en el modelo actual.
    return raw.length ? `FICHA ${raw}` : 'FICHA SIN ASIGNAR'; // RF7: fallback claro si no existe.
  }, [usuario?.idFormacion]); // RF7: recalcula solo si cambia la ficha.

  const rolTexto = useMemo(() => {
    const idRol = Number(usuario?.idTipoUsr ?? 0);
    if (idRol === 1) return 'APRENDIZ ACTIVO';
    if (idRol === 2) return 'ADMINISTRADOR';
    if (idRol === 3) return 'OPERATIVO';
    return 'USUARIO';
  }, [usuario?.idTipoUsr]);

  const colorEstado = useMemo(() => { // RF16: color de fondo dinámico según estado.
    if (estado.indicadorGlobal === 'DISPONIBLE') return COLORS.verdeActivo; // RF16: disponible = verde.
    if (estado.indicadorGlobal === 'LLENO') return COLORS.alertaOcupacion; // RF16: lleno = naranja institucional.
    if (estado.indicadorGlobal === 'DESHABILITADO') return COLORS.bloqueoEmergencia; // RF16: deshabilitado = rojo.
    return '#94A3B8'; // RF16: sin datos = gris neutro accesible.
  }, [estado.indicadorGlobal]); // RF16: recalcula solo si cambia el estado.

  useEffect(() => { // UX: animación suave permanente para dar “vida” a insignias sin distraer.
    Animated.loop( // UX: loop infinito de pulse.
      Animated.sequence([ // UX: alterna opacidad de manera sutil.
        Animated.timing(animPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), // UX: sube.
        Animated.timing(animPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }), // UX: baja.
      ]), // UX: secuencia de pulse.
    ).start(); // UX: inicia al montar.
  }, [animPulse]); // UX: depende de la referencia animada.

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

  // Carga inicial: QR (1 vez) + datos en vivo
  useEffect(() => {
    let activo = true;
    const normalizeTokenRaw = (value: string) => String(value ?? '').trim();
    const toBarcodeToken = (value: string) =>
      String(value ?? '').trim().replace(/[^0-9a-zA-Z]/g, '').toUpperCase();

    (async () => {
      if (!usuario) return;
      setCargando(true);
      try {
        if (esAprendiz) {
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
  }, [usuario, esAprendiz, cargarLiveData]);

  // 🔴 Refresco en TIEMPO REAL mientras la pantalla está visible.
  // Polling cada 10s + refresco al recibir foco.
  useFocusEffect(
    useCallback(() => {
      // Refresco inmediato al entrar a Mi Perfil
      cargarLiveData(false);

      const intervalId = setInterval(() => {
        cargarLiveData(false);
      }, 10000); // cada 10 segundos

      return () => clearInterval(intervalId);
    }, [cargarLiveData]),
  );

  const [refrescando, setRefrescando] = useState(false);
  const onPullToRefresh = useCallback(async () => {
    setRefrescando(true);
    await cargarLiveData(false);
    setRefrescando(false);
  }, [cargarLiveData]);

  if (!usuario) return null; // RF7: sin sesión, no renderiza contenido (evita flashes con datos vacíos).

  const toggleBandeja = () => { // RF25: interacción para abrir/cerrar bandeja.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // UX: animación de layout para colapso suave.
    setBandejaAbierta((v) => !v); // RF25: alterna estado de expansión.
  }; // RF25: fin toggle.

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

  const formatFecha = (iso: string) => { // RF25: formatea fecha legible para el aprendiz.
    const d = new Date(iso); // RF25: parse de ISO proveniente del backend.
    if (Number.isNaN(d.getTime())) return iso; // RF25: fallback si la fecha no es parseable.
    return d.toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); // RF25: formato claro en español Colombia.
  }; // RF25: fin formatFecha.

  const iconoNotificacion = (tipo: string) => { // RF25: iconografía ligera sin librerías externas (estabilidad Expo).
    const t = String(tipo ?? '').toUpperCase(); // RF25: normaliza para comparar.
    if (t.includes('SALIDA_EMERGENCIA')) return '⛔'; // RF25: icono semántico para emergencia.
    if (t.includes('DESHABILITADO')) return '🚫'; // RF25: icono semántico para bloqueo.
    if (t.includes('SOLICITUD_VEHICULO_APROBADA')) return '✅';
    if (t.includes('SOLICITUD_VEHICULO_RECHAZADA')) return '❌';
    if (t.includes('SOLICITUD_VEHICULO')) return '📋';
    if (t.includes('COMPARTIDO_VEHICULO_ELIMINADO')) return '🗑️';
    if (t.includes('COMPARTIDO_REVOCADO')) return '🔒';
    if (t.includes('COMPARTIDO_RENUNCIADO')) return '👋';
    if (t.includes('COMPARTIDO_ACEPTADO')) return '🤝';
    if (t.includes('COMPARTIDO_RECHAZADO')) return '✖️';
    if (t.includes('COMPARTIDO')) return '🤝';
    if (t.includes('VEHICULO_REGISTRADO_POR_ADMIN')) return '🚗';
    if (t.includes('VEHICULO_EDITADO_POR_ADMIN')) return '✏️';
    if (t.includes('VEHICULO_ELIMINADO_POR_ADMIN')) return '🗑️';
    if (t.includes('PARQUEADERO_LLENO')) return '🚫';
    if (t.includes('PARQUEADERO_UMBRAL_80')) return '⚠️';
    return '🔔'; // RF25: icono general de notificación.
  }; // RF25: fin iconoNotificacion.

  const colorNotificacion = (tipo: string) => { // RF25: color por severidad para escaneo visual.
    const t = String(tipo ?? '').toUpperCase(); // RF25: normaliza.
    if (t.includes('SALIDA_EMERGENCIA')) return COLORS.bloqueoEmergencia; // RF25: emergencia en rojo.
    if (t.includes('DESHABILITADO')) return COLORS.bloqueoEmergencia; // RF25: deshabilitado en rojo.
    if (t.includes('RECHAZADA') || t.includes('RECHAZADO') || t.includes('ELIMINADO') || t.includes('REVOCADO')) return COLORS.bloqueoEmergencia;
    if (t.includes('APROBADA') || t.includes('ACEPTADO')) return COLORS.verdeActivo;
    return COLORS.alertaOcupacion; // RF25: otras alertas en naranja.
  }; // RF25: fin colorNotificacion.

  const codigoAccesoBarras = String(codigoAcceso ?? '').trim();
  const codigoAccesoQrSeguro = String(codigoAccesoQr ?? '').trim();
  const tieneCodigoAcceso = Boolean(esAprendiz && (codigoAccesoBarras || codigoAccesoQrSeguro));
  const sincronizado = Boolean(tieneCodigoAcceso && !cargando);
  const pulseOpacity = animPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }); // UX: opacidad pulsante sutil.

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

        <View style={[styles.card, { backgroundColor: T.superficie, borderColor: T.borde }]}>
          <View style={[styles.capacidadBanner, { backgroundColor: colorEstado }]}>
            <Text style={styles.capacidadTitulo}>ESTADO PARQUEADERO SENA</Text>
            <View style={styles.capacidadRow}>
              <Text style={styles.capacidadEstado}>{estado?.indicadorGlobal ?? 'SIN_DATOS'}</Text>
              <View style={styles.capacidadDivider} />
              <Text style={styles.capacidadCupos}>{Number(estado?.espaciosDisponibles ?? 0)}</Text>
              <Text style={styles.capacidadCuposLabel}>CUPOS LIBRES</Text>
            </View>
          </View>

          {cargando ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.verdeActivo} />
              <Text style={[styles.loadingText, { color: T.textoSecundario }]}>Sincronizando datos institucionales...</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: T.superficie, borderColor: T.borde }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: esOscuro ? '#7FE34F' : COLORS.verdeOscuro }]}>CREDENCIAL VEHICULAR</Text>
            <View style={styles.syncRow}>
              <View style={[styles.syncDot, { backgroundColor: sincronizado ? COLORS.verdeActivo : COLORS.alertaOcupacion }]} />
              <Text style={[styles.syncText, { color: T.textoSecundario }]}>{sincronizado ? 'Lector de Portería Sincronizado' : 'Sincronizando...'}</Text>
            </View>
          </View>

          <View style={styles.credencialBody}>
            <View style={styles.codeFrame}>
              <Animated.View style={[styles.codeInner, { opacity: animSwitch, transform: [{ scale: animSwitch.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }]}>
                {cargando ? (
                  <ActivityIndicator color={COLORS.verdeActivo} />
                ) : !esAprendiz ? (
                  <Text style={[styles.codeUnavailable, { color: T.textoSecundario }]}>Disponible solo para Aprendiz</Text>
                ) : tieneCodigoAcceso ? (
                  <QRCode
                    value={codigoAccesoQrSeguro || codigoAccesoBarras}
                    size={170} // UX: tamaño estable dentro del frame.
                    backgroundColor={COLORS.blanco} // UI: fondo blanco para contraste.
                    color="#111827" // UI: alto contraste.
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
                        <Text style={styles.notifIconText}>{iconoNotificacion(n.tipo)}</Text>
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
                      <Text
                        style={[
                          styles.verMasFlecha,
                          { color: esOscuro ? '#7FE34F' : COLORS.verdeOscuro },
                          verTodasNotif && styles.verMasFlechaUp,
                        ]}
                      >
                        ⌄
                      </Text>
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
  ); // UI: fin return.
} // UI: fin componente.

const styles = StyleSheet.create({ // UI: StyleSheet nativo para rendimiento y consistencia.
  screen: { // UI: contenedor raíz.
    flex: 1, // UI: ocupa toda la pantalla.
    backgroundColor: COLORS.fondoBase, // UI: fondo oficial (requisito).
  }, // UI: fin screen.
  content: { // UX: padding global en múltiplos de 4/8.
    padding: 16, // UX: 16px = 2*8 (espaciado institucional).
    paddingBottom: 28, // UX: aire inferior para scroll cómodo.
  }, // UX: fin content.
  header: { // RF7: encabezado institucional.
    backgroundColor: COLORS.verdeOscuro, // RF7: verde oscuro requerido para cabeceras.
    borderRadius: 12, // UI: bordes elegantes exigidos.
    padding: 16, // UX: padding consistente.
    marginBottom: 16, // UX: separación con la siguiente tarjeta.
    ...Platform.select({ // UI: sombras suaves (iOS) y elevation (Android).
      ios: { shadowColor: COLORS.sombra, shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }, // UI: sombra premium.
      android: { elevation: 6 }, // UI: elevación suave.
    }), // UI: fin select sombras.
  }, // RF7: fin header.
  menuButton: { // UX: botón para abrir el drawer.
    alignSelf: 'flex-start', // UX: ancla arriba a la izquierda.
    paddingVertical: 6, // UX: área táctil suficiente.
    paddingHorizontal: 10, // UX: área táctil suficiente.
    borderRadius: 10, // UI: consistente con bordes.
    backgroundColor: 'rgba(255,255,255,0.12)', // UI: contraste suave sobre verde oscuro.
    marginBottom: 12, // UX: separación del contenido principal del header.
  }, // UX: fin menuButton.
  menuButtonText: { // UI: ícono texto.
    color: COLORS.blanco, // UI: contraste alto.
    fontSize: 18, // UI: legible.
    fontWeight: '900', // UI: peso institucional.
  }, // UI: fin menuButtonText.
  headerRow: { // UI: fila avatar + textos.
    flexDirection: 'row', // UI: layout horizontal.
    alignItems: 'center', // UI: centra verticalmente.
  }, // UI: fin headerRow.
  avatar: { // RF7: avatar minimalista.
    width: 56, // UI: tamaño estable.
    height: 56, // UI: tamaño estable.
    borderRadius: 28, // UI: círculo perfecto.
    backgroundColor: 'rgba(255,255,255,0.18)', // UI: contraste suave sobre header.
    justifyContent: 'center', // UI: centra iniciales.
    alignItems: 'center', // UI: centra iniciales.
    marginRight: 12, // UX: espacio con el texto.
  }, // RF7: fin avatar.
  avatarText: { // RF7: iniciales.
    color: COLORS.blanco, // UI: alto contraste.
    fontSize: 18, // UI: legible.
    fontWeight: '900', // UI: prominente.
    letterSpacing: 1, // UI: look institucional.
  }, // RF7: fin avatarText.
  headerTextBlock: { // RF7: bloque tipográfico.
    flex: 1, // UI: ocupa el espacio restante.
  }, // RF7: fin headerTextBlock.
  bienvenida: { // RF7: etiqueta de bienvenida.
    color: 'rgba(255,255,255,0.78)', // UI: secundario sobre header.
    fontSize: 11, // UI: jerarquía menor.
    fontWeight: '800', // UI: institucional.
    letterSpacing: 1.6, // UI: estilo SENA (mayúsculas espaciadas).
  }, // RF7: fin bienvenida.
  nombre: { // RF7: nombre del aprendiz.
    color: COLORS.blanco, // UI: alto contraste.
    fontSize: 18, // UI: prominente.
    fontWeight: '900', // UI: negrita institucional.
    marginTop: 2, // UX: microespacio.
  }, // RF7: fin nombre.
  documento: { // RNF2/RF7: documento sanitizado.
    color: 'rgba(255,255,255,0.78)', // UI: secundario.
    fontSize: 12, // UI: legible.
    fontWeight: '700', // UI: firme pero no dominante.
    marginTop: 4, // UX: separación.
  }, // RNF2: fin documento.
  badgesRow: { // RF7: fila de chips.
    flexDirection: 'row', // UI: chips en línea.
    flexWrap: 'wrap', // UI: wrap si pantalla pequeña.
    gap: 8, // UX: separación consistente.
    marginTop: 14, // UX: aire respecto a cabecera.
  }, // RF7: fin badgesRow.
  badgeChip: { // RF7: chip institucional.
    backgroundColor: 'rgba(255,255,255,0.14)', // UI: sutil sobre header.
    borderRadius: 999, // UI: pill shape.
    paddingVertical: 8, // UX: área táctil/visual.
    paddingHorizontal: 12, // UX: área táctil/visual.
  }, // RF7: fin chip.
  badgeChipText: { // RF7: texto chip.
    color: COLORS.blanco, // UI: contraste alto.
    fontSize: 11, // UI: compacto.
    fontWeight: '900', // UI: institucional.
    letterSpacing: 0.8, // UI: look formal.
  }, // RF7: fin chip text.
  card: { // UI: tarjeta base para secciones.
    backgroundColor: COLORS.blanco, // UI: blanco inmaculado requerido para premium.
    borderRadius: 12, // UI: borderRadius obligatorio.
    borderWidth: 1, // UI: borde sutil.
    borderColor: COLORS.borde, // UI: borde texturizado (sutil).
    padding: 16, // UX: padding consistente.
    marginBottom: 16, // UX: separación vertical.
    ...Platform.select({ // UI: sombras suaves.
      ios: { shadowColor: COLORS.sombra, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } }, // UI: sombra premium.
      android: { elevation: 4 }, // UI: elevación discreta.
    }), // UI: fin select.
  }, // UI: fin card.
  capacidadBanner: { // RF16: banner dinámico.
    borderRadius: 12, // UI: coherencia con tarjetas.
    padding: 16, // UX: padding cómodo.
  }, // RF16: fin banner.
  capacidadTitulo: { // RF16: título.
    color: COLORS.blanco, // UI: contraste sobre fondo dinámico.
    fontSize: 11, // UI: jerarquía.
    fontWeight: '900', // UI: institucional.
    letterSpacing: 1.4, // UI: formal.
  }, // RF16: fin capacidadTitulo.
  capacidadRow: { // RF16: fila de estado y cupos.
    flexDirection: 'row', // UI: layout horizontal.
    alignItems: 'flex-end', // UI: alinea baseline visual.
    marginTop: 10, // UX: separación.
    flexWrap: 'wrap', // UI: evita overflow en pantallas pequeñas.
  }, // RF16: fin row.
  capacidadEstado: { // RF16: estado.
    color: COLORS.blanco, // UI: contraste.
    fontSize: 18, // RF16: grande para lectura rápida.
    fontWeight: '900', // UI: fuerte.
  }, // RF16: fin estado.
  capacidadDivider: { // UI: separador vertical.
    width: 10, // UI: espacio.
  }, // UI: fin divider.
  capacidadCupos: { // RF16: número de cupos.
    color: COLORS.blanco, // UI: contraste.
    fontSize: 34, // RF16: número grande para lectura rápida.
    fontWeight: '900', // UI: fuerte.
    marginLeft: 8, // UX: separación con el estado.
    lineHeight: 36, // UI: evita salto vertical.
  }, // RF16: fin cupos.
  capacidadCuposLabel: { // RF16: etiqueta.
    color: 'rgba(255,255,255,0.92)', // UI: ligeramente más suave.
    fontSize: 11, // UI: jerarquía menor.
    fontWeight: '900', // UI: institucional.
    letterSpacing: 1.4, // UI: formal.
    marginLeft: 8, // UX: separación del número.
    marginBottom: 6, // UX: alinea visualmente con la base del número.
  }, // RF16: fin label.
  loadingRow: { // UX: fila de sincronización.
    flexDirection: 'row', // UI: spinner + texto.
    alignItems: 'center', // UI: centrado.
    marginTop: 14, // UX: separación del banner.
    gap: 10, // UX: separación consistente.
  }, // UX: fin loadingRow.
  loadingText: { // UX: texto de carga.
    color: COLORS.textoSuave, // UI: secundario.
    fontSize: 12, // UI: legible.
    fontWeight: '700', // UI: firme.
  }, // UX: fin loadingText.
  cardHeaderRow: { // RF8: encabezado de credencial.
    flexDirection: 'row', // UI: título a la izquierda, indicador a la derecha.
    alignItems: 'flex-start', // UI: alineación superior.
    justifyContent: 'space-between', // UI: distribución.
    gap: 12, // UX: separación.
  }, // RF8: fin cardHeaderRow.
  cardTitle: { // UI: título card.
    color: COLORS.verdeOscuro, // UI: usa verde oscuro institucional.
    fontSize: 12, // UI: jerarquía.
    fontWeight: '900', // UI: institucional.
    letterSpacing: 1.4, // UI: formal.
  }, // UI: fin cardTitle.
  syncRow: { // RF8: fila indicador sincronización.
    flexDirection: 'row', // UI: dot + texto.
    alignItems: 'center', // UI: centrado.
    gap: 6, // UX: separación.
  }, // RF8: fin syncRow.
  syncDot: { // RF8: punto indicador.
    width: 8, // UI: tamaño sutil.
    height: 8, // UI: tamaño sutil.
    borderRadius: 4, // UI: círculo.
  }, // RF8: fin syncDot.
  syncText: { // RF8: texto indicador.
    color: COLORS.textoSuave, // UI: secundario.
    fontSize: 11, // UI: compacto.
    fontWeight: '700', // UI: firme.
  }, // RF8: fin syncText.
  credencialBody: { // RF8: cuerpo credencial.
    marginTop: 14, // UX: separación del encabezado.
  }, // RF8: fin credencialBody.
  codeFrame: { // RF8: frame estable para evitar saltos al alternar.
    height: 210, // RF8: altura fija (layout estable).
    borderRadius: 12, // UI: coherencia.
    borderWidth: 1, // UI: borde texturizado.
    borderColor: COLORS.borde, // UI: borde sutil.
    backgroundColor: COLORS.blanco, // UI: blanco inmaculado.
    justifyContent: 'center', // UX: centra el código.
    alignItems: 'center', // UX: centra el código.
  }, // RF8: fin codeFrame.
  codeInner: { // RF8: contenedor interno del código.
    justifyContent: 'center', // UX: centra.
    alignItems: 'center', // UX: centra.
    width: '100%', // UI: ocupa el ancho del frame.
  }, // RF8: fin codeInner.
  codeUnavailable: { // UX: fallback sin token.
    color: COLORS.textoSuave, // UI: secundario.
    fontSize: 13, // UI: legible.
    fontWeight: '700', // UI: firme.
  }, // UX: fin codeUnavailable.
  credencialHint: { // RF8: instrucción.
    color: COLORS.textoSuave, // UI: secundario.
    fontSize: 12, // UI: legible.
    fontWeight: '700', // UI: institucional.
    textAlign: 'center', // UX: centrado.
    marginTop: 12, // UX: separación.
  }, // RF8: fin hint.
  bandejaHeader: { // RF25: header de bandeja.
    flexDirection: 'row', // UI: título + acción.
    alignItems: 'center', // UI: centrado.
    justifyContent: 'space-between', // UI: distribución.
  }, // RF25: fin bandejaHeader.
  bandejaToggle: { // RF25: texto mostrar/ocultar.
    color: COLORS.verdeOscuro, // UI: coherencia con identidad.
    fontSize: 11, // UI: compacto.
    fontWeight: '900', // UI: institucional.
    letterSpacing: 1.2, // UI: formal.
  }, // RF25: fin bandejaToggle.
  bandejaBody: { // RF25: cuerpo.
    marginTop: 12, // UX: separación.
  }, // RF25: fin bandejaBody.
  bandejaEmpty: { // RF25: estado vacío.
    color: COLORS.textoSuave, // UI: secundario.
    fontSize: 12, // UI: legible.
    fontWeight: '700', // UI: institucional.
    textAlign: 'center', // UX: centrado.
    paddingVertical: 14, // UX: aire.
  }, // RF25: fin bandejaEmpty.
  bandejaList: { // RF25: lista.
    gap: 10, // UX: separación entre tarjetas.
  }, // RF25: fin bandejaList.
  notifCard: { // RF25: tarjeta de notificación.
    flexDirection: 'row', // UI: icono + contenido.
    gap: 10, // UX: separación.
    padding: 12, // UX: padding.
    borderRadius: 12, // UI: coherencia.
    borderWidth: 1, // UI: borde sutil.
    borderColor: COLORS.borde, // UI: borde texturizado.
    borderLeftWidth: 6, // RF25: acento visual por severidad.
    backgroundColor: COLORS.blanco, // UI: base blanca.
  }, // RF25: fin notifCard.
  notifIcon: { // RF25: icono contenedor.
    width: 34, // UI: tamaño fijo.
    height: 34, // UI: tamaño fijo.
    borderRadius: 10, // UI: suave.
    justifyContent: 'center', // UI: centra icono.
    alignItems: 'center', // UI: centra icono.
  }, // RF25: fin notifIcon.
  notifIconText: { // RF25: icono texto.
    color: COLORS.blanco, // UI: contraste.
    fontSize: 16, // UI: legible.
    fontWeight: '900', // UI: fuerte.
  }, // RF25: fin notifIconText.
  notifContent: { // RF25: contenido.
    flex: 1, // UI: ocupa el espacio restante.
  }, // RF25: fin notifContent.
  notifTitle: { // RF25: título.
    color: COLORS.texto, // UI: alto contraste.
    fontSize: 13, // UI: jerarquía.
    fontWeight: '900', // UI: institucional.
  }, // RF25: fin notifTitle.
  notifMessage: { // RF25: mensaje.
    color: COLORS.textoSuave, // UI: secundario.
    fontSize: 12, // UI: legible.
    fontWeight: '700', // UI: firme.
    marginTop: 4, // UX: separación.
  }, // RF25: fin notifMessage.
  notifMetaRow: { // RF25: fila metadatos.
    flexDirection: 'row', // UI: inline.
    alignItems: 'center', // UI: centrado.
    flexWrap: 'wrap', // UI: wrap si es largo.
    marginTop: 8, // UX: separación.
  }, // RF25: fin notifMetaRow.
  notifMetaText: { // RF25: texto meta.
    color: '#64748B', // UI: neutro.
    fontSize: 11, // UI: compacto.
    fontWeight: '800', // UI: institucional.
  }, // RF25: fin notifMetaText.
  notifMetaDot: { // UI: separador dot.
    color: '#94A3B8', // UI: neutro.
    marginHorizontal: 6, // UX: espacio alrededor.
    fontWeight: '900', // UI: visible.
  }, // UI: fin dot.
  footerSpace: { // UX: espacio final.
    height: 10, // UX: respiración.
  }, // UX: fin footerSpace.
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
}); // UI: fin StyleSheet.
