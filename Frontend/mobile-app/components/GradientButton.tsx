import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Radius } from '../constants/theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
  disabled?: boolean;
  variant?: 'saffron' | 'indigo' | 'outline';
}

export default function GradientButton({
  title, onPress, loading, style, disabled, variant = 'saffron'
}: GradientButtonProps) {
  const gradientColors: [string, string] =
    variant === 'indigo'
      ? ['#6366f1', '#4f46e5']
      : variant === 'outline'
      ? ['transparent', 'transparent']
      : [Colors.saffron, Colors.saffronDark];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.wrapper, style, (disabled || loading) && styles.disabled]}
    >
      <LinearGradient colors={gradientColors} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[
            styles.text,
            variant === 'outline' && { color: Colors.saffron }
          ]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.outfitSemiBold,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
