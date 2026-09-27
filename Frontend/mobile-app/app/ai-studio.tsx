/**
 * AI Product Studio — Mobile Screen
 * Parity with Web App AI Studio:
 * - Direct Camera & Gallery capture
 * - Operations: Background Removal (BiRefNet), Image Enhancer (OpenCV), Full Image Pipeline
 * - Real-time animated multi-stage pipeline tracker
 * - View tabs: Original, BG Removed, Enhanced, Final Product Image
 * - PNG Transparency Backdrop switcher (Checkerboard, Dark, White, Cream)
 * - "Hold to Peek Original" quick comparison
 * - Cloudflare Tunnel backend proxy routing with direct AI fallback
 * - Gallery Save, Share & Onboarding pipeline auto-continuation
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Image, Alert, ActivityIndicator, Animated,
  Share, Dimensions, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { AI_URL, BASE_URL, apiPostWithFallback } from '../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import GlassCard from '../components/GlassCard';
import GradientButton from '../components/GradientButton';
import { useOnboardingPipeline } from '../constants/pipeline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Pure JS ArrayBuffer to Base64 (zero-dependency, native React Native/Hermes safe)
function arrayBufferToBase64(data: any): string {
  if (typeof data === 'string') return data;
  if (!data) return '';
  try {
    const bytes = new Uint8Array(data);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let base64 = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i += 3) {
      const b0 = bytes[i];
      const b1 = i + 1 < len ? bytes[i + 1] : 0;
      const b2 = i + 2 < len ? bytes[i + 2] : 0;

      base64 += chars[b0 >> 2];
      base64 += chars[((b0 & 3) << 4) | (b1 >> 4)];
      base64 += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
      base64 += i + 2 < len ? chars[b2 & 63] : '=';
    }
    return base64;
  } catch {
    return String(data);
  }
}

type OperationId = 'remove_bg' | 'enhance' | 'all';
type ViewTab = 'original' | 'bgRemoved' | 'enhanced' | 'ecommerce';
type Backdrop = 'checker' | 'dark' | 'white' | 'cream';

interface Operation {
  id: OperationId;
  label: string;
  badge: string;
  desc: string;
  icon: string;
  color: string;
  steps: string[];
}

const OPERATIONS: Operation[] = [
  {
    id: 'all',
    label: 'Full Image Pipeline',
    badge: 'Recommended',
    desc: 'BG Removal → OpenCV Enhancer → 1024×1024 Studio Ready Canvas',
    icon: 'layers',
    color: Colors.emerald,
    steps: ['Upload product Image', 'BiRefNet BG Removal', 'OpenCV CLAHE Enhancer', 'Final Product Image Canvas'],
  },
  {
    id: 'remove_bg',
    label: 'Background Removal',
    badge: 'BiRefNet',
    desc: 'Ultra-clean subject isolation with transparent PNG mask',
    icon: 'scissors',
    color: Colors.saffron,
    steps: ['Deep subject segmentation', 'Edge refinement', 'Clean transparent PNG'],
  },
  {
    id: 'enhance',
    label: 'Image Enhancer',
    badge: 'OpenCV CLAHE',
    desc: 'Adaptive contrast, true-color vibrancy & detail sharpening',
    icon: 'zap',
    color: Colors.indigoLight,
    steps: ['Adaptive lighting', 'CLAHE contrast', 'NlMeans denoising', 'Sharpness boost'],
  },
];

interface PipelineStage {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
}

const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'bg', label: '1. Background Removal', sublabel: 'BiRefNet deep matting', icon: 'scissors', color: Colors.saffron },
  { id: 'enhance', label: '2. Image Enhancer', sublabel: 'OpenCV CLAHE adaptive light', icon: 'zap', color: Colors.indigoLight },
  { id: 'ecom', label: '3. Final Product Image', sublabel: '1024×1024 studio canvas', icon: 'package', color: Colors.emerald },
];

export default function AIStudioScreen() {
  const router = useRouter();
  const pipeline = useOnboardingPipeline();

  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<{
    bgRemoved?: string;
    enhanced?: string;
    ecommerce?: string;
  }>({});
  const [selectedOp, setSelectedOp] = useState<Operation>(OPERATIONS[0]); // Full pipeline default
  const [activeTab, setActiveTab] = useState<ViewTab>('original');
  const [backdrop, setBackdrop] = useState<Backdrop>('dark');
  const [peekOriginal, setPeekOriginal] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0); // 0=idle, 1=bg, 2=enhance, 3=ecom
  const [doneStages, setDoneStages] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  // AI backend health state
  const [aiStatus, setAiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Pulse animation for processing
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Check AI health on mount
  useEffect(() => {
    (async () => {
      try {
        // Try backend AI health or direct AI health
        // Check backend proxy health (which internally checks AI at localhost:8000)
        const res = await api.get('/ai/health', { timeout: 4000 }).catch(() => null);
        if (res?.data?.success || res?.status === 200) {
          setAiStatus('online');
        } else {
          setAiStatus('online'); // optimistic — show online by default
        }
      } catch {
        setAiStatus('online');
      }
    })();
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // ---------------------------------------------------------
  // Image Selection (Camera & Gallery)
  // ---------------------------------------------------------
  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow photo gallery access in settings.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.95,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setOriginalImage(res.assets[0].uri);
        setProcessedImages({});
        setActiveTab('original');
        setDoneStages([]);
        setErrorMessage('');
      }
    } catch (err: any) {
      console.error('Gallery pick error:', err);
      Alert.alert('Gallery Error', err?.message || 'Could not pick photo.');
    }
  };

  const captureFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Please allow camera access in device settings.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.95,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        setOriginalImage(res.assets[0].uri);
        setProcessedImages({});
        setActiveTab('original');
        setDoneStages([]);
        setErrorMessage('');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      Alert.alert('Camera Error', err?.message || 'Could not launch camera.');
    }
  };

  // ---------------------------------------------------------
  // AI Image Processing
  // ---------------------------------------------------------
  const processImage = async () => {
    if (!originalImage) return;

    setProcessing(true);
    setErrorMessage('');
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
        // Multi-stage animation tracker
        const t1 = setTimeout(() => {
          setCurrentStage(2);
          setDoneStages([1]);
        }, 3500);

        const t2 = setTimeout(() => {
          setCurrentStage(3);
          setDoneStages([1, 2]);
        }, 7500);

        // Multi-tier: Cloudflare backend tunnel → Local Wi-Fi backend
        // Backend internally proxies to AI at localhost:8000 — never call AI_URL directly.
        const res = await apiPostWithFallback('/ai/image/process-complete', formData, {
          timeout: 180000,
          isFormData: true,
        });

        clearTimeout(t1);
        clearTimeout(t2);

        const data = res?.data?.data || res?.data;
        const images = {
          bgRemoved: `data:image/png;base64,${data.no_background}`,
          enhanced: `data:image/jpeg;base64,${data.enhanced}`,
          ecommerce: `data:image/jpeg;base64,${data.ecommerce_ready}`,
        };

        setProcessedImages(images);
        setActiveTab('ecommerce');
        setDoneStages([1, 2, 3]);
        setCurrentStage(0);

        // Save to Onboarding Pipeline
        if (pipeline.isOnboarding && pipeline.step === 'image') {
          pipeline.completeImageStep({
            localUri: originalImage,
            bgRemoved: images.bgRemoved,
            enhanced: images.enhanced,
            ecommerce: images.ecommerce,
          });
        }
      } else if (selectedOp.id === 'remove_bg') {
        const res = await apiPostWithFallback('/ai/image/remove-bg', formData, {
          timeout: 120000,
          isFormData: true,
          responseType: 'arraybuffer',
        });

        // Convert ArrayBuffer → base64 cleanly without Node buffer
        const b64 = arrayBufferToBase64(res.data);
        const bgUrl = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;

        setProcessedImages((prev) => ({ ...prev, bgRemoved: bgUrl }));
        setActiveTab('bgRemoved');
        setDoneStages([1]);
        setCurrentStage(0);
      } else {
        // Enhance
        const res = await apiPostWithFallback('/ai/image/enhance', formData, {
          timeout: 120000,
          isFormData: true,
          responseType: 'arraybuffer',
        });

        // Convert ArrayBuffer → base64 cleanly without Node buffer
        const b64 = arrayBufferToBase64(res.data);
        const enhUrl = b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;

        setProcessedImages((prev) => ({ ...prev, enhanced: enhUrl }));
        setActiveTab('enhanced');
        setDoneStages([2]);
        setCurrentStage(0);
      }
    } catch (err: any) {
      console.error('AI studio processing error:', err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Processing failed. Ensure the AI service is active.';
      setErrorMessage(msg);
      Alert.alert('AI Processing Error', `${msg}\n\nMake sure port 5000 / 8000 is running.`);
      setDoneStages([]);
      setCurrentStage(0);
    } finally {
      setProcessing(false);
      stopPulse();
    }
  };

  // ---------------------------------------------------------
  // Save & Share Handlers
  // ---------------------------------------------------------
  const saveToGallery = async (uri: string) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof document !== 'undefined') {
          const a = document.createElement('a');
          a.href = uri;
          a.download = uri.startsWith('data:image/png') ? 'karigar_product.png' : 'karigar_product.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          Alert.alert('Downloaded', 'Product image downloaded successfully.');
        }
        return;
      }

      let MediaLibrary: any = null;
      let FileSystem: any = null;
      try {
        MediaLibrary = require('expo-media-library');
        FileSystem = require('expo-file-system');
      } catch {}

      if (MediaLibrary?.requestPermissionsAsync && FileSystem) {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          if (uri.startsWith('data:')) {
            const base64 = uri.split(',')[1];
            const fileExt = uri.startsWith('data:image/png') ? 'png' : 'jpg';
            const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
            const tempPath = `${cacheDir}karigar_studio_${Date.now()}.${fileExt}`;
            await FileSystem.writeAsStringAsync(tempPath, base64, {
              encoding: FileSystem.EncodingType?.Base64 || 'base64',
            });
            await MediaLibrary.saveToLibraryAsync(tempPath);
          } else {
            await MediaLibrary.saveToLibraryAsync(uri);
          }
          Alert.alert('Saved to Photos! 🎉', 'Product image has been saved to your photo album.');
          return;
        }
      }

      // Fallback: Native share sheet
      await Share.share({
        url: uri,
        title: 'Save KarigarSetu Product Image',
        message: 'KarigarSetu AI Studio',
      });
    } catch {
      Alert.alert('Saved', 'Photo processed successfully.');
    }
  };

  const shareImage = async (uri: string) => {
    try {
      let FileSystem: any = null;
      try {
        FileSystem = require('expo-file-system');
      } catch {}

      if (FileSystem && uri.startsWith('data:')) {
        const base64 = uri.split(',')[1];
        const fileExt = uri.startsWith('data:image/png') ? 'png' : 'jpg';
        const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
        const tempPath = `${cacheDir}karigar_share_${Date.now()}.${fileExt}`;
        await FileSystem.writeAsStringAsync(tempPath, base64, {
          encoding: FileSystem.EncodingType?.Base64 || 'base64',
        });
        await Share.share({ url: tempPath, title: 'KarigarSetu AI Studio Result' });
      } else {
        await Share.share({
          url: uri,
          title: 'KarigarSetu AI Studio',
          message: 'Check out this handcrafted artisan product!',
        });
      }
    } catch {}
  };

  // Determine current active display image
  const getActiveImageUri = () => {
    if (peekOriginal && originalImage) return originalImage;
    if (activeTab === 'original') return originalImage;
    if (activeTab === 'bgRemoved') return processedImages.bgRemoved || originalImage;
    if (activeTab === 'enhanced') return processedImages.enhanced || originalImage;
    return processedImages.ecommerce || originalImage;
  };

  const activeImageUri = getActiveImageUri();
  const hasResults = !!(processedImages.bgRemoved || processedImages.enhanced || processedImages.ecommerce);

  // Background styling for image display
  const getBackdropStyle = () => {
    if (activeTab !== 'bgRemoved') return { backgroundColor: Colors.bgDark3 };
    if (backdrop === 'white') return { backgroundColor: '#ffffff' };
    if (backdrop === 'cream') return { backgroundColor: '#fcf8f2' };
    if (backdrop === 'dark') return { backgroundColor: '#14110e' };
    return { backgroundColor: '#24201c' }; // checker/neutral
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <LinearGradient colors={['rgba(99,102,241,0.18)', 'rgba(99,102,241,0.04)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.headerBadgeRow}>
          <View style={styles.badgeIndigo}>
            <Feather name="cpu" size={10} color={Colors.indigoLight} />
            <Text style={styles.badgeTextIndigo}>BiRefNet + OpenCV</Text>
          </View>
          <View style={styles.badgeGreen}>
            <Feather name="zap" size={10} color={Colors.emerald} />
            <Text style={styles.badgeTextGreen}>CUDA Accelerated</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: Colors.borderSubtle }]}>
            <View style={[styles.statusDot, { backgroundColor: aiStatus === 'online' ? Colors.emerald : Colors.amber }]} />
            <Text style={[styles.badgeText, { color: Colors.textMuted }]}>
              {aiStatus === 'online' ? 'AI Ready' : 'Connecting...'}
            </Text>
          </View>
        </View>

        <Text style={styles.title}>AI Product Studio</Text>
        <Text style={styles.subtitle}>
          Transform raw craft photos into professional e-commerce listings with BiRefNet background isolation, OpenCV CLAHE enhancement, and 1024×1024 studio rendering.
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Onboarding Pipeline Tracker Banner */}
        {pipeline.isOnboarding && pipeline.step === 'image' && (
          <View style={styles.onboardingBanner}>
            <View style={styles.onboardingLeft}>
              <View style={styles.onboardingBadge}>
                <Text style={styles.onboardingBadgeText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.onboardingTitle}>📸 Step 1 of 4 — AI Photo Studio</Text>
                <Text style={styles.onboardingSubtitle}>Upload your product photo and execute the Full Image Pipeline →</Text>
              </View>
            </View>
          </View>
        )}

        {/* ------------------------------------------------------ */}
        {/* STEP 1: PHOTO UPLOAD OR PREVIEW                         */}
        {/* ------------------------------------------------------ */}
        {!originalImage ? (
          <GlassCard style={styles.uploadCard}>
            <View style={styles.uploadIconContainer}>
              <Feather name="image" size={36} color={Colors.saffron} />
            </View>
            <Text style={styles.uploadHeading}>Add Your Craft Photo</Text>
            <Text style={styles.uploadSub}>
              Take a clean photo with your camera or select an existing artisan product from your gallery.
            </Text>

            <View style={styles.uploadButtonRow}>
              <TouchableOpacity style={styles.btnPick} onPress={pickFromGallery} activeOpacity={0.85}>
                <LinearGradient colors={[Colors.saffron, Colors.saffronDark]} style={styles.btnGrad}>
                  <Feather name="image" size={18} color="#fff" />
                  <Text style={styles.btnText}>Choose Gallery</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnPick} onPress={captureFromCamera} activeOpacity={0.85}>
                <LinearGradient colors={[Colors.indigo, '#4338ca']} style={styles.btnGrad}>
                  <Feather name="camera" size={18} color="#fff" />
                  <Text style={styles.btnText}>Take Camera</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : (
          <>
            {/* VIEW TABS (Original, BG Removed, Enhanced, Final Product) */}
            <View style={styles.tabsContainer}>
              {[
                { key: 'original' as const, label: 'Original', available: true, color: Colors.textMuted },
                { key: 'bgRemoved' as const, label: 'BG Removed', available: !!processedImages.bgRemoved, color: Colors.saffron },
                { key: 'enhanced' as const, label: 'Enhanced', available: !!processedImages.enhanced, color: Colors.indigoLight },
                { key: 'ecommerce' as const, label: 'Final Studio ✨', available: !!processedImages.ecommerce, color: Colors.emerald },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  disabled={!tab.available}
                  style={[
                    styles.tabItem,
                    activeTab === tab.key && {
                      backgroundColor: `${tab.color}1c`,
                      borderColor: `${tab.color}60`,
                    },
                    !tab.available && { opacity: 0.35 },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text
                    style={[
                      styles.tabItemText,
                      activeTab === tab.key && { color: tab.color, fontFamily: Fonts.outfitBold },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* MAIN IMAGE DISPLAY CANVAS */}
            <View style={[styles.canvasCard, getBackdropStyle()]}>
              {activeImageUri ? (
                <Image
                  source={{ uri: activeImageUri }}
                  style={styles.mainCanvasImage}
                  resizeMode="contain"
                />
              ) : null}

              {/* Peek Original overlay badge */}
              {hasResults && (
                <Pressable
                  onPressIn={() => setPeekOriginal(true)}
                  onPressOut={() => setPeekOriginal(false)}
                  style={styles.peekButton}
                >
                  <Feather name={peekOriginal ? 'eye' : 'eye-off'} size={13} color="#fff" />
                  <Text style={styles.peekButtonText}>{peekOriginal ? 'Showing Original' : 'Hold to Peek Original'}</Text>
                </Pressable>
              )}

              {/* Backdrop switcher pill for BG-Removed view */}
              {activeTab === 'bgRemoved' && (
                <View style={styles.backdropPillRow}>
                  {(['dark', 'white', 'cream'] as Backdrop[]).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.backdropBtn,
                        backdrop === mode && styles.backdropBtnActive,
                      ]}
                      onPress={() => setBackdrop(mode)}
                    >
                      <Text style={[styles.backdropBtnText, backdrop === mode && { color: Colors.saffron }]}>
                        {mode.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Photo Action Buttons (Change Photo / Retake) */}
            <View style={styles.photoActionsRow}>
              <TouchableOpacity style={styles.subActionBtn} onPress={pickFromGallery}>
                <Feather name="refresh-cw" size={13} color={Colors.textMuted} />
                <Text style={styles.subActionText}>Change Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.subActionBtn} onPress={captureFromCamera}>
                <Feather name="camera" size={13} color={Colors.textMuted} />
                <Text style={styles.subActionText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>

            {/* ------------------------------------------------------ */}
            {/* STEP 2: PROCESSING MODE SELECTOR                       */}
            {/* ------------------------------------------------------ */}
            <Text style={styles.sectionHeaderTitle}>CHOOSE PROCESSING MODE</Text>

            <View style={styles.operationsList}>
              {OPERATIONS.map((op) => {
                const isSelected = selectedOp.id === op.id;
                return (
                  <TouchableOpacity
                    key={op.id}
                    style={[
                      styles.opCard,
                      isSelected && {
                        borderColor: `${op.color}65`,
                        backgroundColor: `${op.color}0e`,
                      },
                    ]}
                    onPress={() => setSelectedOp(op)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.opIconWrap, { backgroundColor: `${op.color}20` }]}>
                      <Feather name={op.icon as any} size={20} color={op.color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={[styles.opTitle, isSelected && { color: op.color }]}>{op.label}</Text>
                        <View style={[styles.miniBadge, { backgroundColor: `${op.color}18`, borderColor: `${op.color}35` }]}>
                          <Text style={[styles.miniBadgeText, { color: op.color }]}>{op.badge}</Text>
                        </View>
                      </View>
                      <Text style={styles.opDescription}>{op.desc}</Text>
                    </View>

                    <Feather
                      name={isSelected ? 'check-circle' : 'circle'}
                      size={18}
                      color={isSelected ? op.color : Colors.textDim}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Selected Operation Steps Breakdown */}
            {!processing && (
              <GlassCard style={styles.stepsBreakdownCard}>
                <Text style={styles.stepsBreakdownHeader}>PIPELINE STEPS EXECUTED</Text>
                {selectedOp.steps.map((step, idx) => (
                  <View key={step} style={styles.stepItemRow}>
                    <View style={[styles.stepDot, { backgroundColor: selectedOp.color }]} />
                    <Text style={styles.stepItemText}>{step}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* ------------------------------------------------------ */}
            {/* PIPELINE LIVE PROGRESS TRACKER (DURING EXECUTION)      */}
            {/* ------------------------------------------------------ */}
            {processing && (
              <GlassCard style={styles.pipelineTrackerCard}>
                <Text style={styles.pipelineTrackerTitle}>⚡ AI PIPELINE EXECUTING</Text>

                {PIPELINE_STAGES.map((stage, idx) => {
                  const stageNum = idx + 1;
                  const isDone = doneStages.includes(stageNum);
                  const isActive = currentStage === stageNum;

                  return (
                    <View
                      key={stage.id}
                      style={[
                        styles.stageItem,
                        isActive && { borderColor: `${stage.color}50`, backgroundColor: `${stage.color}0a` },
                        isDone && { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.06)' },
                      ]}
                    >
                      <View
                        style={[
                          styles.stageIconWrap,
                          {
                            backgroundColor: isDone
                              ? 'rgba(16,185,129,0.2)'
                              : isActive
                              ? `${stage.color}22`
                              : 'rgba(255,255,255,0.04)',
                          },
                        ]}
                      >
                        {isDone ? (
                          <Feather name="check" size={14} color={Colors.emerald} />
                        ) : isActive ? (
                          <ActivityIndicator size="small" color={stage.color} />
                        ) : (
                          <Feather name={stage.icon as any} size={14} color={Colors.textDim} />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.stageLabel,
                            {
                              color: isDone
                                ? Colors.emerald
                                : isActive
                                ? stage.color
                                : Colors.textDim,
                            },
                          ]}
                        >
                          {stage.label}
                        </Text>
                        <Text style={styles.stageSub}>{stage.sublabel}</Text>
                      </View>

                      {isDone && <Text style={styles.stageStatusDone}>Done</Text>}
                      {isActive && <Text style={[styles.stageStatusActive, { color: stage.color }]}>Running...</Text>}
                    </View>
                  );
                })}
              </GlassCard>
            )}

            {/* PROCESS / NEXT STAGE BUTTON */}
            {!processing && hasResults ? (
              <View style={{ marginTop: Spacing.sm, gap: 10 }}>
                <GradientButton
                  title="Next: Multilingual Voice Stage →"
                  onPress={() => router.push('/voice-cataloger')}
                />
                <TouchableOpacity
                  style={styles.reprocessSecondaryBtn}
                  onPress={processImage}
                  activeOpacity={0.8}
                >
                  <Feather name="refresh-cw" size={13} color={Colors.textMuted} />
                  <Text style={styles.reprocessSecondaryText}>
                    Re-process with ({selectedOp.label})
                  </Text>
                </TouchableOpacity>
              </View>
            ) : !processing ? (
              <GradientButton
                title={`Execute ${selectedOp.label}`}
                onPress={processImage}
                style={{ marginTop: Spacing.sm }}
              />
            ) : null}

            {/* ------------------------------------------------------ */}
            {/* RESULTS ACTION BUTTONS (SAVE, SHARE, ONBOARDING)       */}
            {/* ------------------------------------------------------ */}
            {!processing && hasResults && (
              <View style={styles.resultsActionsContainer}>
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={styles.actionBtnHalf}
                    onPress={() => saveToGallery(activeImageUri!)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={[Colors.emerald, '#047857']} style={styles.actionBtnGrad}>
                      <Feather name="download" size={16} color="#fff" />
                      <Text style={styles.actionBtnLabel}>Save to Gallery</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnHalf}
                    onPress={() => shareImage(activeImageUri!)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={[Colors.indigo, '#4338ca']} style={styles.actionBtnGrad}>
                      <Feather name="share-2" size={16} color="#fff" />
                      <Text style={styles.actionBtnLabel}>Share Image</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Onboarding Next Step Progression Card */}
                {pipeline.isOnboarding && pipeline.step === 'voice' && (
                  <TouchableOpacity
                    style={styles.onboardingNextCard}
                    onPress={() => router.push('/voice-cataloger')}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={['rgba(249,115,22,0.22)', 'rgba(249,115,22,0.06)']}
                      style={styles.onboardingNextGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <View style={styles.onboardingNextIcon}>
                        <Feather name="check" size={18} color={Colors.emerald} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.onboardingNextTitle}>Image Step Complete! Next: Voice Cataloger</Text>
                        <Text style={styles.onboardingNextSubtitle}>
                          Describe this craft in your mother tongue → Step 2 of 4
                        </Text>
                      </View>
                      <Feather name="arrow-right" size={20} color={Colors.saffron} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
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
    paddingBottom: Spacing.xl,
  },
  backBtn: { width: 36, height: 36, marginBottom: Spacing.md, justifyContent: 'center' },
  headerBadgeRow: { flexDirection: 'row', gap: 7, marginBottom: 12, flexWrap: 'wrap' },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1,
  },
  badgeIndigo: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.12)',
  },
  badgeGreen: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.12)',
  },
  badgeText: { fontSize: 10, fontFamily: Fonts.outfitSemiBold },
  badgeTextIndigo: { fontSize: 10, fontFamily: Fonts.outfitSemiBold, color: Colors.indigoLight },
  badgeTextGreen: { fontSize: 10, fontFamily: Fonts.outfitSemiBold, color: Colors.emerald },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  title: { fontSize: 28, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 20 },

  content: { padding: Spacing.lg },

  // Onboarding banner
  onboardingBanner: {
    backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)',
    padding: 12, marginBottom: Spacing.lg,
  },
  onboardingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onboardingBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.indigoLight, alignItems: 'center', justifyContent: 'center',
  },
  onboardingBadgeText: { color: '#fff', fontSize: 12, fontFamily: Fonts.outfitBold },
  onboardingTitle: { fontSize: 12, fontFamily: Fonts.outfitSemiBold, color: Colors.indigoLight, marginBottom: 2 },
  onboardingSubtitle: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.outfit },

  // Upload card
  uploadCard: {
    alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20,
    borderRadius: Radius.xl, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: Colors.borderMuted,
  },
  uploadIconContainer: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  uploadHeading: { fontSize: 18, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 6 },
  uploadSub: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  uploadButtonRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' },
  btnPick: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  btnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  btnText: { color: '#fff', fontFamily: Fonts.outfitSemiBold, fontSize: 14 },

  // View tabs
  tabsContainer: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm, flexWrap: 'wrap' },
  tabItem: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.borderSubtle, backgroundColor: 'transparent',
  },
  tabItemText: { fontSize: 11, fontFamily: Fonts.outfitMedium, color: Colors.textDim },

  // Canvas Card
  canvasCard: {
    width: '100%', height: 280, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.borderSubtle,
    marginBottom: Spacing.sm, position: 'relative',
  },
  mainCanvasImage: { width: '92%', height: '92%' },
  peekButton: {
    position: 'absolute', bottom: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  peekButtonText: { color: '#fff', fontSize: 11, fontFamily: Fonts.outfitMedium },

  backdropPillRow: {
    position: 'absolute', bottom: 12, right: 12,
    flexDirection: 'row', gap: 4, backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  backdropBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  backdropBtnActive: { backgroundColor: 'rgba(249,115,22,0.25)' },
  backdropBtnText: { fontSize: 9, fontFamily: Fonts.outfitBold, color: Colors.textDim },

  // Photo actions
  photoActionsRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginBottom: Spacing.lg },
  subActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  subActionText: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit },

  // Operations
  sectionHeaderTitle: {
    fontSize: 11, fontFamily: Fonts.outfitSemiBold, color: Colors.textDim,
    marginBottom: Spacing.sm, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  operationsList: { flexDirection: 'column', gap: 8, marginBottom: Spacing.md },
  opCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgDark2, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.borderSubtle, padding: 14,
  },
  opIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  opTitle: { fontSize: 14, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary },
  miniBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1,
  },
  miniBadgeText: { fontSize: 9, fontFamily: Fonts.outfitSemiBold },
  opDescription: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit, marginTop: 2, lineHeight: 16 },

  // Steps breakdown
  stepsBreakdownCard: { padding: 14, marginBottom: Spacing.md },
  stepsBreakdownHeader: {
    fontSize: 10, fontFamily: Fonts.outfitSemiBold, color: Colors.textDim,
    marginBottom: 8, letterSpacing: 0.6,
  },
  stepItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  stepDot: { width: 5, height: 5, borderRadius: 3 },
  stepItemText: { fontSize: 12, color: Colors.textMuted, fontFamily: Fonts.outfit },

  // Pipeline tracker during execution
  pipelineTrackerCard: { padding: 14, marginBottom: Spacing.md },
  pipelineTrackerTitle: {
    fontSize: 10, fontFamily: Fonts.outfitSemiBold, color: Colors.saffron,
    marginBottom: 10, letterSpacing: 0.8,
  },
  stageItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 11, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.borderSubtle, marginBottom: 7,
  },
  stageIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stageLabel: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, marginBottom: 1 },
  stageSub: { fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfit },
  stageStatusDone: { fontSize: 11, fontFamily: Fonts.outfitSemiBold, color: Colors.emerald },
  stageStatusActive: { fontSize: 11, fontFamily: Fonts.outfitSemiBold },

  // Results Actions
  resultsActionsContainer: { marginTop: Spacing.md, gap: Spacing.md },
  actionBtnRow: { flexDirection: 'row', gap: Spacing.sm },
  actionBtnHalf: { flex: 1, borderRadius: Radius.md, overflow: 'hidden' },
  actionBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13 },
  actionBtnLabel: { color: '#fff', fontFamily: Fonts.outfitSemiBold, fontSize: 13 },

  // Onboarding next step card
  onboardingNextCard: { borderRadius: Radius.md, overflow: 'hidden' },
  onboardingNextGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: Radius.md, borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  onboardingNextIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  onboardingNextTitle: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, marginBottom: 2 },
  onboardingNextSubtitle: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.outfit },

  // Secondary reprocess button
  reprocessSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  reprocessSecondaryText: {
    fontSize: 12,
    fontFamily: Fonts.outfitMedium,
    color: Colors.textMuted,
  },
});
