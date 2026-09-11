import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export default function GlassCard({ children, style, padding = 16 }: GlassCardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
});
