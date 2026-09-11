import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  badge?: string;
  style?: ViewStyle;
}

export default function StatCard({ label, value, icon, color, bg, badge, style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          {icon}
        </View>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    flex: 1,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
  },
  badgeText: {
    color: Colors.saffron,
    fontSize: 10,
    fontFamily: Fonts.outfitSemiBold,
  },
  value: {
    fontSize: 28,
    fontFamily: Fonts.outfitBlack,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: Colors.textDim,
    fontFamily: Fonts.outfit,
  },
});
