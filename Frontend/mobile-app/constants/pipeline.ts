/**
 * KarigarSetu — Onboarding Pipeline State
 * Mobile equivalent of the web's use-onboarding-pipeline.ts hook.
 * Backed by AsyncStorage so state survives app restarts during onboarding.
 *
 * Pipeline: image → voice → pricing → catalog → complete
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ────────────────────────────────────────────────────────────────────

export type OnboardingStep =
  | 'image'     // Step 1: AI Photo Studio — bg removal + enhance
  | 'voice'     // Step 2: Voice Cataloger — speech → product specs
  | 'pricing'   // Step 3: AI Price Prediction
  | 'catalog'   // Step 4: Create product → goes live
  | 'complete'; // Done — banner hidden

export interface StudioImages {
  bgRemoved?: string;   // base64 data URL (PNG)
  enhanced?: string;    // base64 data URL (JPEG)
  ecommerce?: string;   // base64 data URL (JPEG) — primary product image
  localUri?: string;    // original local file URI
}

export interface VoiceSpecs {
  name: string;
  category: string;
  description: string;
  materials: string;         // comma-separated
  tags?: string;
  craftTechnique?: string;
  price_hint?: number | null;
  transcript?: string;
  detectedLanguage?: string;
}

export interface PredictedPrice {
  predicted_price?: number;
  recommended_price?: number;
  price_range?: { min: number; max: number };
  reasoning?: string;
}

export interface PipelineState {
  isOnboarding: boolean;
  step: OnboardingStep;
  studioImages: StudioImages | null;
  voiceSpecs: VoiceSpecs | null;
  predictedPrice: PredictedPrice | null;
  productId: string | null;
  startedAt: number | null;
}

const STORAGE_KEY = 'ks_onboarding';

const DEFAULT_STATE: PipelineState = {
  isOnboarding: true,
  step: 'image',
  studioImages: null,
  voiceSpecs: null,
  predictedPrice: null,
  productId: null,
  startedAt: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadPipelineState(): Promise<PipelineState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial: PipelineState = {
        ...DEFAULT_STATE,
        isOnboarding: true,
        step: 'image',
        startedAt: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE, isOnboarding: true, step: 'image' };
  }
}

async function savePipelineState(state: PipelineState): Promise<void> {
  try {
    // Don't persist huge base64 images to AsyncStorage (size limit issues)
    const toSave: PipelineState = {
      ...state,
      studioImages: state.studioImages
        ? { localUri: state.studioImages.localUri }
        : null,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // AsyncStorage unavailable — ignore, state lives in-memory
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useOnboardingPipeline() {
  const [state, setState] = useState<PipelineState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    loadPipelineState().then((loaded) => {
      setState(loaded);
      setHydrated(true);
    });
  }, []);

  const updateState = useCallback((patch: Partial<PipelineState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      savePipelineState(next);
      return next;
    });
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Called immediately after artisan registers — kicks off the pipeline */
  const startOnboarding = useCallback(async () => {
    const fresh: PipelineState = {
      ...DEFAULT_STATE,
      isOnboarding: true,
      step: 'image',
      startedAt: Date.now(),
    };
    await savePipelineState(fresh);
    setState(fresh);
  }, []);

  /** After AI Studio pipeline finishes — saves images ref, advances to voice */
  const completeImageStep = useCallback((images: StudioImages) => {
    updateState({ studioImages: images, step: 'voice' });
  }, [updateState]);

  /** After Voice Cataloger finishes — saves specs, advances to pricing */
  const completeVoiceStep = useCallback((specs: VoiceSpecs) => {
    updateState({ voiceSpecs: specs, step: 'pricing' });
  }, [updateState]);

  /** After AI pricing completes — saves price, advances to catalog */
  const completePricingStep = useCallback((price: PredictedPrice) => {
    updateState({ predictedPrice: price, step: 'catalog' });
  }, [updateState]);

  /** After product is created — marks pipeline complete */
  const completeOnboarding = useCallback((productId: string) => {
    updateState({ productId, step: 'complete' });
  }, [updateState]);

  /** Clear all pipeline state */
  const resetPipeline = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setState(DEFAULT_STATE);
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────

  const STEP_INDEX: Record<OnboardingStep, number> = {
    image: 0,
    voice: 1,
    pricing: 2,
    catalog: 3,
    complete: 4,
  };

  const currentStepIndex = STEP_INDEX[state.step] ?? 0;

  const isStepDone = useCallback(
    (step: OnboardingStep) => STEP_INDEX[step] < currentStepIndex,
    [currentStepIndex]
  );

  const isStepActive = useCallback(
    (step: OnboardingStep) => state.step === step,
    [state.step]
  );

  return {
    ...state,
    hydrated,
    currentStepIndex,
    startOnboarding,
    completeImageStep,
    completeVoiceStep,
    completePricingStep,
    completeOnboarding,
    resetPipeline,
    isStepDone,
    isStepActive,
    STEP_INDEX,
  };
}
