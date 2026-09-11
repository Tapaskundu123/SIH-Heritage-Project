import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Colors, Fonts, Radius, Spacing } from '../constants/theme';

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isPublished: boolean;
  images?: Array<{ url: string }>;
}

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageBox}>
        {product.images?.[0]?.url ? (
          <Image source={{ uri: product.images[0].url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="package" size={24} color={Colors.textDim} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.category} numberOfLines={1}>{product.category}</Text>
        <View style={styles.footer}>
          <Text style={styles.price}>₹{product.price}</Text>
          <View style={[
            styles.badge,
            { backgroundColor: product.isPublished ? 'rgba(16,185,129,0.15)' : 'rgba(249,115,22,0.15)' }
          ]}>
            <Text style={[
              styles.badgeText,
              { color: product.isPublished ? Colors.emerald : Colors.saffron }
            ]}>
              {product.isPublished ? 'Live' : 'Draft'}
            </Text>
          </View>
        </View>
        <Text style={styles.stock}>Stock: {product.stock}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glassCard,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
    flex: 1,
  },
  imageBox: {
    height: 110,
    backgroundColor: Colors.bgDark3,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: Spacing.sm,
  },
  name: {
    fontSize: 13,
    fontFamily: Fonts.outfitSemiBold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  category: {
    fontSize: 11,
    color: Colors.textDim,
    fontFamily: Fonts.outfit,
    marginBottom: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  price: {
    fontSize: 14,
    fontFamily: Fonts.outfitBold,
    color: Colors.saffron,
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: Fonts.outfitSemiBold,
  },
  stock: {
    fontSize: 11,
    color: Colors.textDim,
    fontFamily: Fonts.outfit,
  },
});
