import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, Text } from 'react-native';
import { animaciones } from '../theme/senaTheme';

interface Props {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export default function FadeInView({ children, delay = 0, style }: Props) {
  const opacidad = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacidad, {
        toValue: 1,
        duration: animaciones.lenta,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: animaciones.lenta,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const safeChildren = React.Children.map(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      return <Text>{String(child)}</Text>;
    }
    return child;
  });

  return (
    <Animated.View style={[style, { opacity: opacidad, transform: [{ translateY }] }]}>
      {safeChildren}
    </Animated.View>
  );
}
