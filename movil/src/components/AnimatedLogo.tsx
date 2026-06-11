import React, { useEffect, useRef } from 'react';
import { Animated, Image, ImageStyle, StyleProp } from 'react-native';

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
  pulse?: boolean;
}

export default function AnimatedLogo({ size = 120, style, pulse = true }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Image
        source={require('../../assets/logoSena.png')}
        style={[{ width: size, height: size }, style]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}