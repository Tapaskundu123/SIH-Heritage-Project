import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Image, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_URL } from '../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';

const OPERATIONS = [
  { id: 'remove_bg', label: 'Remove Background', desc: 'Clean white/transparent background', icon: 'scissors', color: Colors.saffron },
  { id: 'enhance', label: 'Enhance & Brighten', desc: 'Improve lighting and colors', icon: 'sun', color: Colors.amber },
  { id: 'studio', label: 'Studio Shot', desc: 'Professional e-commerce look', icon: 'camera', color: Colors.indigo },
  { id: 'all', label: 'Full Makeover', desc: 'All enhancements combined', icon: 'sparkles', color: Colors.emerald },
];

export default function AIStudioScreen() {
  const router = useRouter();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState(OPERATIONS[0]);
  const [processing, setProcessing] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!result.canceled) {
      setOriginalImage(result.assets[0].uri);
      setProcessedImage(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled) {
      setOriginalImage(result.assets[0].uri);
      setProcessedImage(null);
    }
  };

  const processImage = async () => {
    if (!originalImage) return;
    setProcessing(true);
    try {
      const token = await AsyncStorage.getItem('ks_token');
      const formData = new FormData();
      formData.append('image', { uri: originalImage, name: 'photo.jpg', type: 'image/jpeg' } as any);
      formData.append('operation', selectedOp.id);
      const res = await axios.post(`${AI_URL}/process-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
        timeout: 60000,
      });
      if (res.data.output_image) {
        setProcessedImage(`data:image/png;base64,${res.data.output_image}`);
      }
    } catch {
      // Demo: show original with a label
      setProcessedImage(originalImage);
      Alert.alert('AI Service Offline', 'Using demo mode. Connect the AI service for real processing.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['rgba(99,102,241,0.12)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.title}>AI Photo Studio</Text>
        <View style={styles.badge}><Feather name="image" size={11} color={Colors.indigo} /><Text style={[styles.badgeText, { color: Colors.indigoLight }]}>Smart AI</Text></View>
        <Text style={styles.subtitle}>Transform your product photos into professional e-commerce images.</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Image pick area */}
        {!originalImage ? (
          <View style={styles.uploadArea}>
            <Feather name="image" size={40} color={Colors.textDim} style={{ marginBottom: 12 }} />
            <Text style={styles.uploadTitle}>Add a Product Photo</Text>
            <Text style={styles.uploadSubtitle}>Choose from gallery or take a new photo</Text>
            <View style={styles.uploadBtns}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.8}>
                <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.uploadBtnGrad}>
                  <Feather name="image" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>Gallery</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto} activeOpacity={0.8}>
                <LinearGradient colors={[Colors.indigo, '#4f46e5']} style={styles.uploadBtnGrad}>
                  <Feather name="camera" size={18} color="#fff" />
                  <Text style={styles.uploadBtnText}>Camera</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Before / After */}
            <View style={styles.imageCompare}>
              <View style={styles.imagePanel}>
                <Text style={styles.imagePanelLabel}>Original</Text>
                <Image source={{ uri: originalImage }} style={styles.previewImage} />
              </View>
              {processedImage && (
                <View style={styles.imagePanel}>
                  <Text style={[styles.imagePanelLabel, { color: Colors.emerald }]}>Enhanced ✨</Text>
                  <Image source={{ uri: processedImage }} style={styles.previewImage} />
                </View>
              )}
            </View>

            {/* Change photo */}
            <TouchableOpacity style={styles.changePhoto} onPress={pickImage}>
              <Feather name="refresh-cw" size={14} color={Colors.textDim} />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>

            {/* Operation selector */}
            <Text style={styles.sectionLabel}>Choose Enhancement</Text>
            <View style={styles.opGrid}>
              {OPERATIONS.map((op) => (
                <TouchableOpacity
                  key={op.id}
                  style={[styles.opCard, selectedOp.id === op.id && { borderColor: op.color, backgroundColor: `${op.color}12` }]}
                  onPress={() => setSelectedOp(op)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.opIcon, { backgroundColor: `${op.color}20` }]}>
                    <Feather name={op.icon as any} size={20} color={op.color} />
                  </View>
                  <Text style={[styles.opLabel, selectedOp.id === op.id && { color: op.color }]}>{op.label}</Text>
                  <Text style={styles.opDesc}>{op.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {processing ? (
              <GlassCard style={styles.processingCard}>
                <ActivityIndicator color={Colors.saffron} size="large" />
                <Text style={styles.processingText}>AI is enhancing your image...</Text>
                <Text style={styles.processingSubtext}>This may take 15-30 seconds</Text>
              </GlassCard>
            ) : (
              <GradientButton
                title={processedImage ? 'Re-process Image' : `Apply ${selectedOp.label}`}
                onPress={processImage}
                style={{ marginTop: Spacing.md }}
              />
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  backBtn: { width: 36, marginBottom: Spacing.md },
  title: { fontSize: 24, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', alignSelf: 'flex-start', marginBottom: 8 },
  badgeText: { fontSize: 10, fontFamily: Fonts.outfitSemiBold },
  subtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 20 },
  content: { padding: Spacing.lg },
  uploadArea: { alignItems: 'center', paddingVertical: 40, backgroundColor: Colors.bgDark2, borderRadius: Radius.xl, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.borderMuted },
  uploadTitle: { fontSize: 17, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 6 },
  uploadSubtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, marginBottom: Spacing.xl },
  uploadBtns: { flexDirection: 'row', gap: Spacing.sm },
  uploadBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  uploadBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  uploadBtnText: { color: '#fff', fontFamily: Fonts.outfitSemiBold, fontSize: 14 },
  imageCompare: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  imagePanel: { flex: 1 },
  imagePanelLabel: { fontSize: 12, fontFamily: Fonts.outfitMedium, color: Colors.textDim, marginBottom: 6, textAlign: 'center' },
  previewImage: { width: '100%', height: 180, borderRadius: Radius.md, resizeMode: 'cover', backgroundColor: Colors.bgDark3 },
  changePhoto: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginBottom: Spacing.lg, paddingVertical: 6 },
  changePhotoText: { fontSize: 13, color: Colors.textDim, fontFamily: Fonts.outfit },
  sectionLabel: { fontSize: 14, fontFamily: Fonts.outfitSemiBold, color: Colors.textMuted, marginBottom: Spacing.sm },
  opGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.sm },
  opCard: { width: '47%', backgroundColor: Colors.bgDark2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md },
  opIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  opLabel: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, marginBottom: 3 },
  opDesc: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  processingCard: { alignItems: 'center', padding: Spacing.xl, marginTop: Spacing.md, gap: 12 },
  processingText: { fontSize: 15, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary },
  processingSubtext: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit },
});
