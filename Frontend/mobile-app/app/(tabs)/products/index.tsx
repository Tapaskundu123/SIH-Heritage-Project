import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, RefreshControl, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import api from '../../../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../../../constants/theme';
import ProductCard from '../../../components/ProductCard';
import LoadingShimmer from '../../../components/LoadingShimmer';

const CATEGORIES = ['All', 'Pottery', 'Weaving', 'Embroidery', 'Wood Carving', 'Metal Work', 'Jewelry', 'Painting', 'Other'];

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => { fetchProducts(); }, []);

  useEffect(() => {
    let list = products;
    if (activeCategory !== 'All') list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    setFiltered(list);
  }, [products, search, activeCategory]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      if (res.data.success) setProducts(res.data.data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchProducts(); };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['rgba(249,115,22,0.08)', 'transparent']} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Products</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(tabs)/products/new')} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.addBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={Colors.textDim} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.textDim}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={Colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Category filter */}
      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c}
        contentContainerStyle={styles.categories}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, activeCategory === item && styles.categoryChipActive]}
            onPress={() => setActiveCategory(item)}
          >
            <Text style={[styles.categoryText, activeCategory === item && { color: Colors.saffron }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Products Grid */}
      {loading ? (
        <View style={styles.shimmerGrid}>
          {[...Array(6)].map((_, i) => <LoadingShimmer key={i} height={180} style={{ width: '47%', marginBottom: 12 }} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="package" size={40} color={Colors.textDim} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>{products.length === 0 ? 'No Products Yet' : 'No Results Found'}</Text>
          <Text style={styles.emptyDesc}>
            {products.length === 0 ? 'Add your first product using voice or manual entry.' : 'Try a different search or category.'}
          </Text>
          {products.length === 0 && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/voice-cataloger')}>
              <Feather name="mic" size={16} color={Colors.saffron} />
              <Text style={styles.emptyBtnText}>Voice Cataloger</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(p) => p._id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.saffron} />}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard product={item} onPress={() => router.push(`/(tabs)/products/${item._id}` as any)} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  headerTitle: { fontSize: 22, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary },
  addBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  addBtnGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontFamily: Fonts.outfitSemiBold, fontSize: 13 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontFamily: Fonts.outfit, fontSize: 14 },
  categories: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.bgDark2, borderWidth: 1, borderColor: Colors.borderSubtle },
  categoryChipActive: { backgroundColor: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.4)' },
  categoryText: { fontSize: 13, fontFamily: Fonts.outfitMedium, color: Colors.textDim },
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 20, paddingTop: 4 },
  shimmerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: Spacing.lg, paddingTop: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', fontFamily: Fonts.outfit, lineHeight: 20, marginBottom: Spacing.lg },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: Radius.lg, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: Colors.saffron, fontFamily: Fonts.outfitSemiBold, fontSize: 14 },
});
