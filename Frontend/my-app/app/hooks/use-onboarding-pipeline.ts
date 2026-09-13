"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OnboardingStep =
  | "image"        // Step 1: AI Studio — image upload + pipeline
  | "voice"        // Step 2: Voice Cataloger — voice + spec extraction
  | "pricing"      // Step 3: AI Price Prediction
  | "catalog"      // Step 4: Final product catalog listing
  | "complete";    // Done

export interface StudioImages {
  original?: string;    // original blob URL (may be lost on reload)
  bgRemoved?: string;   // base64 data URL
  enhanced?: string;    // base64 data URL
  ecommerce?: string;   // base64 data URL — used as primary product image
}

export interface VoiceSpecs {
  name: string;
  category: string;
  description: string;
  materials: string;          // comma-separated
  tags: string;               // comma-separated
  craftTechnique: string;
  price_hint: number | null;
  transcript?: string;
  detectedLanguage?: string;
  confidence?: number;
}

export interface PredictedPrice {
  predicted_price: number;
  confidence_low: number;
  confidence_high: number;
  reasoning: string;
  model: string;
}

export interface OnboardingPipelineState {
  isOnboarding: boolean;
  step: OnboardingStep;
  studioImages: StudioImages | null;
  voiceSpecs: VoiceSpecs | null;
  predictedPrice: PredictedPrice | null;
  productId: string | null;
  startedAt: number | null; // timestamp for session tracking
}

const SESSION_KEY = "ks_onboarding_pipeline";

const DEFAULT_STATE: OnboardingPipelineState = {
  isOnboarding: false,
  step: "image",
  studioImages: null,
  voiceSpecs: null,
  predictedPrice: null,
  productId: null,
  startedAt: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadState(): OnboardingPipelineState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: OnboardingPipelineState) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage full or unavailable — ignore
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOnboardingPipeline() {
  const [state, setState] = useState<OnboardingPipelineState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setHydrated(true);
  }, []);

  // Persist every state change
  const updateState = useCallback((patch: Partial<OnboardingPipelineState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  /** Called immediately after artisan registers — kicks off the pipeline */
  const startOnboarding = useCallback(() => {
    const fresh: OnboardingPipelineState = {
      ...DEFAULT_STATE,
      isOnboarding: true,
      step: "image",
      startedAt: Date.now(),
    };
    saveState(fresh);
    setState(fresh);
  }, []);

  /** Called after AI Studio pipeline finishes — saves images, advances to voice step */
  const completeImageStep = useCallback((images: StudioImages) => {
    updateState({
      studioImages: images,
      step: "voice",
    });
  }, [updateState]);

  /** Called after Voice Cataloger pipeline finishes — saves specs, advances to pricing */
  const completeVoiceStep = useCallback((specs: VoiceSpecs) => {
    updateState({
      voiceSpecs: specs,
      step: "pricing",
    });
  }, [updateState]);

  /** Called after SigLIP+TabPFN price prediction completes */
  const completePricingStep = useCallback((price: PredictedPrice) => {
    updateState({
      predictedPrice: price,
      step: "catalog",
    });
  }, [updateState]);

  /** Called after product is successfully created in backend */
  const completeOnboarding = useCallback((productId: string) => {
    updateState({
      productId,
      step: "complete",
    });
  }, [updateState]);

  /** Reset and clear all pipeline state */
  const resetPipeline = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
    }
    setState(DEFAULT_STATE);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const stepIndex: Record<OnboardingStep, number> = {
    image: 0,
    voice: 1,
    pricing: 2,
    catalog: 3,
    complete: 4,
  };

  const currentStepIndex = stepIndex[state.step] ?? 0;

  const isStepDone = useCallback(
    (step: OnboardingStep) => stepIndex[step] < currentStepIndex,
    [currentStepIndex]
  );

  const isStepActive = useCallback(
    (step: OnboardingStep) => state.step === step,
    [state.step]
  );

  return {
    // State
    ...state,
    hydrated,
    currentStepIndex,
    // Actions
    startOnboarding,
    completeImageStep,
    completeVoiceStep,
    completePricingStep,
    completeOnboarding,
    resetPipeline,
    // Utils
    isStepDone,
    isStepActive,
    stepIndex,
  };
}

