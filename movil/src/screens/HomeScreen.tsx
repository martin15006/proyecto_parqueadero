import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fonts, espacios } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AvatarIniciales from '../components/AvatarIniciales';
import FadeInView from '../components/FadeInView';

export default function HomeScreen({ navigation }: any) {
  const { usuario } = useAuth();
  const { colores, esOscuro } = useTheme();

  const lineaScanAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(lineaScanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lineaScanAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  if (!usuario) return null;

  const lineaScanY = lineaScanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  const qrColor = esOscuro ? '#ffffff' : '#1a1a1a';
  const qrBackground = esOscuro ? 'transparent' : '#ffffff';

  return (
    <View style={[styles.container, { backgroundColor: colores.fondo }]}>
      <SenaHeader
        titulo="Mi Perfil"
        onMenuPress={() => navigation.openDrawer()}
      />

      {esOscuro && (
        <>
          <View style={styles.auroraTop} />
          <View style={styles.auroraBottom} />
        </>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        <FadeInView>
          {/* AVATAR + INFO */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {esOscuro && <View style={styles.avatarGlow} />}
              <AvatarIniciales
                nombre={usuario.nombreCompleto}
                fotoUrl={usuario.fotoPersona}
                size={110}
              />
            </View>

            <Animated.View
              style={[
                styles.badge,
                {
                  backgroundColor: esOscuro
                    ? 'rgba(95,217,36,0.20)'
                    : colores.verdeMuyClaro,
                  borderColor: esOscuro
                    ? 'rgba(95,217,36,0.40)'
                    : colores.verde,
                  opacity: pulseOpacity,
                },
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  {
                    backgroundColor: colores.verde,
                    shadowColor: colores.verde,
                  },
                ]}
              />
              <Text style={[styles.badgeText, { color: colores.verde }]}>
                Aprendiz Activo
              </Text>
            </Animated.View>

            <Text style={[styles.nombre, { color: colores.textoPrimario }]} numberOfLines={2}>
              {usuario.nombreCompleto}
            </Text>
            <Text style={[styles.correo, { color: colores.textoSecundario }]}>
              {usuario.correo}
            </Text>
          </View>

          {/* QR */}
          <Text style={[styles.qrLabel, { color: colores.textoTenue }]}>
            CÓDIGO DE ACCESO
          </Text>

          <View
            style={[
              styles.qrContainer,
              {
                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                borderColor: esOscuro
                  ? 'rgba(95,217,36,0.30)'
                  : colores.borde,
              },
            ]}
          >
            <View style={styles.qrInner}>
              <View
                style={[
                  styles.qrBox,
                  {
                    backgroundColor: qrBackground,
                    borderColor: esOscuro ? 'rgba(255,255,255,0.10)' : 'transparent',
                  },
                ]}
              >
                {usuario.QR && (
                  <QRCode
                    value={usuario.QR}
                    size={200}
                    backgroundColor="transparent"
                    color={qrColor}
                  />
                )}

                <Animated.View
                  style={[
                    styles.lineaScan,
                    {
                      backgroundColor: colores.verde,
                      shadowColor: colores.verde,
                      transform: [{ translateY: lineaScanY }],
                    },
                  ]}
                />

                <View style={[styles.esquina, styles.esquinaTL, { borderColor: colores.verde }]} />
                <View style={[styles.esquina, styles.esquinaTR, { borderColor: colores.verde }]} />
                <View style={[styles.esquina, styles.esquinaBL, { borderColor: colores.verde }]} />
                <View style={[styles.esquina, styles.esquinaBR, { borderColor: colores.verde }]} />
              </View>
            </View>

            <Text style={[styles.qrInstrucciones, { color: colores.textoTenue }]}>
              Presenta este código al ingresar al parqueadero
            </Text>
          </View>

          {/* INFO USUARIO */}
          <Text
            style={[
              styles.seccionLabel,
              { color: colores.textoTenue, marginTop: espacios.grande },
            ]}
          >
            INFORMACIÓN PERSONAL
          </Text>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: esOscuro ? colores.glassFondo : colores.superficie,
                borderColor: colores.borde,
              },
            ]}
          >
            <InfoRow label="Documento" valor={usuario.documento} colores={colores} />
            <View style={[styles.divider, { backgroundColor: colores.borde }]} />
            <InfoRow label="Teléfono" valor={usuario.numTelf} colores={colores} />
            <View style={[styles.divider, { backgroundColor: colores.borde }]} />
            <InfoRow label="Contacto Emergencia" valor={usuario.contactoEmerg} colores={colores} />
            <View style={[styles.divider, { backgroundColor: colores.borde }]} />
            <InfoRow label="Ficha" valor={usuario.idFormacion || 'Sin asignar'} colores={colores} />
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icono, label, valor, colores }: any) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcono}>{icono}</Text>
      <View style={styles.infoTexto}>
        <Text style={[styles.infoLabel, { color: colores.textoTenue }]}>{label}</Text>
        <Text style={[styles.infoValor, { color: colores.textoPrimario }]}>{valor}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  auroraTop: {
    position: 'absolute',
    top: 100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
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
  scroll: { padding: espacios.medio, paddingBottom: espacios.grande * 2 },
  avatarSection: { alignItems: 'center', marginVertical: espacios.medio },
  avatarWrapper: { position: 'relative', justifyContent: 'center', alignItems: 'center', marginBottom: espacios.normal },
  avatarGlow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(95,217,36,0.25)',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    marginBottom: espacios.pequeno,
  },
  badgeDot: {
    width: 7, height: 7, borderRadius: 3.5, marginRight: 6,
    shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  badgeText: { fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 0.5 },
  nombre: { fontSize: fonts.titulo, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  correo: { fontSize: fonts.normal, marginTop: 4 },
  qrLabel: {
    fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 1.5,
    textAlign: 'center', marginTop: espacios.normal, marginBottom: espacios.pequeno,
  },
  qrContainer: {
    borderRadius: 20, padding: espacios.grande, alignItems: 'center',
    borderWidth: 1, position: 'relative',
  },
  qrInner: { alignItems: 'center', justifyContent: 'center', padding: espacios.normal },
  qrBox: {
    padding: 16, borderRadius: 16, borderWidth: 1, position: 'relative', overflow: 'hidden',
  },
  lineaScan: {
    position: 'absolute', left: 10, right: 10, height: 2, top: 8,
    shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5,
  },
  esquina: { position: 'absolute', width: 24, height: 24, borderWidth: 3 },
  esquinaTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  esquinaTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  esquinaBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  esquinaBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  qrInstrucciones: { fontSize: fonts.pequeno, textAlign: 'center', marginTop: espacios.medio, paddingHorizontal: espacios.medio },
  seccionLabel: { fontSize: fonts.pequeno, fontWeight: '700', letterSpacing: 1.2, marginLeft: 4, marginBottom: espacios.pequeno },
  infoCard: { borderRadius: 16, padding: espacios.medio, borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: espacios.pequeno },
  infoIcono: { fontSize: 24, marginRight: espacios.normal },
  infoTexto: { flex: 1 },
  infoLabel: { fontSize: fonts.pequeno, fontWeight: '600', letterSpacing: 0.5 },
  infoValor: { fontSize: fonts.medio, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, marginVertical: 2 },
});