import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Animated, Alert, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import api, { AI_URL, BASE_URL } from '../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import GradientButton from '../components/GradientButton';
import GlassCard from '../components/GlassCard';
import { useOnboardingPipeline } from '../constants/pipeline';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RecordState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

interface GeneratedCatalog {
  name: string;
  category: string;
  description: string;
  materials: string;
  craftTechnique: string;
  price: number | null;
  tags?: string;
}

const BAR_COUNT = 24;

const SUPPORTED_LANGUAGES = [
  'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
  'Gujarati', 'Kannada', 'Malayalam', 'Odia', 'Punjabi', 'English',
];

const PIPELINE_STEPS = [
  { icon: 'file-text', label: '1. Transcript', sub: 'Speech to text', color: Colors.saffron },
  { icon: 'globe', label: '2. Translate', sub: 'Hindi / English', color: Colors.indigoLight },
  { icon: 'clipboard', label: '3. Product Specs', sub: 'Specs & materials', color: Colors.amber },
  { icon: 'dollar-sign', label: '4. Price Prediction', sub: 'Market benchmark', color: Colors.emerald },
];

export default function VoiceCatalogerScreen() {
  const router = useRouter();
  const pipeline = useOnboardingPipeline();

  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<{
    transcript: string;
    detectedLanguage: string;
    translation?: string | null;
    product: GeneratedCatalog;
  } | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Modern expo-audio recorder hook (official for Expo SDK 52-57)
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Web recorder refs
  const webMediaRecorderRef = useRef<any>(null);
  const webAudioChunksRef = useRef<any[]>([]);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barAnims = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.18))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Result entrance animation
  const animateResultIn = useCallback(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Waveform dancing animation
  const startWaveform = useCallback(() => {
    const anims = barAnims.map((bar, i) => {
      const delay = (i * 45) % 350;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(bar, {
            toValue: 0.2 + Math.random() * 0.8,
            duration: 220 + Math.random() * 260,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.12 + Math.random() * 0.35,
            duration: 180 + Math.random() * 200,
            useNativeDriver: true,
          }),
        ])
      );
    });
    waveLoopRef.current = Animated.parallel(anims);
    waveLoopRef.current.start();
  }, [barAnims]);

  const stopWaveform = useCallback(() => {
    waveLoopRef.current?.stop();
    barAnims.forEach((bar) => bar.setValue(0.18));
  }, [barAnims]);

  useEffect(() => {
    if (recordState === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 650, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 650, useNativeDriver: true }),
        ])
      ).start();

      setDuration(0);
      durationRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      startWaveform();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      if (durationRef.current) clearInterval(durationRef.current);
      stopWaveform();
    }

    if (recordState === 'done') {
      animateResultIn();
    }

    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [recordState]);

  // Request permissions once on mount
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const perm = await requestRecordingPermissionsAsync();
          setPermissionGranted(perm.granted);
        } else {
          setPermissionGranted(true);
        }
      } catch (err) {
        console.warn('Initial mic permission check:', err);
      }
    })();
  }, []);

  // START RECORDING
  const startRecording = async () => {
    setErrorMessage('');
    setResult(null);

    // 1. Web browser fallback
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        webAudioChunksRef.current = [];
        const mr = new (window as any).MediaRecorder(stream);
        mr.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) webAudioChunksRef.current.push(e.data);
        };
        mr.onstop = async () => {
          const blob = new Blob(webAudioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((t) => t.stop());
          await processAudio(blob, 'recording.webm', 'audio/webm');
        };
        mr.start(100);
        webMediaRecorderRef.current = mr;
        setRecordState('recording');
        return;
      } catch (err: any) {
        console.error('Web mic access error:', err);
        const msg = err?.name === 'NotAllowedError'
          ? 'Microphone permission denied in browser.'
          : 'Could not access web microphone: ' + (err?.message || '');
        setErrorMessage(msg);
        setRecordState('error');
        Alert.alert('Microphone Access', msg);
        return;
      }
    }

    // 2. Native Mobile Recording (Android / iOS via modern expo-audio)
    try {
      let granted = permissionGranted;
      if (!granted) {
        const perm = await requestRecordingPermissionsAsync();
        granted = perm.granted;
        setPermissionGranted(granted);
      }

      if (!granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please allow microphone access in device settings to record your voice.',
          [{ text: 'OK' }]
        );
        setErrorMessage('Microphone permission not granted.');
        setRecordState('error');
        return;
      }

      // Configure iOS & Android audio mode for high clarity recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare & start recording with expo-audio
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecordState('recording');
    } catch (err: any) {
      console.error('Start native recording error:', err);
      const msg = err?.message || 'Failed to start microphone recording.';
      setErrorMessage(msg);
      setRecordState('error');
      Alert.alert('Recording Failed', `${msg}\n\nPlease check your microphone settings or select an audio file.`);
    }
  };

  // STOP RECORDING
  const stopRecording = async () => {
    setRecordState('processing');

    // 1. Stop Web Recorder
    if (Platform.OS === 'web' && webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
      try {
        webMediaRecorderRef.current.stop();
        return;
      } catch (err: any) {
        console.error('Stop web recorder error:', err);
        setRecordState('error');
        setErrorMessage('Failed to stop web recording.');
        return;
      }
    }

    // 2. Stop Native expo-audio Recording
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        await processAudio(uri, 'recording.m4a', 'audio/m4a');
      } else {
        setErrorMessage('No audio captured. Please try recording again.');
        setRecordState('error');
      }
    } catch (err: any) {
      console.error('Stop native recording error:', err);
      setErrorMessage('Failed to stop recording: ' + (err?.message || ''));
      setRecordState('error');
    }
  };

  // Pick audio file alternative
  const pickAudioFile = async () => {
    try {
      setErrorMessage('');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/m4a', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/webm'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setRecordState('processing');
        await processAudio(file.uri, file.name, file.mimeType || 'audio/m4a');
      }
    } catch (err: any) {
      console.error('Audio file picking error:', err);
      Alert.alert('File Error', err?.message || 'Could not select audio file.');
    }
  };

  // PROCESS AUDIO (Send to backend proxy / AI service)
  const processAudio = async (
    audioInput: any,
    fileName: string = 'recording.m4a',
    mimeType: string = 'audio/m4a'
  ) => {
    if (!audioInput) {
      setRecordState('error');
      setErrorMessage('No audio captured. Please try again.');
      return;
    }

    setRecordState('processing');
    setErrorMessage('');

    try {
      const token = await AsyncStorage.getItem('ks_token');
      const formData = new FormData();

      if (typeof Blob !== 'undefined' && audioInput instanceof Blob) {
        formData.append('audio', audioInput, fileName || 'recording.webm');
      } else if (typeof audioInput === 'string' && audioInput) {
        formData.append('audio', {
          uri: audioInput,
          name: fileName || 'recording.m4a',
          type: mimeType || 'audio/m4a',
        } as any);
      }

      // Try Backend proxy first (routes through Cloudflare tunnel or local network reliably)
      let res: any;
      try {
        res = await api.post('/ai/voice/transcribe', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 120000,
        });
      } catch (backendErr: any) {
        console.warn('Backend proxy /api/ai/voice/transcribe error, trying direct AI URL fallback:', backendErr?.message);
        // Fallback directly to AI service port 8000
        res = await axios.post(`${AI_URL}/ai/voice/transcribe`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000,
        });
      }

      const resData = res?.data;
      const pipe = resData?.data?.pipeline || resData?.pipeline || resData?.data || resData;

      const detectedLang = pipe?.asr?.language_name || pipe?.asr?.detected_language || 'Indic';
      const transcriptText = pipe?.asr?.transcript || resData?.text || resData?.data?.text || '';
      const englishTranslation = pipe?.translation?.english || pipe?.translation?.translated || '';
      const extraction = pipe?.extraction || resData?.specs || {};

      if (!transcriptText && !extraction?.name) {
        throw new Error('Audio was recorded, but no clear speech was recognized. Please speak clearly into the microphone.');
      }

      const specs = {
        name: extraction?.name || 'Handcrafted Artisan Product',
        category: extraction?.category || 'Handicrafts',
        description: extraction?.description_en || englishTranslation || transcriptText,
        materials: Array.isArray(extraction?.materials)
          ? extraction.materials.join(', ')
          : (extraction?.materials || ''),
        tags: Array.isArray(extraction?.tags) ? extraction.tags.join(', ') : '',
        craftTechnique: extraction?.craft_technique || '',
        price_hint: extraction?.price_hint ? Number(extraction.price_hint) : (extraction?.price ? Number(extraction.price) : null),
        transcript: transcriptText,
        detectedLanguage: detectedLang,
      };

      setResult({
        transcript: specs.transcript,
        detectedLanguage: specs.detectedLanguage,
        translation: englishTranslation && englishTranslation !== transcriptText ? englishTranslation : null,
        product: {
          name: specs.name,
          category: specs.category,
          description: specs.description,
          materials: specs.materials,
          craftTechnique: specs.craftTechnique,
          price: specs.price_hint,
          tags: specs.tags,
        },
      });

      // Update onboarding pipeline state
      if (pipeline.isOnboarding && pipeline.step === 'voice') {
        pipeline.completeVoiceStep(specs);
      }

      setRecordState('done');
    } catch (err: any) {
      console.error('Voice processing error:', err?.response?.data || err?.message || err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Voice transcription failed. Please verify the AI backend is active.';
      setErrorMessage(detail);
      setRecordState('error');
      Alert.alert('Processing Error', detail);
    }
  };

  const handleUseProduct = () => {
    router.push({
      pathname: '/(tabs)/products/new',
      params: { prefill: JSON.stringify(result?.product) },
    } as any);
  };

  const reset = () => {
    setRecordState('idle');
    setResult(null);
    setDuration(0);
    setErrorMessage('');
  };

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <LinearGradient colors={['rgba(249,115,22,0.18)', 'rgba(249,115,22,0.04)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Feather name="zap" size={11} color={Colors.saffron} />
            <Text style={styles.badgeText}>Voice to Product</Text>
          </View>
          <View style={[styles.badge, { borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.1)' }]}>
            <Feather name="globe" size={11} color={Colors.emerald} />
            <Text style={[styles.badgeText, { color: Colors.emerald }]}>11+ Indian Languages</Text>
          </View>
        </View>
        <Text style={styles.title}>Voice Cataloger</Text>
        <Text style={styles.subtitle}>
          Speak naturally in your mother tongue. Our multilingual AI auto-detects your language, translates, and generates your complete e-commerce product catalog.
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Onboarding step hint if active */}
        {pipeline.isOnboarding && pipeline.step === 'voice' && (
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingLeft}>
              <View style={styles.onboardingNum}>
                <Text style={styles.onboardingNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.onboardingTitle}>🎙 Step 2 of 4 — Voice Cataloger</Text>
                <Text style={styles.onboardingSub}>Speak into your phone to generate product specs automatically →</Text>
              </View>
            </View>
          </View>
        )}

        {/* Supported Languages Ribbon */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.langScroll} contentContainerStyle={styles.langScrollContent}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <View key={lang} style={styles.langPill}>
              <Text style={styles.langPillText}>{lang}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Pipeline Steps Row */}
        <View style={styles.pipelineBox}>
          {PIPELINE_STEPS.map((step) => (
            <View key={step.label} style={styles.pipelineCol}>
              <View style={[styles.pipelineIconWrap, { backgroundColor: `${step.color}18` }]}>
                <Feather name={step.icon as any} size={14} color={step.color} />
              </View>
              <Text style={styles.pipelineLabel}>{step.label}</Text>
              <Text style={styles.pipelineSub}>{step.sub}</Text>
            </View>
          ))}
        </View>

        {/* MAIN RECORD CARD */}
        <GlassCard style={styles.recordCard}>
          {/* IDLE */}
          {recordState === 'idle' && (
            <View style={styles.idleWrap}>
              <Text style={styles.idleTitle}>
                Tap the microphone and describe your craft in{' '}
                <Text style={{ color: Colors.saffron, fontFamily: Fonts.outfitBold }}>any language</Text>
              </Text>
              <View style={styles.promptExampleCard}>
                <View style={styles.promptHeader}>
                  <Text style={styles.promptFlag}>🇮🇳</Text>
                  <Text style={styles.promptLang}>Example (Hindi / हिंदी)</Text>
                </View>
                <Text style={styles.promptText}>
                  "यह एक हाथ से बना बनारसी सिल्क दुपट्टा है, जिस पर जरी का बारीक काम है, कीमत ₹2500 है..."
                </Text>
              </View>
            </View>
          )}

          {/* RECORDING (Live Waveform & Timer) */}
          {recordState === 'recording' && (
            <View style={styles.recordingWrap}>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>RECORDING LIVE AUDIO</Text>
              </View>

              <Text style={styles.durationBig}>{formatDuration(duration)}</Text>

              {/* Dynamic Waveform Visualizer */}
              <View style={styles.waveformContainer}>
                {barAnims.map((bar, i) => {
                  const barColor =
                    i % 3 === 0 ? Colors.saffron : i % 3 === 1 ? Colors.indigoLight : Colors.emerald;
                  return (
                    <Animated.View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          backgroundColor: barColor,
                          transform: [{ scaleY: bar }],
                          opacity: bar.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.35, 1],
                          }),
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <Text style={styles.recordingHint}>
                Speak naturally about your craft, materials, dimensions, and price...
              </Text>
            </View>
          )}

          {/* PROCESSING */}
          {recordState === 'processing' && (
            <View style={styles.processingWrap}>
              <View style={styles.processingSpinner}>
                <ActivityIndicator size="large" color={Colors.saffron} />
              </View>
              <Text style={styles.processingTitle}>Generating Product Catalog...</Text>
              <View style={styles.processingList}>
                {[
                  { label: 'Transcript', desc: 'Transcribing speech to text...' },
                  { label: 'Translate', desc: 'Bilingual Hindi & English translation...' },
                  { label: 'Product Specs', desc: 'Extracting craft specs, materials & description...' },
                  { label: 'Price Prediction', desc: 'Calculating market benchmark price...' },
                ].map((item, idx) => (
                  <View key={item.label} style={styles.processItem}>
                    <ActivityIndicator size="small" color={Colors.saffron} style={{ opacity: 0.7 + idx * 0.1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.processItemTitle}>{item.label}</Text>
                      <Text style={styles.processItemDesc}>{item.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ERROR */}
          {recordState === 'error' && (
            <View style={styles.errorWrap}>
              <View style={styles.errorIconWrap}>
                <Feather name="alert-triangle" size={26} color={Colors.red} />
              </View>
              <Text style={styles.errorTitle}>Transcription Failed</Text>
              <Text style={styles.errorDesc}>{errorMessage || 'Voice processing failed. Please try speaking again.'}</Text>
            </View>
          )}

          {/* MIC BUTTON */}
          {recordState !== 'processing' && recordState !== 'done' && (
            <View style={styles.micBtnContainer}>
              <TouchableOpacity
                onPress={recordState === 'recording' ? stopRecording : startRecording}
                activeOpacity={0.85}
              >
                <Animated.View
                  style={[
                    styles.micRipple,
                    recordState === 'recording' && {
                      transform: [{ scale: pulseAnim }],
                      backgroundColor: 'rgba(239,68,68,0.2)',
                    },
                  ]}
                >
                  <LinearGradient
                    colors={
                      recordState === 'recording'
                        ? ['#ef4444', '#b91c1c']
                        : [Colors.saffron, Colors.saffronDark]
                    }
                    style={styles.micCircle}
                  >
                    <Feather
                      name={recordState === 'recording' ? 'square' : 'mic'}
                      size={36}
                      color="#fff"
                    />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>

              <Text style={styles.micBtnText}>
                {recordState === 'recording' ? 'Tap to finish recording' : 'Tap to start recording'}
              </Text>

              {recordState === 'idle' && (
                <TouchableOpacity style={styles.filePickerBtn} onPress={pickAudioFile} activeOpacity={0.8}>
                  <Feather name="folder" size={14} color={Colors.saffron} />
                  <Text style={styles.filePickerText}>Or select audio file / voice memo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </GlassCard>

        {/* RESULTS SECTION */}
        {recordState === 'done' && result && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Language & Retry Row */}
            <View style={styles.resultTopRow}>
              <View style={styles.langPillBadge}>
                <Feather name="check-circle" size={14} color={Colors.emerald} />
                <Text style={styles.langPillBadgeText}>
                  Detected: <Text style={{ fontFamily: Fonts.outfitBold }}>{result.detectedLanguage}</Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.reRecordBtn} onPress={reset} activeOpacity={0.8}>
                <Feather name="refresh-cw" size={13} color={Colors.textMuted} />
                <Text style={styles.reRecordText}>Record Again</Text>
              </TouchableOpacity>
            </View>

            {/* Native Transcript Card */}
            <Text style={styles.cardHeaderTitle}>🎙 Native Voice Transcript</Text>
            <GlassCard style={styles.textCard}>
              <Text style={styles.transcriptContent}>"{result.transcript}"</Text>
            </GlassCard>

            {/* English Translation Card */}
            {result.translation && (
              <>
                <Text style={styles.cardHeaderTitle}>🌐 English Translation</Text>
                <GlassCard style={styles.textCard}>
                  <Text style={styles.translationContent}>{result.translation}</Text>
                </GlassCard>
              </>
            )}

            {/* Structured Product Catalog Card */}
            <Text style={styles.cardHeaderTitle}>✨ Generated Product Catalog</Text>
            <GlassCard style={styles.catalogCard}>
              {[
                { label: 'Product Name', value: result.product.name, isTitle: true },
                { label: 'Category', value: result.product.category },
                result.product.materials ? { label: 'Materials', value: result.product.materials } : null,
                result.product.craftTechnique ? { label: 'Craft Technique', value: result.product.craftTechnique } : null,
                result.product.price ? { label: 'Estimated Price', value: `₹${result.product.price}`, isPrice: true } : null,
                result.product.tags ? { label: 'Tags', value: result.product.tags } : null,
                { label: 'Description', value: result.product.description, isDescription: true },
              ].filter(Boolean).map((item: any, i, arr) => (
                <View
                  key={item.label}
                  style={[
                    styles.catalogItemRow,
                    i === arr.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 },
                  ]}
                >
                  <Text style={styles.catalogItemLabel}>{item.label}</Text>
                  <Text
                    style={[
                      styles.catalogItemValue,
                      item.isTitle && { color: Colors.textPrimary, fontFamily: Fonts.outfitBold },
                      item.isPrice && { color: Colors.emerald, fontFamily: Fonts.outfitBold, fontSize: 16 },
                      item.isDescription && { lineHeight: 20 },
                    ]}
                  >
                    {item.value}
                  </Text>
                </View>
              ))}
            </GlassCard>

            {/* Use listing button */}
            <View style={styles.actionRow}>
              <GradientButton
                title="Create Listing with this Data"
                onPress={handleUseProduct}
                style={{ flex: 1 }}
              />
            </View>

            {/* Onboarding step card progression */}
            {pipeline.isOnboarding && pipeline.step === 'pricing' && (
              <TouchableOpacity
                style={styles.nextStepBanner}
                onPress={() => router.push('/pricing')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.06)']}
                  style={styles.nextStepGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.nextStepIconWrap}>
                    <Feather name="check" size={18} color={Colors.emerald} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextStepTitle}>Voice step complete! Next: AI Pricing</Text>
                    <Text style={styles.nextStepSub}>Calculate the optimal market benchmark price → Step 3 of 4</Text>
                  </View>
                  <Feather name="arrow-right" size={18} color={Colors.emerald} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  backBtn: { width: 36, height: 36, marginBottom: Spacing.md, justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(249,115,22,0.12)', borderRadius: Radius.full,
    paddingHorizontal: 11, paddingVertical: 4, borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.28)',
  },
  badgeText: { color: Colors.saffron, fontSize: 11, fontFamily: Fonts.outfitSemiBold },
  title: { fontSize: 28, fontFamily: Fonts.outfitBold, color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 20 },

  content: { padding: Spacing.lg },

  // Onboarding card
  onboardingCard: {
    backgroundColor: 'rgba(249,115,22,0.08)', borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.25)',
    padding: 12, marginBottom: Spacing.md,
  },
  onboardingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onboardingNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.saffron, alignItems: 'center', justifyContent: 'center',
  },
  onboardingNumText: { color: '#fff', fontSize: 13, fontFamily: Fonts.outfitBold },
  onboardingTitle: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.saffron, marginBottom: 2 },
  onboardingSub: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.outfit },

  // Language Scroll
  langScroll: { marginBottom: Spacing.md },
  langScrollContent: { gap: 6, paddingRight: Spacing.md },
  langPill: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full, backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  langPillText: { fontSize: 11, color: Colors.indigoLight, fontFamily: Fonts.outfitMedium },

  // Pipeline Box
  pipelineBox: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: 12, marginBottom: Spacing.lg,
  },
  pipelineCol: { alignItems: 'center', flex: 1, paddingHorizontal: 2 },
  pipelineIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  pipelineLabel: { fontSize: 9, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, textAlign: 'center' },
  pipelineSub: { fontSize: 8, fontFamily: Fonts.outfit, color: Colors.textDim, textAlign: 'center', marginTop: 1 },

  // Record Card
  recordCard: { padding: Spacing.xl, marginBottom: Spacing.lg, alignItems: 'center' },

  // Idle state
  idleWrap: { alignItems: 'center', width: '100%', marginBottom: Spacing.lg },
  idleTitle: {
    fontSize: 14, color: Colors.textMuted, fontFamily: Fonts.outfit,
    textAlign: 'center', lineHeight: 22, marginBottom: Spacing.md,
  },
  promptExampleCard: {
    width: '100%', backgroundColor: 'rgba(249,115,22,0.06)',
    borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(249,115,22,0.18)',
    padding: 12,
  },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  promptFlag: { fontSize: 14 },
  promptLang: { fontSize: 11, fontFamily: Fonts.outfitSemiBold, color: Colors.saffron },
  promptText: { fontSize: 12, color: Colors.textMuted, fontFamily: Fonts.outfit, fontStyle: 'italic', lineHeight: 18 },

  // Recording state
  recordingWrap: { alignItems: 'center', width: '100%', marginBottom: Spacing.lg },
  liveIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    marginBottom: 12,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  liveText: { fontSize: 10, fontFamily: Fonts.outfitBold, color: '#ef4444', letterSpacing: 0.5 },
  durationBig: { fontSize: 44, fontFamily: Fonts.outfitBlack, color: Colors.textPrimary, marginBottom: 14 },
  waveformContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 3.5, height: 60, marginBottom: 14, width: '100%',
  },
  waveBar: { width: 4, height: 54, borderRadius: 2 },
  recordingHint: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit, textAlign: 'center' },

  // Processing state
  processingWrap: { alignItems: 'center', width: '100%', paddingVertical: Spacing.md, marginBottom: Spacing.md },
  processingSpinner: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  processingTitle: { fontSize: 16, fontFamily: Fonts.outfitSemiBold, color: Colors.saffron, marginBottom: 14 },
  processingList: { width: '100%', gap: 10 },
  processItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)', padding: 10,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  processItemTitle: { fontSize: 12, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary },
  processItemDesc: { fontSize: 10, fontFamily: Fonts.outfit, color: Colors.textDim },

  // Error state
  errorWrap: { alignItems: 'center', width: '100%', paddingVertical: Spacing.md, gap: 8 },
  errorIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(248,113,113,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  errorTitle: { fontSize: 15, fontFamily: Fonts.outfitSemiBold, color: Colors.red },
  errorDesc: { fontSize: 12, color: Colors.textMuted, fontFamily: Fonts.outfit, textAlign: 'center', lineHeight: 18 },

  // Mic Button
  micBtnContainer: { alignItems: 'center', gap: 10 },
  micRipple: { borderRadius: 60, padding: 14 },
  micCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  micBtnText: { color: Colors.textMuted, fontFamily: Fonts.outfitMedium, fontSize: 13 },
  filePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.full,
    backgroundColor: 'rgba(249,115,22,0.08)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.22)',
    marginTop: 4,
  },
  filePickerText: { fontSize: 11, fontFamily: Fonts.outfitMedium, color: Colors.saffron },

  // Result Section
  resultTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  langPillBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.28)',
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5,
  },
  langPillBadgeText: { color: Colors.emerald, fontSize: 12, fontFamily: Fonts.outfitMedium },
  reRecordBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 6 },
  reRecordText: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit },

  cardHeaderTitle: {
    fontSize: 11, fontFamily: Fonts.outfitSemiBold, color: Colors.textDim,
    marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase',
  },
  textCard: { marginBottom: Spacing.md, padding: 14 },
  transcriptContent: { fontSize: 14, color: Colors.textPrimary, fontFamily: Fonts.outfit, lineHeight: 22 },
  translationContent: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, fontStyle: 'italic', lineHeight: 20 },

  catalogCard: { marginBottom: Spacing.lg, padding: 14 },
  catalogItemRow: {
    flexDirection: 'row', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  catalogItemLabel: { width: 110, fontSize: 11, color: Colors.textDim, fontFamily: Fonts.outfitMedium, textTransform: 'uppercase', letterSpacing: 0.3 },
  catalogItemValue: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontFamily: Fonts.outfit, lineHeight: 19 },

  actionRow: { marginBottom: Spacing.md },

  // Next Step Banner
  nextStepBanner: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.sm },
  nextStepGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  nextStepIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  nextStepTitle: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, marginBottom: 2 },
  nextStepSub: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.outfit },
});
