import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '../constants/theme';

interface LoadingShimmerProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export default function LoadingShimmer({ width = '100%', height = 80, style, borderRadius = 12 }: LoadingShimmerProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          backgroundColor: Colors.bgDark3,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}
