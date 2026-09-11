import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import StatCard from '../../components/StatCard';
import GlassCard from '../../components/GlassCard';
import LoadingShimmer from '../../components/LoadingShimmer';
import ProductCard from '../../components/ProductCard';

interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  lowStockCount: number;
  totalStock: number;
  totalSold: number;
  recentProducts: Array<{
    _id: string; name: string; category: string;
    price: number; stock: number; isPublished: boolean;
    images?: Array<{ url: string }>;
  }>;
}

const QUICK_ACTIONS = [
  { label: 'Voice Catalog', desc: 'Speak to list', icon: 'mic', color: Colors.saffron, route: '/voice-cataloger' },
  { label: 'AI Photo', desc: 'Enhance images', icon: 'image', color: Colors.indigo, route: '/ai-studio' },
  { label: 'Add Product', desc: 'Manual entry', icon: 'plus-circle', color: Colors.emerald, route: '/(tabs)/products/new' },
  { label: 'Pricing', desc: 'AI price tips', icon: 'bar-chart-2', color: Colors.amber, route: '/pricing' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<{ name?: string; craftType?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('ks_user').then((u) => { if (u) setUser(JSON.parse(u)); });
    AsyncStorage.getItem('ks_token').then((token) => {
      if (!token) router.replace('/auth/login');
    });
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/products/dashboard/stats');
      if (res.data.success) setStats(res.data.data);
    } catch {
      setStats({ totalProducts: 12, publishedProducts: 8, lowStockCount: 3, totalStock: 145, totalSold: 67, recentProducts: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchStats(); };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.saffron} />}
    >
      {/* Header */}
      <LinearGradient colors={['rgba(249,115,22,0.08)', 'transparent']} style={styles.headerGradient}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, <Text style={{ color: Colors.saffron }}>{user?.name?.split(' ')[0] || 'Artisan'}</Text> 👋</Text>
            <Text style={styles.subGreeting}>{user?.craftType || 'Craftsperson'} · Ready to grow?</Text>
          </View>
          <View style={styles.aiBadge}>
            <Feather name="zap" size={12} color={Colors.saffron} />
            <Text style={styles.aiBadgeText}>AI Active</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          {loading ? (
            <>
              <LoadingShimmer height={100} style={{ flex: 1, marginRight: 6 }} />
              <LoadingShimmer height={100} style={{ flex: 1, marginLeft: 6 }} />
            </>
          ) : (
            <>
              <StatCard label="Total Products" value={stats?.totalProducts ?? 0} color={Colors.saffron} bg="rgba(249,115,22,0.12)"
                icon={<Feather name="package" size={18} color={Colors.saffron} />} style={{ marginRight: 6 }} />
              <StatCard label="Published" value={stats?.publishedProducts ?? 0} color={Colors.emerald} bg="rgba(16,185,129,0.12)"
                icon={<Feather name="eye" size={18} color={Colors.emerald} />} style={{ marginLeft: 6 }} />
            </>
          )}
        </View>
        <View style={[styles.statsGrid, { marginTop: 12 }]}>
          {loading ? (
            <>
              <LoadingShimmer height={100} style={{ flex: 1, marginRight: 6 }} />
              <LoadingShimmer height={100} style={{ flex: 1, marginLeft: 6 }} />
            </>
          ) : (
            <>
              <StatCard label="Items in Stock" value={stats?.totalStock ?? 0} color={Colors.indigo} bg="rgba(99,102,241,0.12)"
                icon={<Feather name="layers" size={18} color={Colors.indigo} />} style={{ marginRight: 6 }} />
              <StatCard label="Low Stock" value={stats?.lowStockCount ?? 0} color={Colors.amber} bg="rgba(245,158,11,0.12)"
                icon={<Feather name="alert-triangle" size={18} color={Colors.amber} />}
                badge={(stats?.lowStockCount ?? 0) > 0 ? 'Alert!' : undefined} style={{ marginLeft: 6 }} />
            </>
          )}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => router.push(a.route as any)} activeOpacity={0.8}>
              <View style={[styles.actionIconBox, { backgroundColor: `${a.color}20` }]}>
                <Feather name={a.icon as any} size={22} color={a.color} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={styles.actionDesc}>{a.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feature Spotlight */}
        <Text style={styles.sectionTitle}>AI Features</Text>
        <TouchableOpacity onPress={() => router.push('/voice-cataloger')} activeOpacity={0.88}>
          <GlassCard style={[styles.spotlight, { borderColor: 'rgba(249,115,22,0.3)', borderLeftColor: Colors.saffron, borderLeftWidth: 3 }]}>
            <View style={styles.spotlightBadge}>
              <Text style={styles.spotlightBadgeText}>⭐ Featured</Text>
            </View>
            <Feather name="mic" size={36} color={Colors.saffron} style={{ marginBottom: 10 }} />
            <Text style={styles.spotlightTitle}>Voice Cataloger</Text>
            <Text style={styles.spotlightDesc}>Speak in Hindi, Tamil, Bengali, or any Indian language. AI creates a complete product listing instantly.</Text>
            <View style={styles.langBadges}>
              {['HI', 'TA', 'BN', 'TE', 'MR', '+7'].map((l) => (
                <View key={l} style={styles.langBadge}><Text style={styles.langBadgeText}>{l}</Text></View>
              ))}
            </View>
            <View style={styles.tryBtn}>
              <Text style={styles.tryBtnText}>Try Now</Text>
              <Feather name="arrow-right" size={14} color={Colors.saffron} />
            </View>
          </GlassCard>
        </TouchableOpacity>

        {/* Recent Products */}
        {stats?.recentProducts && stats.recentProducts.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Recent Products</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/products/index')}>
                <Text style={styles.viewAll}>View All <Feather name="arrow-right" size={12} color={Colors.saffron} /></Text>
              </TouchableOpacity>
            </View>
            <View style={styles.productsGrid}>
              {stats.recentProducts.slice(0, 4).map((p) => (
                <View key={p._id} style={{ width: '48%', marginBottom: 12 }}>
                  <ProductCard product={p} onPress={() => router.push(`/(tabs)/products/${p._id}` as any)} />
                </View>
              ))}
            </View>
          </>
        )}

        {/* Empty state */}
        {!loading && stats?.totalProducts === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="package" size={32} color={Colors.saffron} />
            </View>
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptyDesc}>Start by adding your first product with our AI voice cataloger!</Text>
            <TouchableOpacity onPress={() => router.push('/voice-cataloger')} activeOpacity={0.85}>
              <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.emptyBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Feather name="mic" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Try Voice Cataloger</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 20, paddingHorizontal: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  greeting: { fontSize: 22, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary },
  subGreeting: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, marginTop: 2, textTransform: 'capitalize' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(249,115,22,0.12)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  aiBadgeText: { color: Colors.saffron, fontSize: 11, fontFamily: Fonts.outfitSemiBold },
  content: { padding: Spacing.lg },
  statsGrid: { flexDirection: 'row' },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  viewAll: { fontSize: 13, color: Colors.saffron, fontFamily: Fonts.outfitMedium },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', backgroundColor: Colors.glassCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md },
  actionIconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  actionLabel: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, marginBottom: 2 },
  actionDesc: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  spotlight: { marginBottom: Spacing.sm, position: 'relative', padding: Spacing.md },
  spotlightBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(249,115,22,0.15)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)' },
  spotlightBadgeText: { color: Colors.saffron, fontSize: 10, fontFamily: Fonts.outfitSemiBold },
  spotlightTitle: { fontSize: 18, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 6 },
  spotlightDesc: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 20, marginBottom: 12 },
  langBadges: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  langBadge: { backgroundColor: 'rgba(249,115,22,0.12)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  langBadgeText: { color: Colors.saffron, fontSize: 10, fontFamily: Fonts.outfitSemiBold },
  tryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tryBtnText: { color: Colors.saffron, fontFamily: Fonts.outfitSemiBold, fontSize: 13 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 70, height: 70, borderRadius: 18, backgroundColor: 'rgba(249,115,22,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', fontFamily: Fonts.outfit, lineHeight: 20, marginBottom: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: Radius.lg },
  emptyBtnText: { color: '#fff', fontFamily: Fonts.outfitSemiBold, fontSize: 14 },
});
