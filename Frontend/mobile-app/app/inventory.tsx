import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Alert, Platform, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import api from '../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import LoadingShimmer from '../components/LoadingShimmer';

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  stock: number;
  minStockAlert: number;
  price: number;
  isPublished: boolean;
}

export default function InventoryScreen() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get('/inventory');
      if (res.data.success) setItems(res.data.data);
    } catch {
      // Demo data
      setItems([
        { _id: '1', name: 'Blue Pottery Vase', category: 'Pottery', stock: 3, minStockAlert: 5, price: 850, isPublished: true },
        { _id: '2', name: 'Banarasi Saree', category: 'Weaving', stock: 0, minStockAlert: 2, price: 4500, isPublished: true },
        { _id: '3', name: 'Madhubani Painting', category: 'Painting', stock: 12, minStockAlert: 3, price: 1200, isPublished: false },
        { _id: '4', name: 'Silver Oxidized Earrings', category: 'Jewelry', stock: 2, minStockAlert: 5, price: 650, isPublished: true },
        { _id: '5', name: 'Bamboo Basket Set', category: 'Bamboo Craft', stock: 8, minStockAlert: 4, price: 350, isPublished: true },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStock = async (id: string, delta: number) => {
    const item = items.find((i) => i._id === id);
    if (!item) return;
    const newStock = Math.max(0, item.stock + delta);
    const type = delta > 0 ? 'stock_in' : 'stock_out';
    try {
      // ✅ FIXED: backend uses POST /inventory/update, not PUT /inventory/:id
      await api.post('/inventory/update', {
        productId: id,
        type,
        quantity: Math.abs(delta),
        note: `Manual adjustment from mobile app`,
      });
      setItems((prev) => prev.map((i) => i._id === id ? { ...i, stock: newStock } : i));
    } catch {
      // Optimistic update even if backend fails (demo/offline mode)
      setItems((prev) => prev.map((i) => i._id === id ? { ...i, stock: newStock } : i));
    }
  };

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    if (filter === 'low') return matchSearch && item.stock <= item.minStockAlert && item.stock > 0;
    if (filter === 'out') return matchSearch && item.stock === 0;
    return matchSearch;
  });

  const lowStockCount = items.filter((i) => i.stock <= i.minStockAlert).length;

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock === 0) return { label: 'Out of Stock', color: Colors.red, bg: 'rgba(248,113,113,0.15)', pct: 0 };
    if (item.stock <= item.minStockAlert) return { label: 'Low Stock', color: Colors.amber, bg: 'rgba(245,158,11,0.15)', pct: item.stock / (item.minStockAlert * 2) };
    return { label: 'In Stock', color: Colors.emerald, bg: 'rgba(16,185,129,0.15)', pct: Math.min(1, item.stock / (item.minStockAlert * 4)) };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['rgba(245,158,11,0.08)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Inventory</Text>
          {lowStockCount > 0 && (
            <View style={styles.alertBadge}>
              <Feather name="alert-triangle" size={12} color={Colors.amber} />
              <Text style={styles.alertBadgeText}>{lowStockCount} alerts</Text>
            </View>
          )}
        </View>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={Colors.textDim} style={{ marginRight: 10 }} />
          <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={Colors.textDim} value={search} onChangeText={setSearch} />
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <View style={styles.filters}>
        {[{ key: 'all', label: 'All Products' }, { key: 'low', label: '⚠️ Low Stock' }, { key: 'out', label: '❌ Out of Stock' }].map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key as any)}>
            <Text style={[styles.filterText, filter === f.key && { color: Colors.saffron }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: Spacing.lg, gap: 12 }}>
          {[...Array(4)].map((_, i) => <LoadingShimmer key={i} height={90} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchInventory(); }} tintColor={Colors.saffron} />}
          renderItem={({ item }) => {
            const status = getStockStatus(item);
            return (
              <GlassCard style={[styles.card, item.stock === 0 && { borderColor: 'rgba(248,113,113,0.2)' }, item.stock > 0 && item.stock <= item.minStockAlert && { borderColor: 'rgba(245,158,11,0.2)' }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.productCategory}>{item.category} · ₹{item.price}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                {/* Stock bar */}
                <View style={styles.barRow}>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${Math.min(100, status.pct * 100)}%`, backgroundColor: status.color }]} />
                  </View>
                  <Text style={styles.stockCount}>{item.stock} units</Text>
                </View>

                {/* Stock controls */}
                <View style={styles.controls}>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => updateStock(item._id, -1)} disabled={item.stock === 0}>
                    <Feather name="minus" size={16} color={item.stock === 0 ? Colors.textDim : Colors.red} />
                  </TouchableOpacity>
                  <Text style={styles.stockNum}>{item.stock}</Text>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => updateStock(item._id, 1)}>
                    <Feather name="plus" size={16} color={Colors.emerald} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.controlBtn} onPress={() => updateStock(item._id, 10)}>
                    <Text style={styles.restockText}>+10</Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  backBtn: { marginBottom: Spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  title: { fontSize: 22, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  alertBadgeText: { color: Colors.amber, fontSize: 11, fontFamily: Fonts.outfitSemiBold },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontFamily: Fonts.outfit, fontSize: 14 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.bgDark2, borderWidth: 1, borderColor: Colors.borderSubtle },
  filterChipActive: { backgroundColor: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.35)' },
  filterText: { color: Colors.textDim, fontFamily: Fonts.outfitMedium, fontSize: 12 },
  list: { padding: Spacing.lg, gap: 10 },
  card: { padding: Spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  productName: { fontSize: 14, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary },
  productCategory: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit, marginTop: 2 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: Fonts.outfitSemiBold },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  barBg: { flex: 1, height: 5, backgroundColor: Colors.bgDark3, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  stockCount: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit, width: 50, textAlign: 'right' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  controlBtn: { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: Colors.bgDark3, borderWidth: 1, borderColor: Colors.borderSubtle, alignItems: 'center', justifyContent: 'center' },
  stockNum: { minWidth: 32, textAlign: 'center', fontSize: 16, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  restockText: { color: Colors.emerald, fontFamily: Fonts.outfitSemiBold, fontSize: 12 },
});
