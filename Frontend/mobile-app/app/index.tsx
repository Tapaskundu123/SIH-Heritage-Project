import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';

const { width } = Dimensions.get('window');

const ROTATING_TEXTS = [
  { text: 'अपनी कला बेचें', lang: 'Hindi' },
  { text: 'আপনার শিল্প বিক্রি করুন', lang: 'Bengali' },
  { text: 'உங்கள் கலையை விற்கவும்', lang: 'Tamil' },
  { text: 'మీ కళని అమ్మండి', lang: 'Telugu' },
  { text: 'Sell Your Art', lang: 'English' },
];

const FEATURES = [
  { icon: 'mic', title: 'Voice Cataloger', desc: 'Speak in any Indian language — AI creates your catalog', color: Colors.saffron, badge: 'Most Used' },
  { icon: 'image', title: 'AI Photo Studio', desc: 'Professional product photos from your phone camera', color: Colors.indigo, badge: 'Smart AI' },
  { icon: 'bar-chart-2', title: 'Dynamic Pricing', desc: 'AI-recommended prices based on market data', color: Colors.emerald, badge: 'Maximize Profit' },
  { icon: 'shopping-bag', title: 'B2B Marketplace', desc: 'Connect with exporters and bulk buyers nationwide', color: '#f59e0b', badge: 'Nationwide' },
  { icon: 'package', title: 'Smart Inventory', desc: 'Track stock with automated low-stock alerts', color: Colors.saffronLight, badge: 'Auto Alerts' },
];

const STATS = [
  { value: '12+', label: 'Indian Languages', icon: 'globe' },
  { value: '6', label: 'AI Modules', icon: 'zap' },
  { value: '100%', label: 'Local AI', icon: 'shield' },
  { value: '∞', label: 'Scale', icon: 'trending-up' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [textIdx, setTextIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check if already logged in
    AsyncStorage.getItem('ks_token').then((token) => {
      if (token) router.replace('/(tabs)/dashboard');
    });

    // Hero entrance animation
    Animated.timing(heroAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.timing(statsAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 400);

    // Rotating language text
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setTextIdx((i) => (i + 1) % ROTATING_TEXTS.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
      {/* Hero */}
      <LinearGradient
        colors={['#1a0f08', Colors.bgDark]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Decorative glow */}
        <View style={styles.glow} />

        <Animated.View style={[styles.heroContent, { opacity: heroAnim, transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.logoBox}>
              <Text style={styles.logoLetters}>KS</Text>
            </LinearGradient>
            <Text style={styles.logoText}>
              Karigar<Text style={{ color: Colors.saffron }}>Setu</Text>
            </Text>
          </View>

          {/* Badge */}
          <View style={styles.aiBadge}>
            <Feather name="zap" size={12} color={Colors.saffron} />
            <Text style={styles.aiBadgeText}>AI-Powered Platform for Indian Artisans</Text>
          </View>

          {/* Headline */}
          <Text style={styles.headline}>
            Your Heritage,{'\n'}
            <Text style={{ color: Colors.saffron }}>Digitized</Text>
          </Text>

          {/* Rotating language */}
          <Animated.View style={[styles.rotatingBox, { opacity: fadeAnim }]}>
            <Text style={styles.rotatingText}>{ROTATING_TEXTS[textIdx].text}</Text>
            <Text style={styles.rotatingLang}>{ROTATING_TEXTS[textIdx].lang}</Text>
          </Animated.View>

          <Text style={styles.subtitle}>
            Empowering artisans with AI voice cataloging, smart pricing, and direct B2B connections.
          </Text>

          {/* CTA Buttons */}
          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/auth/register')} activeOpacity={0.85}>
              <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.ctaPrimaryText}>Get Started Free</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctaSecondary} onPress={() => router.push('/auth/login')} activeOpacity={0.85}>
              <Text style={styles.ctaSecondaryText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Stats Row */}
      <Animated.View style={[styles.statsRow, { opacity: statsAnim }]}>
        {STATS.map((s) => (
          <View key={s.label} style={styles.statItem}>
            <Feather name={s.icon as any} size={16} color={Colors.saffron} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Everything You Need</Text>
        <Text style={styles.sectionSubtitle}>6 AI-powered modules built for Indian artisans</Text>
        {FEATURES.map((f, i) => (
          <View key={f.title} style={[styles.featureCard, { borderLeftColor: f.color }]}>
            <View style={[styles.featureIconBox, { backgroundColor: `${f.color}20` }]}>
              <Feather name={f.icon as any} size={22} color={f.color} />
            </View>
            <View style={styles.featureText}>
              <View style={styles.featureHeader}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <View style={[styles.featureBadge, { backgroundColor: `${f.color}20`, borderColor: `${f.color}40` }]}>
                  <Text style={[styles.featureBadgeText, { color: f.color }]}>{f.badge}</Text>
                </View>
              </View>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Bottom CTA */}
      <LinearGradient colors={['rgba(249,115,22,0.1)', Colors.bgDark]} style={styles.bottomCta}>
        <Text style={styles.bottomCtaTitle}>Ready to Grow Your Business?</Text>
        <Text style={styles.bottomCtaSubtitle}>Join thousands of Indian artisans already using KarigarSetu</Text>
        <TouchableOpacity style={styles.ctaPrimary} onPress={() => router.push('/auth/register')} activeOpacity={0.85}>
          <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Feather name="mic" size={16} color="#fff" />
            <Text style={styles.ctaPrimaryText}>Start with Voice Cataloger</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  hero: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, position: 'relative', overflow: 'hidden' },
  glow: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(249,115,22,0.12)' },
  heroContent: { paddingHorizontal: Spacing.lg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.md },
  logoBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoLetters: { color: '#fff', fontFamily: Fonts.outfitBold, fontSize: 14 },
  logoText: { fontSize: 22, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(249,115,22,0.12)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, alignSelf: 'flex-start', marginBottom: Spacing.md },
  aiBadgeText: { color: Colors.saffron, fontSize: 11, fontFamily: Fonts.outfitSemiBold },
  headline: { fontSize: 36, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary, lineHeight: 44, marginBottom: Spacing.md },
  rotatingBox: { backgroundColor: 'rgba(249,115,22,0.08)', borderRadius: Radius.md, padding: 12, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.saffron },
  rotatingText: { fontSize: 18, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  rotatingLang: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit, marginTop: 2 },
  subtitle: { fontSize: 14, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 22, marginBottom: Spacing.xl },
  ctaRow: { flexDirection: 'row', gap: Spacing.sm },
  ctaPrimary: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaPrimaryText: { color: '#fff', fontFamily: Fonts.outfitSemiBold, fontSize: 14 },
  ctaSecondary: { borderWidth: 1, borderColor: Colors.borderMuted, borderRadius: Radius.lg, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  ctaSecondaryText: { color: Colors.textMuted, fontFamily: Fonts.outfitSemiBold, fontSize: 14 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.bgDark2, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.borderSubtle, paddingVertical: Spacing.md },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 18, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textDim, fontFamily: Fonts.outfit, textAlign: 'center' },
  section: { padding: Spacing.lg },
  sectionTitle: { fontSize: 22, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, marginBottom: Spacing.lg },
  featureCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.glassCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, borderLeftWidth: 3, padding: Spacing.md, marginBottom: Spacing.sm },
  featureIconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { flex: 1 },
  featureHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  featureTitle: { fontSize: 14, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, flex: 1 },
  featureBadge: { borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1 },
  featureBadgeText: { fontSize: 10, fontFamily: Fonts.outfitSemiBold },
  featureDesc: { fontSize: 12, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 18 },
  bottomCta: { padding: Spacing.xl, alignItems: 'center' },
  bottomCtaTitle: { fontSize: 20, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  bottomCtaSubtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, textAlign: 'center', marginBottom: Spacing.lg },
});
