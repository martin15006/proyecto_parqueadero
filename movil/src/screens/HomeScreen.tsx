import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { homeStyles } from '../styles/homeStyles';
import { useAuth } from '../context/AuthContext';
import { colors, animaciones } from '../theme/senaTheme';
import SenaHeader from '../components/SenaHeader';
import AnimatedButton from '../components/AnimatedButton';
import FadeInView from '../components/FadeInView';

export default function HomeScreen() {
  const { usuario, cerrarSesion } = useAuth();
  const qrScale = useRef(new Animated.Value(0)).current;
  const lineaEscaneo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animación de "aparición" del QR
    Animated.spring(qrScale, {
      toValue: 1,
      friction: 5,
      tension: 60,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Animación continua de "línea de escaneo" sobre el QR
    Animated.loop(
      Animated.sequence([
        Animated.timing(lineaEscaneo, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(lineaEscaneo, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  if (!usuario) return null;

  const handleCerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sí, cerrar', style: 'destructive', onPress: cerrarSesion },
    ]);
  };

  return (
    <View style={homeStyles.container}>
      <SenaHeader titulo="Mi Perfil" />

      <ScrollView contentContainerStyle={homeStyles.content}>
        <FadeInView>
          <View style={homeStyles.fotoContainer}>
            <Image source={{ uri: usuario.fotoPersona }} style={homeStyles.fotoPerfil} />
          </View>
          <Text style={homeStyles.nombre}>{usuario.nombreCompleto}</Text>
          <Text style={homeStyles.correo}>{usuario.correo}</Text>
        </FadeInView>

        <Animated.View
          style={[homeStyles.qrContainer, { transform: [{ scale: qrScale }] }]}
        >
          <Text style={homeStyles.qrLabel}>Tu código QR</Text>
          {usuario.QR ? (
            <View style={homeStyles.qrWrapper}>
              <QRCode
                value={usuario.QR}
                size={200}
                color={colors.negro}
                backgroundColor={colors.blanco}
              />
              <Animated.View
                style={[
                  homeStyles.lineaEscaneo,
                  {
                    transform: [
                      {
                        translateY: lineaEscaneo.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 200],
                        }),
                      },
                    ],
                    opacity: lineaEscaneo.interpolate({
                      inputRange: [0, 0.1, 0.9, 1],
                      outputRange: [0, 1, 1, 0],
                    }),
                  },
                ]}
              />
            </View>
          ) : (
            <Text style={homeStyles.sinQR}>QR no disponible</Text>
          )}
          <Text style={homeStyles.documento}>{usuario.documento}</Text>
        </Animated.View>

        <FadeInView delay={600}>
          <View style={homeStyles.infoBox}>
            <Text style={homeStyles.infoLabel}>Teléfono</Text>
            <Text style={homeStyles.infoValor}>{usuario.numTelf}</Text>

            <Text style={homeStyles.infoLabel}>Contacto de emergencia</Text>
            <Text style={homeStyles.infoValor}>{usuario.contactoEmerg}</Text>

            <Text style={homeStyles.infoLabel}>Ficha</Text>
            <Text style={homeStyles.infoValor}>{usuario.idFormacion || 'N/A'}</Text>
          </View>

          <View style={{ paddingHorizontal: 4, marginTop: 8 }}>
            <AnimatedButton
              texto="Cerrar Sesión"
              onPress={handleCerrarSesion}
              variante="peligro"
            />
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}