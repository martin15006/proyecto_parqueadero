import React, { useEffect, useMemo, useRef, useState } from 'react'; // UI: React hooks para estado, efectos y memoización.
import { // UI: importación de componentes nativos para una UI consistente y performante en iOS/Android.
  ActivityIndicator, // UX: indicador de carga para llamadas a backend (RF16/RF25).
  Animated, // UX: animaciones suaves de transiciones (RF8, experiencia premium).
  Easing, // UX: curvas de animación para suavidad institucional.
  LayoutAnimation, // UX: animación de expansión/colapso de la bandeja (RF25).
  Platform, // UX: diferencias iOS/Android para sombras y LayoutAnimation.
  ScrollView, // UX: permite scroll vertical manteniendo tarjetas estables (RF5).
  StyleSheet, // UI: estilos nativos con rendimiento óptimo (directriz).
  Text, // UI: render tipográfico.
  TouchableOpacity, // UX: interacción táctil con feedback.
  UIManager, // UX: habilita LayoutAnimation en Android (estabilidad).
  View, // UI: layout base.
} from 'react-native'; // UI: runtime React Native.
import Barcode from 'react-native-barcode-qr-generator'; // RF8: render de Code128/QR en Expo sin depender de hardware QR actual.
import QRCode from 'react-native-qrcode-svg'; // RF8: render QR para compatibilidad futura (conmutación).
import { useAuth } from '../context/AuthContext'; // RF7: fuente de sesión y perfil del aprendiz.
import { apiRequest } from '../services/api'; // RF16/RF25: cliente HTTP tipado con auth y manejo de sesión inválida.

type ModoVisualizacion = 'BARRAS' | 'QR'; // RF8: modos explícitos para conmutación dual.

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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) { // UX: habilita LayoutAnimation solo en Android para evitar crash.
  UIManager.setLayoutAnimationEnabledExperimental(true); // UX: activa animaciones de layout (bandeja RF25).
} // UX: evita llamadas innecesarias en iOS.

export default function HomeScreen({ navigation }: { navigation: any }) { // UX: navegación del Drawer sin romper integración existente.
  const { usuario } = useAuth(); // RF7: obtiene perfil autenticado del aprendiz desde contexto de sesión.

  const esAprendiz = Number(usuario?.idTipoUsr ?? 0) === 1;

  const [modoVisualizacion, setModoVisualizacion] = useState<ModoVisualizacion>('BARRAS'); // RF8: inicia en BARRAS por hardware actual de portería.
  const [codigoAcceso, setCodigoAcceso] = useState<string>(''); // RF8/RNF2: token opaco (alfanumérico) para render Code128.
  const [codigoAccesoQr, setCodigoAccesoQr] = useState<string>(''); // RF8/RNF2: token opaco (puede incluir guiones) para render QR.
  const [estado, setEstado] = useState<EstadoAprendiz>({ // RF16: estado inicial neutral mientras carga.
    indicadorGlobal: 'SIN_DATOS', // RF16: valor seguro si aún no hay respuesta.
    espaciosDisponibles: 0, // RF16: contador inicial.
  }); // RF16: estado tipado.
  const [notificaciones, setNotificaciones] = useState<NotificacionUsuario[]>([]); // RF25: historial de eventos para bandeja del aprendiz.
  const [bandejaAbierta, setBandejaAbierta] = useState<boolean>(true); // RF25: colapsable por UX (menos ruido visual).
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

  useEffect(() => { // RF8/RF16/RF25: carga inicial de datos críticos para Home.
    let activo = true; // UX: evita setState si el usuario navega fuera antes de completar promesas.

    const normalizeTokenRaw = (value: string) =>
      String(value ?? '').trim();

    const toBarcodeToken = (value: string) =>
      String(value ?? '')
        .trim()
        .replace(/[^0-9a-zA-Z]/g, '')
        .toUpperCase();

    (async () => { // UX: IIFE async para poder usar await.
      try { // UX: bloque de carga con finally para apagar spinner.
        if (!usuario) return; // UX: si no hay sesión, no hacemos llamadas con auth.

        setCargando(true); // UX: activa skeleton/spinner para evitar UI inconsistente.

        if (esAprendiz) {
          let codigo: CodigoAccesoResponse | null = null;
          try {
            codigo = await apiRequest<CodigoAccesoResponse>('/usuarios/codigo-acceso', { conAuth: true });
          } catch {
            codigo = null;
          }

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

        const estadoPromise = esAprendiz
          ? apiRequest<{ indicadorGlobal: string; espaciosDisponibles: number }>('/bahias/estado-aprendiz', { conAuth: true })
          : apiRequest<{ estadoParqueadero: string; disponibles: number }>('/bahias/ocupacion', { conAuth: true });

        const bandejaPromise = esAprendiz
          ? apiRequest<NotificacionUsuario[]>('/notificaciones/mias', { conAuth: true })
          : Promise.resolve<NotificacionUsuario[]>([]);

        const [estadoResult, bandejaResult] = await Promise.allSettled([
          estadoPromise,
          bandejaPromise,
        ]);

        if (!activo) return;

        if (estadoResult.status === 'fulfilled') {
          const indicador = String(
            esAprendiz
              ? (estadoResult.value as any)?.indicadorGlobal
              : (estadoResult.value as any)?.estadoParqueadero,
          )
            .toUpperCase()
            .trim() || 'SIN_DATOS';
          const indicadorGlobal: IndicadorGlobal =
            indicador === 'DISPONIBLE'
              ? 'DISPONIBLE'
              : indicador === 'LLENO'
                ? 'LLENO'
                : indicador === 'DESHABILITADO'
                  ? 'DESHABILITADO'
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
      } finally { // UX: garantiza apagar loading incluso si falla algún request.
        if (activo) setCargando(false); // UX: desactiva spinner solo si sigue montado.
      } // UX: fin finally.
    })(); // UX: ejecuta IIFE.

    return () => { activo = false; }; // UX: cleanup para evitar setState tardío.
  }, [usuario]); // RF7: recarga si cambia la sesión/usuario.

  useEffect(() => { // RF8: animación suave al alternar entre BARRAS y QR.
    Animated.sequence([ // UX: fade-out + fade-in para transición sin saltos.
      Animated.timing(animSwitch, { toValue: 0, duration: 90, useNativeDriver: true }), // UX: baja opacidad rápido antes de cambiar.
      Animated.timing(animSwitch, { toValue: 1, duration: 140, useNativeDriver: true }), // UX: sube opacidad para revelar el nuevo formato.
    ]).start(); // UX: ejecuta la transición.
  }, [modoVisualizacion, animSwitch]); // RF8: depende del modo.

  if (!usuario) return null; // RF7: sin sesión, no renderiza contenido (evita flashes con datos vacíos).

  const toggleBandeja = () => { // RF25: interacción para abrir/cerrar bandeja.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // UX: animación de layout para colapso suave.
    setBandejaAbierta((v) => !v); // RF25: alterna estado de expansión.
  }; // RF25: fin toggle.

  const toggleModo = () => { // RF8: conmutación dual entre barras y QR.
    setModoVisualizacion((m) => (m === 'BARRAS' ? 'QR' : 'BARRAS')); // RF8: alterna de forma determinista.
  }; // RF8: fin toggleModo.

  const formatFecha = (iso: string) => { // RF25: formatea fecha legible para el aprendiz.
    const d = new Date(iso); // RF25: parse de ISO proveniente del backend.
    if (Number.isNaN(d.getTime())) return iso; // RF25: fallback si la fecha no es parseable.
    return d.toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); // RF25: formato claro en español Colombia.
  }; // RF25: fin formatFecha.

  const iconoNotificacion = (tipo: string) => { // RF25: iconografía ligera sin librerías externas (estabilidad Expo).
    const t = String(tipo ?? '').toUpperCase(); // RF25: normaliza para comparar.
    if (t.includes('SALIDA_EMERGENCIA')) return '⛔'; // RF25: icono semántico para emergencia.
    if (t.includes('DESHABILITADO')) return '🚫'; // RF25: icono semántico para bloqueo.
    return '🔔'; // RF25: icono general de notificación.
  }; // RF25: fin iconoNotificacion.

  const colorNotificacion = (tipo: string) => { // RF25: color por severidad para escaneo visual.
    const t = String(tipo ?? '').toUpperCase(); // RF25: normaliza.
    if (t.includes('SALIDA_EMERGENCIA')) return COLORS.bloqueoEmergencia; // RF25: emergencia en rojo.
    if (t.includes('DESHABILITADO')) return COLORS.bloqueoEmergencia; // RF25: deshabilitado en rojo.
    return COLORS.alertaOcupacion; // RF25: otras alertas en naranja.
  }; // RF25: fin colorNotificacion.

  const codigoAccesoBarras = String(codigoAcceso ?? '').trim();
  const codigoAccesoQrSeguro = String(codigoAccesoQr ?? '').trim();
  const tieneCodigoAcceso = Boolean(esAprendiz && (codigoAccesoBarras || codigoAccesoQrSeguro));
  const sincronizado = Boolean(tieneCodigoAcceso && !cargando);
  const pulseOpacity = animPulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }); // UX: opacidad pulsante sutil.

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={() => navigation?.openDrawer?.()}>
            <Text style={styles.menuButtonText}>≡</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initiales}</Text>
            </View>

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

        <View style={styles.card}>
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
              <Text style={styles.loadingText}>Sincronizando datos institucionales...</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>CREDENCIAL VEHICULAR</Text>
            <View style={styles.syncRow}>
              <View style={[styles.syncDot, { backgroundColor: sincronizado ? COLORS.verdeActivo : COLORS.alertaOcupacion }]} />
              <Text style={styles.syncText}>{sincronizado ? 'Lector de Portería Sincronizado' : 'Sincronizando...'}</Text>
            </View>
          </View>

          <View style={styles.credencialBody}>
            <View style={styles.codeFrame}>
              <Animated.View style={[styles.codeInner, { opacity: animSwitch, transform: [{ scale: animSwitch.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }]}>
                {cargando ? (
                  <ActivityIndicator color={COLORS.verdeActivo} />
                ) : !esAprendiz ? (
                  <Text style={styles.codeUnavailable}>Disponible solo para Aprendiz</Text>
                ) : tieneCodigoAcceso ? (
                  modoVisualizacion === 'BARRAS' ? ( // RF8: modo actual (hardware real).
                    <Barcode
                      value={codigoAccesoBarras || codigoAccesoQrSeguro}
                      format="CODE128" // RF8: Code128 compatible con lectores de barras actuales.
                      maxWidth={280} // UX: ancho máximo estable para pantallas móviles.
                      height={90} // UX: altura suficiente para lectura confiable.
                      lineColor="#111827" // UI: negro casi puro para contraste alto.
                      background={COLORS.blanco} // UI: fondo blanco para mejorar lectura por cámara/lector.
                    />
                  ) : ( // RF8: modo QR (hardware futuro).
                    <QRCode
                      value={codigoAccesoQrSeguro || codigoAccesoBarras}
                      size={170} // UX: tamaño estable dentro del frame.
                      backgroundColor={COLORS.blanco} // UI: fondo blanco para contraste.
                      color="#111827" // UI: alto contraste.
                    />
                  )
                ) : (
                  <Text style={styles.codeUnavailable}>Código no disponible</Text>
                )}
              </Animated.View>
            </View>

            <Text style={styles.credencialHint}>Presenta este código en la portería vehicular</Text>

            <TouchableOpacity style={styles.toggleButton} onPress={toggleModo} disabled={!tieneCodigoAcceso}>
              <Text style={styles.toggleButtonText}>
                {modoVisualizacion === 'BARRAS' ? 'CAMBIAR A QR' : 'CAMBIAR A BARRAS'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={styles.bandejaHeader} onPress={toggleBandeja} activeOpacity={0.85}>
            <Text style={styles.cardTitle}>NOTIFICACIONES</Text>
            <Text style={styles.bandejaToggle}>{bandejaAbierta ? 'OCULTAR' : 'MOSTRAR'}</Text>
          </TouchableOpacity>

          {bandejaAbierta ? (
            <View style={styles.bandejaBody}>
              {notificaciones.length === 0 ? ( // RF25: estado vacío.
                <Text style={styles.bandejaEmpty}>No hay notificaciones institucionales registradas.</Text>
              ) : ( // RF25: lista de tarjetas.
                <View style={styles.bandejaList}>
                  {notificaciones.map((n) => ( // RF25: mapeo de notificaciones.
                    <View key={n.id} style={[styles.notifCard, { borderLeftColor: colorNotificacion(n.tipo) }]}>
                      <View style={[styles.notifIcon, { backgroundColor: colorNotificacion(n.tipo) }]}>
                        <Text style={styles.notifIconText}>{iconoNotificacion(n.tipo)}</Text>
                      </View>

                      <View style={styles.notifContent}>
                        <Text style={styles.notifTitle} numberOfLines={1}>{String(n?.titulo ?? '')}</Text>
                        <Text style={styles.notifMessage} numberOfLines={3}>{String(n?.mensaje ?? '')}</Text>
                        <View style={styles.notifMetaRow}>
                          <Text style={styles.notifMetaText}>{formatFecha(String(n?.createdAt ?? ''))}</Text>
                          <Text style={styles.notifMetaDot}>•</Text>
                          <Text style={styles.notifMetaText}>
                            {n?.actorNombre ? `Firmado: ${String(n.actorNombre)}` : 'Firmado: Sistema'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
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
  toggleButton: { // RF8: botón institucional de conmutación.
    backgroundColor: COLORS.verdeOscuro, // RF8: color exigido para acciones institucionales.
    borderRadius: 12, // UI: bordes elegantes.
    paddingVertical: 14, // UX: altura cómoda.
    paddingHorizontal: 16, // UX: ancho cómodo.
    alignItems: 'center', // UX: centra texto.
    marginTop: 14, // UX: separación.
    opacity: 1, // UX: estado base (se controla por disabled a nivel RN).
  }, // RF8: fin toggleButton.
  toggleButtonText: { // RF8: texto botón.
    color: COLORS.blanco, // UI: contraste alto.
    fontSize: 12, // UI: legible.
    fontWeight: '900', // UI: institucional.
    letterSpacing: 1.2, // UI: look SENA.
  }, // RF8: fin toggleButtonText.
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
}); // UI: fin StyleSheet.
