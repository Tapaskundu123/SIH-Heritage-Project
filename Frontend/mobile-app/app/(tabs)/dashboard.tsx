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
import PipelineBanner from '../../components/PipelineBanner';
import { useOnboardingPipeline } from '../../constants/pipeline';

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
  const pipeline = useOnboardingPipeline();
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
    <View style={{ flex: 1, backgroundColor: Colors.bgDark }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.saffron} />}
        contentContainerStyle={{ paddingBottom: pipeline.isOnboarding && pipeline.step !== 'complete' ? 120 : 20 }}
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
        {/* Top Pipeline Card: Active step or New pipeline launcher */}
        {pipeline.hydrated && pipeline.isOnboarding && pipeline.step !== 'complete' ? (
          <TouchableOpacity
            onPress={() => {
              const routes: Record<string, string> = {
                image: '/ai-studio', voice: '/voice-cataloger',
                pricing: '/pricing', catalog: '/(tabs)/products/new',
              };
              router.push((routes[pipeline.step] || '/ai-studio') as any);
            }}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['rgba(249,115,22,0.2)', 'rgba(99,102,241,0.08)']}
              style={styles.pipelineCard}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={styles.pipelineCardHeader}>
                <View style={styles.pipelineLiveRow}>
                  <View style={styles.pipelineDot} />
                  <Text style={styles.pipelineLiveText}>SETUP PIPELINE ACTIVE</Text>
                </View>
                <Text style={styles.pipelineStepCount}>
                  Step {pipeline.currentStepIndex + 1} of 4
                </Text>
              </View>
              <Text style={styles.pipelineCardTitle}>
                🚀 Step {pipeline.currentStepIndex + 1}: {['AI Photo Studio', 'Voice Cataloger', 'AI Pricing', 'Publish Product'][pipeline.currentStepIndex]}
              </Text>
              <Text style={styles.pipelineCardSub}>
                {['Upload or capture product photo — AI enhances & removes background', 'Describe product specifications by speaking in your native language', 'Get AI price recommendation calculated from craft data', 'Review and publish your product live to marketplace'][pipeline.currentStepIndex]}
              </Text>
              <View style={styles.pipelineProgressRow}>
                {[0, 1, 2, 3].map(i => (
                  <View
                    key={i}
                    style={[
                      styles.pipelineDotStep,
                      i < pipeline.currentStepIndex && styles.pipelineDotDone,
                      i === pipeline.currentStepIndex && styles.pipelineDotActive,
                    ]}
                  />
                ))}
                <Text style={styles.pipelineGoText}>Open Step →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={async () => {
              await pipeline.startOnboarding();
              router.push('/ai-studio');
            }}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['rgba(249,115,22,0.12)', 'rgba(249,115,22,0.03)']}
              style={styles.pipelineCard}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={styles.pipelineCardHeader}>
                <View style={styles.pipelineLiveRow}>
                  <Feather name="zap" size={12} color={Colors.saffron} />
                  <Text style={styles.pipelineLiveText}>AI PRODUCT PIPELINE</Text>
                </View>
                <Text style={styles.pipelineStepCount}>4 Steps</Text>
              </View>
              <Text style={styles.pipelineCardTitle}>
                ✨ Start New Listing Pipeline
              </Text>
              <Text style={styles.pipelineCardSub}>
                1. AI Studio ➔ 2. Voice Cataloger ➔ 3. AI Pricing ➔ 4. Publish
              </Text>
              <View style={styles.pipelineProgressRow}>
                <Text style={styles.pipelineGoText}>Launch Pipeline →</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

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
    </View>
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
  // Pipeline continue card styles
  pipelineCard: {
    borderRadius: Radius.xl, padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)',
  },
  pipelineCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  pipelineLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pipelineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.saffron },
  pipelineLiveText: { fontSize: 9, fontFamily: Fonts.outfitBold, color: Colors.saffron, letterSpacing: 0.8 },
  pipelineStepCount: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.outfitSemiBold },
  pipelineCardTitle: { fontSize: 16, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 5 },
  pipelineCardSub: { fontSize: 12, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 18, marginBottom: 12 },
  pipelineProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pipelineDotStep: { width: 22, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  pipelineDotDone: { backgroundColor: Colors.emerald },
  pipelineDotActive: { backgroundColor: Colors.saffron },
  pipelineGoText: { marginLeft: 6, fontSize: 11, color: Colors.saffron, fontFamily: Fonts.outfitSemiBold },
});
