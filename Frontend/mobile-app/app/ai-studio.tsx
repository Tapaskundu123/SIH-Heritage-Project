/**
 * AI Product Studio — Mobile Screen
 * Integrates bg_removal_service (BiRefNet) + image_enhance_service (OpenCV)
 */
import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Image, Alert, ActivityIndicator, Animated,
  Share, Dimensions,
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
import { useOnboardingPipeline } from '../constants/pipeline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------
// Operations
// ---------------------------------------------------------

type OperationId = 'remove_bg' | 'enhance' | 'studio' | 'all';

interface Operation {
  id: OperationId;
  label: string;
  desc: string;
  icon: string;
  color: string;
  endpoint: string;
  steps: string[];
}

const OPERATIONS: Operation[] = [
  {
    id: 'remove_bg',
    label: 'Remove Background',
    desc: 'BiRefNet deep matting — transparent PNG',
    icon: 'scissors',
    color: Colors.saffron,
    endpoint: '/ai/image/remove-bg',
    steps: ['BiRefNet segmentation', 'Edge refinement', 'Alpha mask'],
  },
  {
    id: 'enhance',
    label: 'Enhance & Brighten',
    desc: 'OpenCV CLAHE + NlMeans denoising',
    icon: 'sun',
    color: Colors.indigoLight,
    endpoint: '/ai/image/enhance',
    steps: ['Adaptive brightness', 'CLAHE contrast', 'Denoising', 'Sharpening'],
  },
  {
    id: 'all',
    label: 'Full Studio Pipeline',
    desc: 'BG removal → enhance → 1024×1024 e-commerce',
    icon: 'layers',
    color: Colors.emerald,
    endpoint: '/ai/image/process-complete',
    steps: ['BiRefNet BG removal', 'OpenCV enhancement', 'E-commerce canvas (1024×1024)'],
  },
];

// ---------------------------------------------------------
// Pipeline stage display
// ---------------------------------------------------------

interface PipelineStage {
  label: string;
  sublabel: string;
  icon: string;
  color: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { label: 'BiRefNet', sublabel: 'Background removal', icon: 'scissors', color: Colors.saffron },
  { label: 'OpenCV', sublabel: 'CLAHE enhancement', icon: 'zap', color: Colors.indigoLight },
  { label: 'Studio', sublabel: '1024×1024 render', icon: 'package', color: Colors.emerald },
];

// ---------------------------------------------------------
// Component
// ---------------------------------------------------------

export default function AIStudioScreen() {
  const router = useRouter();
  const pipeline = useOnboardingPipeline();

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<{
    bgRemoved?: string;
    enhanced?: string;
    ecommerce?: string;
  }>({});
  const [selectedOp, setSelectedOp] = useState<Operation>(OPERATIONS[2]); // Full pipeline default
  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);  // 0=idle, 1,2,3
  const [doneStages, setDoneStages] = useState<number[]>([]);
  const [activeResultTab, setActiveResultTab] = useState<'bgRemoved' | 'enhanced' | 'ecommerce'>('ecommerce');

  // Pulse animation for processing icon
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };
  const stopPulse = () => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); };

  // ---- Image Pickers ----
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.95,
    });
    if (!result.canceled) {
      setOriginalImage(result.assets[0].uri);
      setProcessedImages({});
      setDoneStages([]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.95 });
    if (!result.canceled) {
      setOriginalImage(result.assets[0].uri);
      setProcessedImages({});
      setDoneStages([]);
    }
  };

  // ---- Process Image ----
  const processImage = async () => {
    if (!originalImage) return;
    setProcessing(true);
    setDoneStages([]);
    setCurrentStage(1);
    startPulse();

    try {
      const token = await AsyncStorage.getItem('ks_token');
      const formData = new FormData();
      formData.append('image', {
        uri: originalImage,
        name: 'product.jpg',
        type: 'image/jpeg',
      } as any);

      if (selectedOp.id === 'all') {
        // Full pipeline — animate stages while waiting
        const animateStages = async () => {
          await new Promise(r => setTimeout(r, 3500));
          setCurrentStage(2); setDoneStages([1]);
          await new Promise(r => setTimeout(r, 4000));
          setCurrentStage(3); setDoneStages([1, 2]);
        };
        animateStages();

        const res = await axios.post(`${AI_URL}/ai/image/process-complete`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
          timeout: 180000,
        });

        const data = res.data.data;
        const images = {
          bgRemoved: `data:image/png;base64,${data.no_background}`,
          enhanced: `data:image/jpeg;base64,${data.enhanced}`,
          ecommerce: `data:image/jpeg;base64,${data.ecommerce_ready}`,
          localUri: originalImage || undefined,
        };
        setProcessedImages(images);
        setActiveResultTab('ecommerce');
        setDoneStages([1, 2, 3]);
        setCurrentStage(0);
        // 🔗 Advance onboarding pipeline to Voice step
        if (pipeline.isOnboarding && pipeline.step === 'image') {
          pipeline.completeImageStep(images);
        }

      } else if (selectedOp.id === 'remove_bg') {
        // Binary blob response
        const res = await axios.post(`${AI_URL}/ai/image/remove-bg`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
          responseType: 'blob',
          timeout: 120000,
        });
        // Convert blob to base64
        const blob = res.data as Blob;
        const reader = new FileReader();
        const b64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
        setProcessedImages({ bgRemoved: `data:image/png;base64,${b64}` });
        setActiveResultTab('bgRemoved');
        setDoneStages([1]);
        setCurrentStage(0);

      } else {
        // Enhance
        const res = await axios.post(`${AI_URL}/ai/image/enhance`, formData, {
          headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
          responseType: 'blob',
          timeout: 120000,
        });
        const blob = res.data as Blob;
        const reader = new FileReader();
        const b64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
        setProcessedImages({ enhanced: `data:image/jpeg;base64,${b64}` });
        setActiveResultTab('enhanced');
        setDoneStages([2]);
        setCurrentStage(0);
      }

    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Unknown error';
      Alert.alert('AI Processing Failed', `${msg}\n\nMake sure the AI service is running on port 8000.`);
      setDoneStages([]);
      setCurrentStage(0);
    } finally {
      setProcessing(false);
      stopPulse();
    }
  };

  // ---- Save to gallery ----
  const saveToGallery = async (uri: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          const a = document.createElement('a');
          a.href = uri;
          a.download = uri.startsWith('data:image/png') ? 'ai_studio_result.png' : 'ai_studio_result.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          Alert.alert('Saved!', 'Image downloaded successfully.');
        }
        return;
      }

      // Safe dynamic require to avoid top-level TurboModule crash
      let MediaLibrary: any = null;
      let FileSystem: any = null;
      try {
        MediaLibrary = require('expo-media-library');
        FileSystem = require('expo-file-system');
      } catch {
        // Module unavailable
      }

      if (MediaLibrary?.requestPermissionsAsync && FileSystem) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          if (uri.startsWith('data:')) {
            const base64 = uri.split(',')[1];
            const fileExt = uri.startsWith('data:image/png') ? 'png' : 'jpg';
            const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
            const tempPath = `${cacheDir}ai_studio_result.${fileExt}`;
            await FileSystem.writeAsStringAsync(tempPath, base64, { encoding: FileSystem.EncodingType?.Base64 || 'base64' });
            await MediaLibrary.saveToLibraryAsync(tempPath);
          } else {
            await MediaLibrary.saveToLibraryAsync(uri);
          }
          Alert.alert('Saved!', 'Image saved to your photo library.');
          return;
        }
      }

      // Fallback: Share sheet allows "Save Image", "Save to Files", etc.
      await Share.share({
        url: uri,
        message: 'KarigarSetu AI Studio Product Image',
        title: 'Save Image',
      });
    } catch {
      Alert.alert('Saved', 'Action completed.');
    }
  };

  // ---- Share ----
  const shareImage = async (uri: string) => {
    try {
      let FileSystem: any = null;
      try {
        FileSystem = require('expo-file-system');
      } catch {
        // Module unavailable
      }

      if (FileSystem && uri.startsWith('data:')) {
        const base64 = uri.split(',')[1];
        const fileExt = uri.startsWith('data:image/png') ? 'png' : 'jpg';
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
        const tempPath = `${cacheDir}ai_studio_share.${fileExt}`;
        await FileSystem.writeAsStringAsync(tempPath, base64, { encoding: FileSystem.EncodingType?.Base64 || 'base64' });
        await Share.share({ url: tempPath, title: 'AI Product Studio Result' });
      } else {
        await Share.share({ url: uri, title: 'AI Product Studio Result', message: 'KarigarSetu AI Product Studio' });
      }
    } catch { /* user cancelled */ }
  };

  // ---- Active result image ----
  const activeResultImage =
    activeResultTab === 'bgRemoved' ? processedImages.bgRemoved
    : activeResultTab === 'enhanced' ? processedImages.enhanced
    : processedImages.ecommerce;

  const hasResults = !!(processedImages.bgRemoved || processedImages.enhanced || processedImages.ecommerce);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['rgba(99,102,241,0.15)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerBadgeRow}>
          <View style={[styles.badge, { borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.1)' }]}>
            <Feather name="cpu" size={10} color={Colors.indigoLight} />
            <Text style={[styles.badgeText, { color: Colors.indigoLight }]}>BiRefNet + OpenCV</Text>
          </View>
          <View style={[styles.badge, { borderColor: 'rgba(249,115,22,0.3)', backgroundColor: 'rgba(249,115,22,0.1)' }]}>
            <Feather name="zap" size={10} color={Colors.saffron} />
            <Text style={[styles.badgeText, { color: Colors.saffron }]}>CUDA Accelerated</Text>
          </View>
        </View>
        <Text style={styles.title}>AI Product Studio</Text>
        <Text style={styles.subtitle}>
          Professional product images in seconds — background removal, enhancement & e-commerce rendering.
        </Text>
      </LinearGradient>

      <View style={styles.content}>

        {/* ── Onboarding pipeline hint ── */}
        {pipeline.isOnboarding && pipeline.step === 'image' && (
          <View style={styles.onboardingHint}>
            <View style={styles.onboardingHintLeft}>
              <View style={styles.onboardingStep}>
                <Text style={styles.onboardingStepNum}>1</Text>
              </View>
              <View>
                <Text style={styles.onboardingHintTitle}>📸 Step 1 of 4 — AI Photo Studio</Text>
                <Text style={styles.onboardingHintSub}>Upload a product photo and run the Full Pipeline to continue →</Text>
              </View>
            </View>
          </View>
        )}

        {/* Upload area */}
        {!originalImage ? (
          <View style={styles.uploadArea}>
            <View style={styles.uploadIconWrap}>
              <Feather name="image" size={32} color={Colors.textDim} />
            </View>
            <Text style={styles.uploadTitle}>Add a Product Photo</Text>
            <Text style={styles.uploadSubtitle}>Take a photo or pick from your gallery</Text>
            <View style={styles.uploadBtns}>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage} activeOpacity={0.8}>
                <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.uploadBtnGrad}>
                  <Feather name="image" size={17} color="#fff" />
                  <Text style={styles.uploadBtnText}>Gallery</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto} activeOpacity={0.8}>
                <LinearGradient colors={[Colors.indigo, '#4f46e5']} style={styles.uploadBtnGrad}>
                  <Feather name="camera" size={17} color="#fff" />
                  <Text style={styles.uploadBtnText}>Camera</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Image panels */}
            <View style={styles.imageRow}>
              <View style={styles.imagePanel}>
                <Text style={styles.panelLabel}>Original</Text>
                <Image source={{ uri: originalImage }} style={styles.previewImg} />
              </View>
              {activeResultImage && (
                <View style={styles.imagePanel}>
                  <Text style={[styles.panelLabel, { color: selectedOp.color }]}>Result ✨</Text>
                  <Image
                    source={{ uri: activeResultImage }}
                    style={[
                      styles.previewImg,
                      activeResultTab === 'bgRemoved' && { backgroundColor: '#2a2a2a' },
                    ]}
                  />
                </View>
              )}
            </View>

            {/* Result tabs */}
            {hasResults && (
              <View style={styles.tabRow}>
                {[
                  { key: 'bgRemoved' as const, label: 'BG Removed', color: Colors.saffron, available: !!processedImages.bgRemoved },
                  { key: 'enhanced' as const, label: 'Enhanced', color: Colors.indigoLight, available: !!processedImages.enhanced },
                  { key: 'ecommerce' as const, label: 'E-Commerce', color: Colors.emerald, available: !!processedImages.ecommerce },
                ].filter(t => t.available).map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tab,
                      activeResultTab === tab.key && { backgroundColor: `${tab.color}20`, borderColor: `${tab.color}50` },
                    ]}
                    onPress={() => setActiveResultTab(tab.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabText, activeResultTab === tab.key && { color: tab.color }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Change photo */}
            <View style={styles.changeRow}>
              <TouchableOpacity onPress={pickImage} style={styles.changeBtn}>
                <Feather name="refresh-cw" size={13} color={Colors.textDim} />
                <Text style={styles.changeBtnText}>Change Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={takePhoto} style={styles.changeBtn}>
                <Feather name="camera" size={13} color={Colors.textDim} />
                <Text style={styles.changeBtnText}>Retake</Text>
              </TouchableOpacity>
            </View>

            {/* Operation selector */}
            <Text style={styles.sectionLabel}>PROCESSING MODE</Text>
            <View style={styles.opList}>
              {OPERATIONS.map((op) => (
                <TouchableOpacity
                  key={op.id}
                  style={[
                    styles.opCard,
                    selectedOp.id === op.id && { borderColor: `${op.color}55`, backgroundColor: `${op.color}0e` },
                  ]}
                  onPress={() => setSelectedOp(op)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.opIcon, { backgroundColor: `${op.color}20` }]}>
                    <Feather name={op.icon as any} size={18} color={op.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.opLabel, selectedOp.id === op.id && { color: op.color }]}>{op.label}</Text>
                    <Text style={styles.opDesc}>{op.desc}</Text>
                  </View>
                  {selectedOp.id === op.id && (
                    <Feather name="check-circle" size={16} color={op.color} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* AI steps preview */}
            {!processing && (
              <GlassCard style={styles.stepsCard}>
                <Text style={styles.stepsTitle}>AI Steps</Text>
                {selectedOp.steps.map((step, i) => (
                  <View key={i} style={styles.stepRow}>
                    <View style={[styles.stepDot, { backgroundColor: selectedOp.color }]} />
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* Pipeline progress (during full pipeline) */}
            {processing && selectedOp.id === 'all' && (
              <GlassCard style={styles.pipelineCard}>
                <Text style={styles.stepsTitle}>Running Pipeline</Text>
                {PIPELINE_STAGES.map((stage, i) => {
                  const stageNum = i + 1;
                  const isDone = doneStages.includes(stageNum);
                  const isActive = currentStage === stageNum;
                  return (
                    <View key={stage.label} style={[
                      styles.pipelineStep,
                      isActive && { borderColor: `${stage.color}50`, backgroundColor: `${stage.color}0a` },
                      isDone && { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.06)' },
                    ]}>
                      <View style={[styles.pipelineStepIcon, {
                        backgroundColor: isDone ? 'rgba(16,185,129,0.2)' : isActive ? `${stage.color}20` : 'rgba(196,168,130,0.06)',
                      }]}>
                        {isDone ? (
                          <Feather name="check" size={14} color={Colors.emerald} />
                        ) : isActive ? (
                          <ActivityIndicator size="small" color={stage.color} />
                        ) : (
                          <Feather name={stage.icon as any} size={14} color={Colors.textDim} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pipelineLabel, { color: isDone ? Colors.emerald : isActive ? stage.color : Colors.textDim }]}>
                          {stage.label}
                        </Text>
                        <Text style={styles.pipelineSub}>{stage.sublabel}</Text>
                      </View>
                      {isDone && <Text style={styles.doneText}>Done</Text>}
                      {isActive && <Text style={[styles.doneText, { color: stage.color }]}>Running...</Text>}
                    </View>
                  );
                })}
              </GlassCard>
            )}

            {/* Single-op spinner */}
            {processing && selectedOp.id !== 'all' && (
              <GlassCard style={styles.processingCard}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <View style={[styles.processingIconWrap, { backgroundColor: `${selectedOp.color}20` }]}>
                    <Feather name={selectedOp.icon as any} size={28} color={selectedOp.color} />
                  </View>
                </Animated.View>
                <Text style={styles.processingText}>
                  {selectedOp.id === 'remove_bg' ? 'BiRefNet removing background...' : 'OpenCV enhancing image...'}
                </Text>
                <Text style={styles.processingSubtext}>This may take 15–60 seconds</Text>
                <ActivityIndicator color={selectedOp.color} style={{ marginTop: 8 }} />
              </GlassCard>
            )}

            {/* Process / Re-process button */}
            {!processing && (
              <GradientButton
                title={hasResults ? `Re-process (${selectedOp.label})` : `Run: ${selectedOp.label}`}
                onPress={processImage}
                style={{ marginTop: Spacing.md }}
              />
            )}

            {/* Save & Share buttons */}
            {!processing && activeResultImage && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => saveToGallery(activeResultImage)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[Colors.emerald, '#059669']} style={styles.actionBtnGrad}>
                    <Feather name="download" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Save to Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => shareImage(activeResultImage)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={[Colors.indigo, '#4f46e5']} style={styles.actionBtnGrad}>
                    <Feather name="share-2" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Share</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
            {/* Next step pipeline nudge (onboarding) */}
            {!processing && hasResults && pipeline.isOnboarding && pipeline.step === 'voice' && (
              <TouchableOpacity
                style={styles.nextStepCard}
                onPress={() => router.push('/voice-cataloger')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(129,140,248,0.18)', 'rgba(99,102,241,0.08)']}
                  style={styles.nextStepGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <View style={styles.nextStepIconWrap}>
                    <Feather name="check-circle" size={18} color={Colors.emerald} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextStepLabel}>Image ready! Next: Voice Cataloger</Text>
                    <Text style={styles.nextStepSub}>Describe this product in your language → Step 2 of 4</Text>
                  </View>
                  <Feather name="arrow-right" size={18} color={Colors.indigoLight} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------
// Styles
// ---------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backBtn: { width: 36, marginBottom: Spacing.md },
  headerBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 10, fontFamily: Fonts.outfitSemiBold },
  title: { fontSize: 26, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 20 },

  content: { padding: Spacing.lg },

  // Upload
  uploadArea: {
    alignItems: 'center', paddingVertical: 44,
    backgroundColor: Colors.bgDark2, borderRadius: Radius.xl,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.borderMuted,
  },
  uploadIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(249,115,22,0.08)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  uploadTitle: { fontSize: 17, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 6 },
  uploadSubtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, marginBottom: Spacing.xl },
  uploadBtns: { flexDirection: 'row', gap: Spacing.sm },
  uploadBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  uploadBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 13 },
  uploadBtnText: { color: '#fff', fontFamily: Fonts.outfitSemiBold, fontSize: 14 },

  // Image comparison
  imageRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  imagePanel: { flex: 1 },
  panelLabel: {
    fontSize: 11, fontFamily: Fonts.outfitSemiBold, color: Colors.textDim,
    marginBottom: 6, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  previewImg: {
    width: '100%', height: 170, borderRadius: Radius.md,
    resizeMode: 'contain', backgroundColor: Colors.bgDark3,
  },

  // Result tabs
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  tab: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.borderSubtle, backgroundColor: 'transparent',
  },
  tabText: { fontSize: 11, fontFamily: Fonts.outfitSemiBold, color: Colors.textDim },

  // Change photo
  changeRow: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center', marginBottom: Spacing.lg },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  changeBtnText: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit },

  // Operations
  sectionLabel: {
    fontSize: 10, fontFamily: Fonts.outfitSemiBold, color: Colors.textDim,
    marginBottom: Spacing.sm, letterSpacing: 1,
  },
  opList: { flexDirection: 'column', gap: 8, marginBottom: Spacing.md },
  opCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgDark2, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md,
  },
  opIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  opLabel: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, marginBottom: 2 },
  opDesc: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },

  // Steps card
  stepsCard: { padding: Spacing.md, marginBottom: Spacing.md },
  stepsTitle: {
    fontSize: 10, fontFamily: Fonts.outfitSemiBold, color: Colors.textDim,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  stepDot: { width: 5, height: 5, borderRadius: 3 },
  stepText: { fontSize: 12, color: Colors.textMuted, fontFamily: Fonts.outfit },

  // Pipeline card (full pipeline progress)
  pipelineCard: { padding: Spacing.md, marginBottom: Spacing.md },
  pipelineStep: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.borderSubtle, marginBottom: 8,
  },
  pipelineStepIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pipelineLabel: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, marginBottom: 1 },
  pipelineSub: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  doneText: { fontSize: 11, fontFamily: Fonts.outfitSemiBold, color: Colors.emerald },

  // Processing spinner card
  processingCard: {
    alignItems: 'center', padding: Spacing.xl,
    marginBottom: Spacing.md, gap: 10,
  },
  processingIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  processingText: { fontSize: 15, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, textAlign: 'center' },
  processingSubtext: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit },

  // Save / Share row
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  actionBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  actionBtnText: { color: '#fff', fontFamily: Fonts.outfitSemiBold, fontSize: 14 },

  // Onboarding hint card
  onboardingHint: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderRadius: Radius.md, borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    padding: 12, marginBottom: Spacing.md,
  },
  onboardingHintLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  onboardingStep: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.saffron,
    alignItems: 'center', justifyContent: 'center',
  },
  onboardingStepNum: { color: '#fff', fontSize: 12, fontFamily: Fonts.outfitBold },
  onboardingHintTitle: { fontSize: 12, fontFamily: Fonts.outfitSemiBold, color: Colors.saffron, marginBottom: 2 },
  onboardingHintSub: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.outfit },

  // Next step CTA card
  nextStepCard: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.md },
  nextStepGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(129,140,248,0.3)',
  },
  nextStepIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  nextStepLabel: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, marginBottom: 2 },
  nextStepSub: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.outfit },
});
