import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Platform, Alert, Image, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../../../constants/theme';
import GradientButton from '../../../components/GradientButton';
import { useOnboardingPipeline } from '../../../constants/pipeline';

const CRAFT_TYPES = ['Pottery', 'Weaving', 'Embroidery', 'Wood Carving', 'Metal Work', 'Jewelry', 'Painting', 'Leather Work', 'Bamboo Craft', 'Stone Craft', 'Other'];

export default function NewProductScreen() {
  const router = useRouter();
  const pipeline = useOnboardingPipeline();
  const [form, setForm] = useState({
    name: '', description: '', category: '', price: '', stock: '1',
    materials: '', craftingTime: '', region: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Auto-fill from pipeline data if available
  useEffect(() => {
    if (!pipeline.hydrated) return;
    const patch: Partial<typeof form> = {};
    let filled = false;

    if (pipeline.voiceSpecs) {
      if (pipeline.voiceSpecs.name) patch.name = pipeline.voiceSpecs.name;
      if (pipeline.voiceSpecs.description) patch.description = pipeline.voiceSpecs.description;
      if (pipeline.voiceSpecs.category) {
        // Match or default
        const match = CRAFT_TYPES.find(c => c.toLowerCase() === pipeline.voiceSpecs?.category.toLowerCase());
        patch.category = match || pipeline.voiceSpecs.category;
      }
      if (pipeline.voiceSpecs.materials) patch.materials = pipeline.voiceSpecs.materials;
      filled = true;
    }

    if (pipeline.predictedPrice?.recommended_price) {
      patch.price = String(pipeline.predictedPrice.recommended_price);
      filled = true;
    } else if (pipeline.voiceSpecs?.price_hint) {
      patch.price = String(pipeline.voiceSpecs.price_hint);
      filled = true;
    }

    if (filled) {
      setForm((prev) => ({ ...prev, ...patch }));
      setAutoFilled(true);
    }

    if (pipeline.studioImages?.localUri) {
      setImages((prev) => prev.length === 0 ? [pipeline.studioImages!.localUri!] : prev);
    }
  }, [pipeline.hydrated, pipeline.voiceSpecs, pipeline.predictedPrice, pipeline.studioImages]);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8 });
    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const removeImage = (uri: string) => setImages((prev) => prev.filter((u) => u !== uri));

  const handleSubmit = async () => {
    if (!form.name || !form.category || !form.price || !form.stock) {
      Alert.alert('Missing Fields', 'Name, category, price, and stock are required.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      images.forEach((uri, i) => {
        formData.append('images', { uri, name: `image_${i}.jpg`, type: 'image/jpeg' } as any);
      });
      const res = await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        if (pipeline.isOnboarding) {
          pipeline.completeOnboarding(res.data.data?._id || 'new');
          Alert.alert('Congratulations! 🎉', 'Your first product is now live on KarigarSetu marketplace!', [
            { text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') }
          ]);
        } else {
          Alert.alert('Success! 🎉', 'Product added successfully!', [{ text: 'OK', onPress: () => router.back() }]);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to add product.');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, key: k, placeholder, multiline = false, keyboardType = 'default' }: any) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textarea]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDim}
        value={(form as any)[k]}
        onChangeText={(v) => update(k, v)}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.bgDark }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['rgba(249,115,22,0.08)', 'transparent']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Product</Text>
          <TouchableOpacity onPress={() => router.push('/voice-cataloger')} style={styles.voiceHint}>
            <Feather name="mic" size={16} color={Colors.saffron} />
            <Text style={styles.voiceHintText}>Use Voice</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.form}>
          {/* AI Pipeline Auto-fill Notification */}
          {autoFilled && (
            <View style={styles.pipelineBadge}>
              <Feather name="zap" size={14} color={Colors.saffron} />
              <View style={{ flex: 1 }}>
                <Text style={styles.pipelineBadgeTitle}>Auto-filled by AI Pipeline</Text>
                <Text style={styles.pipelineBadgeDesc}>Details pulled from your AI Photo, Voice Cataloger & AI Pricing steps.</Text>
              </View>
              <Feather name="check-circle" size={16} color={Colors.emerald} />
            </View>
          )}

          {/* Images */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Images (up to 5)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.imagesRow}>
                {images.map((uri) => (
                  <View key={uri} style={styles.imageThumb}>
                    <Image source={{ uri }} style={styles.thumbImg} />
                    <TouchableOpacity style={styles.removeImg} onPress={() => removeImage(uri)}>
                      <Feather name="x" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity style={styles.imageAdd} onPress={pickImage}>
                    <Feather name="plus" size={24} color={Colors.textDim} />
                    <Text style={styles.imageAddText}>Add Photo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>

          <Field label="Product Name *" k="name" placeholder="e.g. Handwoven Banarasi Silk Saree" />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity style={styles.input} onPress={() => setCategoryOpen(!categoryOpen)}>
              <Text style={[{ flex: 1 }, !form.category && { color: Colors.textDim }]}>{form.category || 'Select category'}</Text>
              <Feather name={categoryOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textDim} />
            </TouchableOpacity>
            {categoryOpen && (
              <View style={styles.dropdown}>
                {CRAFT_TYPES.map((ct) => (
                  <TouchableOpacity key={ct} style={[styles.dropdownItem, form.category === ct && styles.dropdownItemActive]}
                    onPress={() => { update('category', ct); setCategoryOpen(false); }}>
                    <Text style={[styles.dropdownText, form.category === ct && { color: Colors.saffron }]}>{ct}</Text>
                    {form.category === ct && <Feather name="check" size={14} color={Colors.saffron} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Field label="Description" k="description" placeholder="Describe your product, its making, cultural significance..." multiline />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Field label="Price (₹) *" k="price" placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Field label="Stock Qty *" k="stock" placeholder="0" keyboardType="numeric" />
            </View>
          </View>

          <Field label="Materials Used" k="materials" placeholder="e.g. Pure Silk, Natural Dyes" />
          <Field label="Crafting Time (hours)" k="craftingTime" placeholder="e.g. 40" keyboardType="numeric" />
          <Field label="Region / Origin" k="region" placeholder="e.g. Varanasi, Uttar Pradesh" />

          <GradientButton title="Add Product" onPress={handleSubmit} loading={loading} style={{ marginTop: Spacing.md }} />
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn: { width: 36 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  voiceHint: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(249,115,22,0.3)', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  voiceHintText: { color: Colors.saffron, fontSize: 12, fontFamily: Fonts.outfitMedium },
  form: { padding: Spacing.lg, paddingTop: 0 },
  inputGroup: { marginBottom: Spacing.md },
  label: { color: Colors.textMuted, fontFamily: Fonts.outfitMedium, fontSize: 13, marginBottom: 6 },
  input: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: 12, paddingVertical: 13, color: Colors.textPrimary, fontFamily: Fonts.outfit, fontSize: 14 },
  textarea: { minHeight: 100, paddingTop: 12 },
  row: { flexDirection: 'row' },
  imagesRow: { flexDirection: 'row', gap: 10 },
  imageThumb: { width: 90, height: 90, borderRadius: Radius.md, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeImg: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 3 },
  imageAdd: { width: 90, height: 90, backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  imageAddText: { color: Colors.textDim, fontSize: 11, fontFamily: Fonts.outfit },
  dropdown: { backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, marginTop: 4, maxHeight: 220, overflow: 'hidden' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  dropdownItemActive: { backgroundColor: 'rgba(249,115,22,0.08)' },
  dropdownText: { color: Colors.textMuted, fontFamily: Fonts.outfit, fontSize: 14 },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  cancelText: { color: Colors.textDim, fontFamily: Fonts.outfit, fontSize: 14 },
  pipelineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  pipelineBadgeTitle: {
    fontSize: 13,
    fontFamily: Fonts.outfitBold,
    color: Colors.saffron,
    marginBottom: 2,
  },
  pipelineBadgeDesc: {
    fontSize: 11,
    fontFamily: Fonts.outfit,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});

