import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, TouchableOpacity,
  Platform, Alert, Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import api from '../../../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../../../constants/theme';
import LoadingShimmer from '../../../components/LoadingShimmer';
import Badge from '../../../components/Badge';
import GradientButton from '../../../components/GradientButton';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => { if (id) fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await api.get(`/products/${id}`);
      if (res.data.success) setProduct(res.data.data);
    } catch { Alert.alert('Error', 'Could not load product.'); router.back(); }
    finally { setLoading(false); }
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const res = await api.put(`/products/${id}`, { isPublished: !product.isPublished });
      if (res.data.success) setProduct(res.data.data);
    } catch { Alert.alert('Error', 'Failed to update status.'); }
    finally { setPublishing(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Product', 'Are you sure you want to delete this product?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/products/${id}`);
            router.replace('/(tabs)/products/index');
          } catch { Alert.alert('Error', 'Failed to delete product.'); }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingShimmer height={280} borderRadius={0} />
        <View style={{ padding: Spacing.lg, gap: 12 }}>
          <LoadingShimmer height={28} />
          <LoadingShimmer height={20} width="60%" />
          <LoadingShimmer height={80} />
        </View>
      </View>
    );
  }

  if (!product) return null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          {product.images?.length > 0 ? (
            <Image source={{ uri: product.images[imageIndex]?.url }} style={styles.mainImage} />
          ) : (
            <View style={[styles.mainImage, styles.imagePlaceholder]}>
              <Feather name="package" size={48} color={Colors.textDim} />
            </View>
          )}
          {/* Overlay header */}
          <LinearGradient colors={['rgba(15,12,10,0.7)', 'transparent']} style={styles.imageOverlay}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Feather name="trash-2" size={18} color={Colors.red} />
            </TouchableOpacity>
          </LinearGradient>

          {/* Thumbnail strip */}
          {product.images?.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnails}>
              {product.images.map((img: any, i: number) => (
                <TouchableOpacity key={i} onPress={() => setImageIndex(i)}>
                  <Image source={{ uri: img.url }} style={[styles.thumbnail, i === imageIndex && styles.thumbnailActive]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.content}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productCategory}>{product.category} · {product.region || 'India'}</Text>
            </View>
            <Badge text={product.isPublished ? 'Live' : 'Draft'} variant={product.isPublished ? 'emerald' : 'saffron'} />
          </View>

          {/* Price & Stock */}
          <View style={styles.priceRow}>
            <View style={styles.priceBox}>
              <Text style={styles.price}>₹{product.price?.toLocaleString('en-IN')}</Text>
              <Text style={styles.priceLabel}>Selling Price</Text>
            </View>
            <View style={styles.stockBox}>
              <Text style={styles.stockValue}>{product.stock}</Text>
              <Text style={styles.stockLabel}>In Stock</Text>
            </View>
            {product.totalSold !== undefined && (
              <View style={styles.soldBox}>
                <Text style={styles.soldValue}>{product.totalSold}</Text>
                <Text style={styles.soldLabel}>Sold</Text>
              </View>
            )}
          </View>

          {/* Publish toggle */}
          <View style={styles.publishRow}>
            <View>
              <Text style={styles.publishTitle}>Publish to Marketplace</Text>
              <Text style={styles.publishSubtitle}>{product.isPublished ? 'Visible to buyers' : 'Hidden from buyers'}</Text>
            </View>
            <Switch
              value={product.isPublished}
              onValueChange={togglePublish}
              disabled={publishing}
              trackColor={{ true: Colors.saffron, false: Colors.bgDark3 }}
              thumbColor="#fff"
            />
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            {[
              { label: 'Materials', value: product.materials },
              { label: 'Crafting Time', value: product.craftingTime ? `${product.craftingTime} hours` : null },
              { label: 'Region', value: product.region },
            ].filter((d) => d.value).map((d) => (
              <View key={d.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{d.label}</Text>
                <Text style={styles.detailValue}>{d.value}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.bottomActions}>
        <GradientButton
          title={product.isPublished ? 'Unpublish' : 'Publish Now'}
          onPress={togglePublish}
          loading={publishing}
          variant={product.isPublished ? 'outline' : 'saffron'}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  imageGallery: { position: 'relative' },
  mainImage: { width: '100%', height: 300, resizeMode: 'cover', backgroundColor: Colors.bgDark3 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 54 : 34, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  thumbnails: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.md, paddingVertical: 8 },
  thumbnail: { width: 50, height: 50, borderRadius: 8, marginRight: 8, borderWidth: 1.5, borderColor: 'transparent' },
  thumbnailActive: { borderColor: Colors.saffron },
  content: { padding: Spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.md },
  productName: { fontSize: 20, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, flex: 1, lineHeight: 26 },
  productCategory: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, marginTop: 4 },
  priceRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  priceBox: { flex: 1, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)' },
  price: { fontSize: 22, fontFamily: Fonts.outfitBlack, color: Colors.saffron },
  priceLabel: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  stockBox: { flex: 1, backgroundColor: Colors.bgDark2, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.borderSubtle },
  stockValue: { fontSize: 22, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary },
  stockLabel: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  soldBox: { flex: 1, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  soldValue: { fontSize: 22, fontFamily: Fonts.outfitBlack, color: Colors.emerald },
  soldLabel: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  publishRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bgDark2, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.borderSubtle },
  publishTitle: { fontSize: 14, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary },
  publishSubtitle: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit, marginTop: 2 },
  section: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  description: { fontSize: 14, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 22 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  detailLabel: { fontSize: 13, color: Colors.textDim, fontFamily: Fonts.outfit },
  detailValue: { fontSize: 13, color: Colors.textPrimary, fontFamily: Fonts.outfitMedium, flex: 1, textAlign: 'right' },
  bottomActions: { padding: Spacing.md, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1, borderTopColor: Colors.borderSubtle, backgroundColor: Colors.bgDark2 },
});
