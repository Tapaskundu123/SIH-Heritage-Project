import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, Platform, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import api from '../../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../../constants/theme';
import LoadingShimmer from '../../components/LoadingShimmer';

const CATEGORIES = ['All', 'Pottery', 'Weaving', 'Embroidery', 'Jewelry', 'Painting', 'Wood Carving', 'Metal Work'];

export default function MarketplaceScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => { fetchMarketplace(); }, []);

  useEffect(() => {
    let list = products;
    if (activeCategory !== 'All') list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(list);
  }, [products, search, activeCategory]);

  const fetchMarketplace = async () => {
    try {
      const res = await api.get('/products/marketplace');
      if (res.data.success) setProducts(res.data.data);
    } catch {
      // Demo
      setProducts([
        { _id: '1', name: 'Blue Pottery Vase', category: 'Pottery', price: 850, region: 'Rajasthan', artisanName: 'Ram Lal', images: [] },
        { _id: '2', name: 'Kanjivaram Silk Saree', category: 'Weaving', price: 12000, region: 'Tamil Nadu', artisanName: 'Lakshmi Devi', images: [] },
        { _id: '3', name: 'Madhubani Canvas', category: 'Painting', price: 2500, region: 'Bihar', artisanName: 'Geeta Devi', images: [] },
        { _id: '4', name: 'Silver Filigree Necklace', category: 'Jewelry', price: 3400, region: 'Odisha', artisanName: 'Balram Das', images: [] },
        { _id: '5', name: 'Dhokra Figurine', category: 'Metal Work', price: 1800, region: 'Chhattisgarh', artisanName: 'Sukroo', images: [] },
        { _id: '6', name: 'Chikankari Kurti', category: 'Embroidery', price: 1600, region: 'Uttar Pradesh', artisanName: 'Fatima', images: [] },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={() => {}}>
      <View style={styles.cardImage}>
        {item.images?.[0]?.url ? (
          <Image source={{ uri: item.images[0].url }} style={styles.cardImg} />
        ) : (
          <View style={styles.cardImgPlaceholder}>
            <Feather name="image" size={24} color={Colors.textDim} />
          </View>
        )}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.cardMeta}>
          <Feather name="map-pin" size={11} color={Colors.textDim} />
          <Text style={styles.cardRegion}>{item.region || 'India'}</Text>
        </View>
        {item.artisanName && (
          <View style={styles.artisanRow}>
            <View style={styles.artisanAvatar}>
              <Text style={styles.artisanInitial}>{item.artisanName[0]}</Text>
            </View>
            <Text style={styles.artisanName}>{item.artisanName}</Text>
          </View>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{item.price?.toLocaleString('en-IN')}</Text>
          <TouchableOpacity style={styles.inquireBtn}>
            <Text style={styles.inquireBtnText}>Inquire</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['rgba(99,102,241,0.08)', 'transparent']} style={styles.header}>
        <Text style={styles.headerTitle}>B2B Marketplace</Text>
        <Text style={styles.headerSubtitle}>Connect with exporters, corporates & bulk buyers</Text>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color={Colors.textDim} style={{ marginRight: 10 }} />
          <TextInput style={styles.searchInput} placeholder="Search artisan products..." placeholderTextColor={Colors.textDim} value={search} onChangeText={setSearch} />
        </View>
      </LinearGradient>

      {/* Category chips */}
      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c}
        contentContainerStyle={styles.categories}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, activeCategory === item && styles.catChipActive]}
            onPress={() => setActiveCategory(item)}
          >
            <Text style={[styles.catText, activeCategory === item && { color: Colors.indigoLight }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={styles.shimmerGrid}>
          {[...Array(6)].map((_, i) => <LoadingShimmer key={i} height={220} style={{ width: '47%' }} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(p) => p._id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMarketplace(); }} tintColor={Colors.indigo} />}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="shopping-bag" size={36} color={Colors.textDim} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTitle: { fontSize: 22, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary, marginBottom: 4 },
  headerSubtitle: { fontSize: 12, color: Colors.textMuted, fontFamily: Fonts.outfit, marginBottom: Spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontFamily: Fonts.outfit, fontSize: 14 },
  categories: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.bgDark2, borderWidth: 1, borderColor: Colors.borderSubtle },
  catChipActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.4)' },
  catText: { fontSize: 13, fontFamily: Fonts.outfitMedium, color: Colors.textDim },
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 20 },
  shimmerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: Spacing.lg },
  card: { flex: 1, backgroundColor: Colors.glassCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle, overflow: 'hidden', marginBottom: 10 },
  cardImage: { height: 120, backgroundColor: Colors.bgDark3, position: 'relative' },
  cardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  categoryBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  categoryBadgeText: { color: '#fff', fontSize: 10, fontFamily: Fonts.outfitSemiBold },
  cardInfo: { padding: Spacing.sm },
  cardName: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, marginBottom: 4, lineHeight: 18 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardRegion: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  artisanRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  artisanAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(249,115,22,0.3)', alignItems: 'center', justifyContent: 'center' },
  artisanInitial: { color: Colors.saffron, fontSize: 10, fontFamily: Fonts.outfitBold },
  artisanName: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { fontSize: 15, fontFamily: Fonts.outfitBold, color: Colors.saffron },
  inquireBtn: { backgroundColor: 'rgba(99,102,241,0.15)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  inquireBtnText: { color: Colors.indigoLight, fontSize: 11, fontFamily: Fonts.outfitSemiBold },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: Colors.textMuted, fontFamily: Fonts.outfit },
});
