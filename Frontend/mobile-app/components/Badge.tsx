import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Fonts, Radius } from '../constants/theme';

type BadgeVariant = 'saffron' | 'indigo' | 'emerald' | 'amber' | 'red';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  saffron: { bg: 'rgba(249,115,22,0.15)', color: Colors.saffron, border: 'rgba(249,115,22,0.25)' },
  indigo:  { bg: 'rgba(99,102,241,0.15)', color: Colors.indigoLight, border: 'rgba(99,102,241,0.25)' },
  emerald: { bg: 'rgba(16,185,129,0.15)', color: Colors.emerald, border: 'rgba(16,185,129,0.25)' },
  amber:   { bg: 'rgba(245,158,11,0.15)', color: Colors.amber, border: 'rgba(245,158,11,0.25)' },
  red:     { bg: 'rgba(248,113,113,0.15)', color: Colors.red, border: 'rgba(248,113,113,0.25)' },
};

export default function Badge({ text, variant = 'saffron', style }: BadgeProps) {
  const v = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg, borderColor: v.border }, style]}>
      <Text style={[styles.text, { color: v.color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontFamily: Fonts.outfitSemiBold,
  },
});
