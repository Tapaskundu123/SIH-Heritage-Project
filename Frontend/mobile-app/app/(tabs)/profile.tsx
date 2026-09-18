import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import GlassCard from '../../components/GlassCard';
import Badge from '../../components/Badge';

const QUICK_LINKS = [
  { label: 'Voice Cataloger', icon: 'mic', color: Colors.saffron, route: '/voice-cataloger', badge: '⭐ Popular' },
  { label: 'AI Photo Studio', icon: 'image', color: Colors.indigo, route: '/ai-studio' },
  { label: 'Pricing Assistant', icon: 'bar-chart-2', color: Colors.emerald, route: '/pricing' },
  { label: 'Inventory', icon: 'layers', color: Colors.amber, route: '/inventory' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<{ name?: string; email?: string; craftType?: string; preferredLanguage?: string; phone?: string } | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('ks_user').then((u) => { if (u) setUser(JSON.parse(u)); });
  }, []);

  const logout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          await AsyncStorage.removeItem('ks_token');
          await AsyncStorage.removeItem('ks_user');
          router.replace('/');
        }
      }
    ]);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.success) {
        const userData = res.data.data;
        await AsyncStorage.setItem('ks_user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch { /* use cached data */ }
  };

  useEffect(() => { refreshProfile(); }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['rgba(249,115,22,0.12)', 'transparent']} style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Avatar Card */}
        <GlassCard style={styles.avatarCard}>
          <View style={styles.avatarRow}>
            <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'A'}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user?.name || 'Artisan'}</Text>
              <Text style={styles.userEmail}>{user?.email || ''}</Text>
              <Badge text={user?.craftType || 'Craftsperson'} variant="saffron" style={{ marginTop: 6 }} />
            </View>
            <TouchableOpacity style={styles.editBtn}>
              <Feather name="edit-2" size={16} color={Colors.textDim} />
            </TouchableOpacity>
          </View>

          {/* Info rows */}
          <View style={styles.infoSection}>
            {user?.phone && (
              <View style={styles.infoRow}>
                <Feather name="phone" size={14} color={Colors.textDim} />
                <Text style={styles.infoText}>{user.phone}</Text>
              </View>
            )}
            {user?.preferredLanguage && (
              <View style={styles.infoRow}>
                <Feather name="globe" size={14} color={Colors.textDim} />
                <Text style={styles.infoText}>Preferred: {user.preferredLanguage}</Text>
              </View>
            )}
            {user?.craftType && (
              <View style={styles.infoRow}>
                <Feather name="scissors" size={14} color={Colors.textDim} />
                <Text style={styles.infoText}>{user.craftType}</Text>
              </View>
            )}
          </View>
        </GlassCard>

        {/* Quick Links */}
        <Text style={styles.sectionLabel}>Quick Access</Text>
        <View style={styles.linksGrid}>
          {QUICK_LINKS.map((link) => (
            <TouchableOpacity key={link.label} style={styles.linkCard} onPress={() => router.push(link.route as any)} activeOpacity={0.8}>
              <View style={[styles.linkIcon, { backgroundColor: `${link.color}20` }]}>
                <Feather name={link.icon as any} size={20} color={link.color} />
              </View>
              <Text style={styles.linkLabel}>{link.label}</Text>
              {link.badge && <Text style={styles.linkBadge}>{link.badge}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>About KarigarSetu</Text>
        <GlassCard style={styles.aboutCard}>
          <View style={styles.aboutHeader}>
            <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.aboutLogo}>
              <Text style={styles.aboutLogoText}>KS</Text>
            </LinearGradient>
            <View>
              <Text style={styles.aboutTitle}>KarigarSetu</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0 · SIH 2025</Text>
            </View>
          </View>
          <Text style={styles.aboutDesc}>
            AI-powered platform empowering Indian artisans with voice cataloging, smart pricing, and direct B2B connections. Built with ❤️ for India's craft heritage.
          </Text>
          <View style={styles.techBadges}>
            {['22+ Languages', 'Local AI', 'CUDA Powered', 'Offline Ready'].map((t) => (
              <View key={t} style={styles.techBadge}><Text style={styles.techBadgeText}>{t}</Text></View>
            ))}
          </View>
        </GlassCard>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Feather name="log-out" size={18} color={Colors.red} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: 22, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary },
  content: { padding: Spacing.lg },
  avatarCard: { marginBottom: Spacing.lg },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontFamily: Fonts.outfitBold },
  userName: { fontSize: 18, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  userEmail: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit, marginTop: 2 },
  editBtn: { width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.bgDark3, alignItems: 'center', justifyContent: 'center' },
  infoSection: { borderTopWidth: 1, borderTopColor: Colors.borderSubtle, paddingTop: Spacing.sm, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit },
  sectionLabel: { fontSize: 14, fontFamily: Fonts.outfitSemiBold, color: Colors.textMuted, marginBottom: Spacing.sm },
  linksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.lg },
  linkCard: { width: '47%', backgroundColor: Colors.bgDark2, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md },
  linkIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  linkLabel: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary },
  linkBadge: { fontSize: 10, color: Colors.saffron, fontFamily: Fonts.outfit, marginTop: 2 },
  aboutCard: { marginBottom: Spacing.lg },
  aboutHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  aboutLogo: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aboutLogoText: { color: '#fff', fontFamily: Fonts.outfitBold, fontSize: 16 },
  aboutTitle: { fontSize: 16, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  aboutVersion: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  aboutDesc: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 20, marginBottom: 12 },
  techBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  techBadge: { backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  techBadgeText: { color: Colors.saffron, fontSize: 11, fontFamily: Fonts.outfitSemiBold },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)', borderRadius: Radius.lg, paddingVertical: 14, marginBottom: 40, backgroundColor: 'rgba(248,113,113,0.06)' },
  logoutText: { color: Colors.red, fontSize: 15, fontFamily: Fonts.outfitSemiBold },
});
