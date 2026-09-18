import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Platform, Animated, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import api, { AI_URL, BASE_URL } from '../constants/api';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';
import GradientButton from '../components/GradientButton';
import GlassCard from '../components/GlassCard';
import { useOnboardingPipeline } from '../constants/pipeline';

// Safe dynamic loader for modern expo-audio
let ExpoAudio: any = null;
try {
  ExpoAudio = require('expo-audio');
} catch {
  ExpoAudio = null;
}

// Safe dynamic loader for legacy expo-av
let ExpoAv: any = null;
try {
  ExpoAv = require('expo-av');
} catch {
  ExpoAv = null;
}

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

export default function VoiceCatalogerScreen() {
  const router = useRouter();
  const pipeline = useOnboardingPipeline();
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recording, setRecording] = useState<any>(null);
  const [recordingEngine, setRecordingEngine] = useState<'web' | 'expo-audio' | 'expo-av' | null>(null);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<{
    transcript: string;
    detectedLanguage: string;
    translation?: string | null;
    product: GeneratedCatalog;
  } | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Web MediaRecorder references
  const webMediaRecorderRef = useRef<any>(null);
  const webAudioChunksRef = useRef<any[]>([]);

  useEffect(() => {
    if (recordState === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      setDuration(0);
      durationRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      if (durationRef.current) clearInterval(durationRef.current);
    }
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [recordState]);

  const startRecording = async () => {
    setErrorMessage('');
    setResult(null);

    // 1. Web browser microphone recording
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
        mr.start();
        webMediaRecorderRef.current = mr;
        setRecordingEngine('web');
        setRecordState('recording');
        return;
      } catch (err: any) {
        console.error('Web microphone access error:', err);
        const msg = err?.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in browser settings.'
          : 'Could not access microphone: ' + (err?.message || '');
        setErrorMessage(msg);
        setRecordState('error');
        Alert.alert('Microphone Access', msg);
        return;
      }
    }

    // 2. Modern expo-audio (SDK 52-57)
    if (ExpoAudio?.AudioModule?.AudioRecorder) {
      try {
        if (typeof ExpoAudio.requestRecordingPermissionsAsync === 'function') {
          const perm = await ExpoAudio.requestRecordingPermissionsAsync();
          if (!perm.granted && perm.status !== 'granted') {
            Alert.alert('Permission Needed', 'Please allow microphone access in device settings.');
            setErrorMessage('Microphone permission not granted.');
            setRecordState('error');
            return;
          }
        }
        const options = ExpoAudio.RecordingPresets?.HIGH_QUALITY || {};
        const rec = new ExpoAudio.AudioModule.AudioRecorder(options);
        await rec.prepareToRecordAsync();
        rec.record();
        setRecording(rec);
        setRecordingEngine('expo-audio');
        setRecordState('recording');
        return;
      } catch (audioErr: any) {
        console.warn('expo-audio initialization failed, trying expo-av fallback:', audioErr);
      }
    }

    // 3. Legacy expo-av fallback
    if (ExpoAv?.Audio) {
      try {
        const { status } = await ExpoAv.Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow microphone access in device settings.');
          setErrorMessage('Microphone permission not granted.');
          setRecordState('error');
          return;
        }
        await ExpoAv.Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording: rec } = await ExpoAv.Audio.Recording.createAsync(
          ExpoAv.Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(rec);
        setRecordingEngine('expo-av');
        setRecordState('recording');
        return;
      } catch (avErr: any) {
        console.warn('expo-av recording error:', avErr);
      }
    }

    // If native live recording is not linked in this Expo Go build, offer direct audio file selection
    Alert.alert(
      'Live Microphone in Expo Go',
      'Native live microphone recording is not supported in this Expo Go client version.\n\nWould you like to select an audio recording or voice memo directly from your phone?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Select Audio File', onPress: pickAudioFile },
      ]
    );
    setRecordState('idle');
  };

  const stopRecording = async () => {
    setRecordState('processing');

    // 1. Stop Web Recorder
    if (recordingEngine === 'web' && webMediaRecorderRef.current && webMediaRecorderRef.current.state !== 'inactive') {
      try {
        webMediaRecorderRef.current.stop();
        return;
      } catch (err: any) {
        console.error('Error stopping web recorder:', err);
        setRecordState('error');
        setErrorMessage('Failed to stop web recorder.');
        return;
      }
    }

    // 2. Stop expo-audio
    if (recordingEngine === 'expo-audio' && recording) {
      try {
        await recording.stop();
        const uri = recording.uri;
        setRecording(null);
        if (uri) {
          await processAudio(uri, 'recording.m4a', 'audio/m4a');
          return;
        }
      } catch (err: any) {
        console.error('Stopping expo-audio failed:', err);
      }
    }

    // 3. Stop expo-av
    if (recordingEngine === 'expo-av' && recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        if (uri) {
          await processAudio(uri, 'recording.m4a', 'audio/m4a');
          return;
        }
      } catch (err: any) {
        console.error('Stopping expo-av recording failed:', err);
      }
    }

    setRecordState('idle');
  };

  const pickAudioFile = async () => {
    try {
      setErrorMessage('');
      const res = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'audio/m4a', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/webm'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        await processAudio(file.uri, file.name, file.mimeType || 'audio/m4a');
      }
    } catch (err: any) {
      console.error('Audio file picking error:', err);
      Alert.alert('File Error', err?.message || 'Could not select audio file.');
    }
  };

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
        const fileUri = Platform.OS === 'android' ? audioInput : audioInput.replace('file://', '');
        formData.append('audio', {
          uri: fileUri,
          name: fileName || 'recording.m4a',
          type: mimeType || 'audio/m4a',
        } as any);
      }

      // Call Backend express endpoint: POST /api/ai/voice/transcribe
      let res;
      try {
        res = await api.post('/ai/voice/transcribe', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          timeout: 120000,
        });
      } catch (backendErr: any) {
        console.warn('Backend proxy /api/ai/voice/transcribe error, trying direct AI fallback:', backendErr?.message);
        // Resilient fallback directly to FastAPI AI service
        res = await axios.post(`${AI_URL}/ai/voice/transcribe`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000,
        });
      }

      const resData = res.data;
      const pipe = resData?.data?.pipeline || resData?.pipeline || resData?.data || resData;

      const detectedLang = pipe?.asr?.language_name || pipe?.asr?.detected_language || 'Indic';
      const transcriptText = pipe?.asr?.transcript || resData?.text || resData?.data?.text || '';
      const englishTranslation = pipe?.translation?.english || '';
      const extraction = pipe?.extraction || resData?.specs || {};

      if (!transcriptText && !extraction?.name) {
        throw new Error('Audio was recorded, but no clear speech was recognized. Please speak clearly into the microphone and try again.');
      }

      const specs = {
        name: extraction?.name || 'Handcrafted Artisan Product',
        category: extraction?.category || 'Handicrafts',
        description: extraction?.description_en || englishTranslation || transcriptText,
        materials: Array.isArray(extraction?.materials)
          ? extraction.materials.join(', ')
          : (extraction?.materials || ''),
        tags: Array.isArray(extraction?.tags)
          ? extraction.tags.join(', ')
          : '',
        craftTechnique: extraction?.craft_technique || '',
        price_hint: extraction?.price_hint ? Number(extraction.price_hint) : null,
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

      if (pipeline.isOnboarding && pipeline.step === 'voice') {
        pipeline.completeVoiceStep(specs);
      }
      setRecordState('done');
    } catch (err: any) {
      console.error('Voice multilingual processing error:', err?.response?.data || err?.message || err);
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Voice transcription failed. Ensure the AI backend is active.';
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
    setRecordingEngine(null);
  };

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient colors={['rgba(249,115,22,0.12)', 'transparent']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
        <View style={styles.titleArea}>
          <Text style={styles.title}>Voice Cataloger</Text>
          <View style={styles.badge}>
            <Feather name="zap" size={11} color={Colors.saffron} />
            <Text style={styles.badgeText}>Multilingual AI</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Speak naturally in any Indian language. IndicConformer 600M auto-detects your language, translates, and generates your complete product listing.
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Language Capabilities Banner */}
        <View style={styles.infoBanner}>
          <Feather name="globe" size={15} color={Colors.saffron} />
          <Text style={styles.infoBannerText}>
            Auto-detects Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, Kannada, Malayalam, Odia & English
          </Text>
        </View>

        {/* Record Area */}
        <GlassCard style={styles.recordArea}>
          {recordState === 'idle' && (
            <>
              <Text style={styles.recordHint}>
                Tap the microphone and describe your craft in <Text style={{ color: Colors.saffron, fontFamily: Fonts.outfitBold }}>any language</Text>
              </Text>
              <Text style={styles.recordExample}>
                e.g. &ldquo;यह एक हाथ से बना बनारसी सिल्क दुपट्टा है, जिस पर जरी का बारीक काम है, कीमत ₹2500 है...&rdquo;
              </Text>
            </>
          )}

          {recordState === 'recording' && (
            <>
              <Text style={styles.recordingLabel}>Listening to your voice...</Text>
              <Text style={styles.durationText}>{formatDuration(duration)}</Text>
              <Text style={styles.recordingSub}>Speak clearly about your craft, materials, and price</Text>
            </>
          )}

          {recordState === 'processing' && (
            <View style={styles.processingBox}>
              <ActivityIndicator size="large" color={Colors.saffron} />
              <Text style={styles.processingText}>🤖 AI is analyzing your voice...</Text>
              <Text style={styles.processingSub}>
                IndicConformer ASR → Multilingual Translation → Qwen Product Specs
              </Text>
            </View>
          )}

          {recordState === 'error' && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={24} color={Colors.red} />
              <Text style={styles.errorText}>
                {errorMessage || 'Voice processing failed. Please try again.'}
              </Text>
            </View>
          )}

          {/* Mic Button & File Picker Option */}
          {recordState !== 'processing' && recordState !== 'done' && (
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity
                onPress={recordState === 'recording' ? stopRecording : startRecording}
                activeOpacity={0.85}
                style={styles.micBtnWrapper}
              >
                <Animated.View
                  style={[
                    styles.micPulse,
                    recordState === 'recording' && {
                      transform: [{ scale: pulseAnim }],
                      backgroundColor: 'rgba(239,68,68,0.22)',
                    },
                  ]}
                >
                  <LinearGradient
                    colors={
                      recordState === 'recording'
                        ? ['#ef4444', '#dc2626']
                        : [Colors.saffron, Colors.saffronDark]
                    }
                    style={styles.micBtn}
                  >
                    <Feather
                      name={recordState === 'recording' ? 'square' : 'mic'}
                      size={32}
                      color="#fff"
                    />
                  </LinearGradient>
                </Animated.View>
                <Text style={styles.micLabel}>
                  {recordState === 'recording' ? 'Tap to stop recording' : 'Tap to start speaking'}
                </Text>
              </TouchableOpacity>

              {recordState === 'idle' && (
                <TouchableOpacity
                  style={styles.pickFileBtn}
                  onPress={pickAudioFile}
                  activeOpacity={0.8}
                >
                  <Feather name="folder" size={14} color={Colors.saffron} />
                  <Text style={styles.pickFileText}>Or Select Audio / Voice Memo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </GlassCard>

        {/* Result */}
        {recordState === 'done' && result && (
          <View style={styles.result}>
            {/* Detected Language Pill */}
            <View style={styles.detectedLangRow}>
              <View style={styles.detectedBadge}>
                <Feather name="check-circle" size={13} color={Colors.emerald} />
                <Text style={styles.detectedBadgeText}>
                  Detected Language: <Text style={{ fontFamily: Fonts.outfitBold }}>{result.detectedLanguage}</Text>
                </Text>
              </View>
            </View>

            {/* Transcript Card */}
            <Text style={styles.sectionLabel}>🎙 Native Voice Transcript</Text>
            <GlassCard style={{ marginBottom: Spacing.md }}>
              <Text style={styles.transcript}>{result.transcript}</Text>
            </GlassCard>

            {/* English Translation if available */}
            {result.translation && (
              <>
                <Text style={styles.sectionLabel}>🌐 English Translation</Text>
                <GlassCard style={{ marginBottom: Spacing.md }}>
                  <Text style={styles.translationText}>{result.translation}</Text>
                </GlassCard>
              </>
            )}

            {/* Generated Product Catalog */}
            <Text style={styles.sectionLabel}>✨ Generated Catalog Specs</Text>
            <GlassCard style={styles.catalogCard}>
              <View style={styles.catalogRow}>
                <Text style={styles.catalogKey}>Name</Text>
                <Text style={styles.catalogValue}>{result.product.name}</Text>
              </View>
              <View style={styles.catalogRow}>
                <Text style={styles.catalogKey}>Category</Text>
                <Text style={styles.catalogValue}>{result.product.category}</Text>
              </View>
              {result.product.materials ? (
                <View style={styles.catalogRow}>
                  <Text style={styles.catalogKey}>Materials</Text>
                  <Text style={styles.catalogValue}>{result.product.materials}</Text>
                </View>
              ) : null}
              {result.product.craftTechnique ? (
                <View style={styles.catalogRow}>
                  <Text style={styles.catalogKey}>Technique</Text>
                  <Text style={styles.catalogValue}>{result.product.craftTechnique}</Text>
                </View>
              ) : null}
              {result.product.price ? (
                <View style={styles.catalogRow}>
                  <Text style={styles.catalogKey}>Est. Price</Text>
                  <Text style={[styles.catalogValue, { color: Colors.emerald, fontFamily: Fonts.outfitBold }]}>
                    ₹{result.product.price}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.catalogRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.catalogKey}>Description</Text>
                <Text style={styles.catalogValue}>{result.product.description}</Text>
              </View>
            </GlassCard>

            <View style={styles.resultActions}>
              <GradientButton title="Use This Listing" onPress={handleUseProduct} style={{ flex: 1 }} />
              <TouchableOpacity style={styles.retryBtn} onPress={reset}>
                <Feather name="refresh-cw" size={16} color={Colors.textMuted} />
                <Text style={styles.retryBtnText}>Re-record</Text>
              </TouchableOpacity>
            </View>

            {/* Next step (onboarding) */}
            {pipeline.isOnboarding && pipeline.step === 'pricing' && (
              <TouchableOpacity
                style={styles.nextStepCard}
                onPress={() => router.push('/pricing')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.06)']}
                  style={styles.nextStepGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.nextStepIcon}>
                    <Feather name="check-circle" size={18} color={Colors.emerald} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextStepLabel}>Voice step complete! Next: AI Pricing</Text>
                    <Text style={styles.nextStepSub}>Calculate the optimal market benchmark price → Step 3 of 4</Text>
                  </View>
                  <Feather name="arrow-right" size={18} color={Colors.emerald} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDark },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  backBtn: { width: 36, marginBottom: Spacing.md },
  titleArea: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: Fonts.outfitBold, color: Colors.textPrimary },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
  },
  badgeText: { color: Colors.saffron, fontSize: 10, fontFamily: Fonts.outfitSemiBold },
  subtitle: { fontSize: 13, color: Colors.textMuted, fontFamily: Fonts.outfit, lineHeight: 20 },
  content: { padding: Spacing.lg },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(249,115,22,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.2)',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: Spacing.lg,
  },
  infoBannerText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: 12,
    fontFamily: Fonts.outfit,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Fonts.outfitSemiBold,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  recordArea: { alignItems: 'center', padding: Spacing.xl, marginBottom: Spacing.lg },
  recordHint: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: Fonts.outfit,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  recordExample: {
    fontSize: 12,
    color: Colors.textDim,
    fontFamily: Fonts.outfit,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: Spacing.xl,
    lineHeight: 18,
  },
  recordingLabel: { fontSize: 16, color: Colors.red, fontFamily: Fonts.outfitSemiBold, marginBottom: 6 },
  recordingSub: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit, marginBottom: Spacing.lg },
  durationText: {
    fontSize: 34,
    fontFamily: Fonts.outfitBlack,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  processingBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 },
  processingText: { fontSize: 16, color: Colors.saffron, fontFamily: Fonts.outfitSemiBold, textAlign: 'center' },
  processingSub: { fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfit, textAlign: 'center' },
  errorBox: { alignItems: 'center', paddingVertical: Spacing.lg, gap: 8 },
  errorText: { fontSize: 13, color: Colors.red, fontFamily: Fonts.outfit, textAlign: 'center', lineHeight: 19 },
  micBtnWrapper: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  micPulse: { borderRadius: 60, padding: 12 },
  micBtn: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  micLabel: { color: Colors.textDim, fontFamily: Fonts.outfit, fontSize: 13, marginTop: 4 },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
  },
  pickFileText: {
    fontSize: 12,
    fontFamily: Fonts.outfitMedium,
    color: Colors.saffron,
  },
  result: {},
  detectedLangRow: { marginBottom: Spacing.md, flexDirection: 'row' },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detectedBadgeText: {
    color: Colors.emerald,
    fontSize: 12,
    fontFamily: Fonts.outfitMedium,
  },
  transcript: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: Fonts.outfit,
    lineHeight: 22,
  },
  translationText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: Fonts.outfit,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  catalogCard: { marginBottom: Spacing.lg },
  catalogRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  catalogKey: { width: 95, fontSize: 12, color: Colors.textDim, fontFamily: Fonts.outfitMedium },
  catalogValue: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontFamily: Fonts.outfit, lineHeight: 18 },
  resultActions: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.borderMuted,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  retryBtnText: { color: Colors.textMuted, fontFamily: Fonts.outfitMedium, fontSize: 14 },
  // Next step pipeline card
  nextStepCard: { borderRadius: Radius.md, overflow: 'hidden', marginTop: Spacing.md },
  nextStepGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
  },
  nextStepIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepLabel: { fontSize: 13, fontFamily: Fonts.outfitSemiBold, color: Colors.textPrimary, marginBottom: 2 },
  nextStepSub: { fontSize: 11, color: Colors.textMuted, fontFamily: Fonts.outfit },
});
