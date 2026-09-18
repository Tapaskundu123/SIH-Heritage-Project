/**
 * PipelineBanner — Mobile Onboarding Pipeline HUD
 * Mirrors the web's OnboardingPipelineBanner.tsx
 *
 * Shows as a fixed bottom sheet with:
 *  - Animated pulsing live dot
 *  - Current step label + "Step X of 4"
 *  - Expand/collapse to show all 4 step cards with connector lines
 *  - Dismiss to floating pill in bottom-right corner
 *  - "Go to Step →" navigates to correct screen
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform, Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import {
  useOnboardingPipeline,
  OnboardingStep,
} from '../constants/pipeline';
import { Colors, Fonts, Spacing, Radius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Step Config ───────────────────────────────────────────────────────────────

interface StepConfig {
  id: OnboardingStep;
  label: string;
  sublabel: string;
  icon: string; // Feather icon name
  color: string;
  route: string;
}

const PIPELINE_STEPS: StepConfig[] = [
  {
    id: 'image',
    label: 'AI Photo Studio',
    sublabel: 'Upload & enhance image',
    icon: 'image',
    color: Colors.saffron,
    route: '/ai-studio',
  },
  {
    id: 'voice',
    label: 'Voice Cataloger',
    sublabel: 'Describe in your language',
    icon: 'mic',
    color: Colors.indigoLight,
    route: '/voice-cataloger',
  },
  {
    id: 'pricing',
    label: 'AI Pricing',
    sublabel: 'Get smart price suggestion',
    icon: 'trending-up',
    color: Colors.emerald,
    route: '/pricing',
  },
  {
    id: 'catalog',
    label: 'Publish Product',
    sublabel: 'Your product goes live!',
    icon: 'package',
    color: Colors.amber,
    route: '/(tabs)/products/new',
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function PipelineBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const pipeline = useOnboardingPipeline();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Pulse animation for the live dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    // Slide in from bottom
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Pulsing dot
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.8, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  // Don't render if not in onboarding, not hydrated, or pipeline is complete
  if (!pipeline.hydrated) return null;
  if (!pipeline.isOnboarding) return null;
  if (pipeline.step === 'complete') return null;

  // Don't overlay over login/register forms or welcome screen
  if (pathname === '/' || pathname.startsWith('/auth')) return null;

  const currentStep = PIPELINE_STEPS.find((s) => s.id === pipeline.step);
  const isAlreadyOnStep = pathname === currentStep?.route;

  // Dismissed → tiny floating pill
  if (dismissed) {
    return (
      <TouchableOpacity
        style={styles.pill}
        onPress={() => setDismissed(false)}
        activeOpacity={0.85}
      >
        <Text style={styles.pillEmoji}>🚀</Text>
        <Text style={styles.pillText}>
          Setup · Step {pipeline.currentStepIndex + 1}/4
        </Text>
        <View style={[styles.pillBadge, { backgroundColor: `${currentStep?.color}22` }]}>
          <Text style={[styles.pillBadgeText, { color: currentStep?.color }]}>Show</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const expandedHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 148],
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <LinearGradient
        colors={['rgba(14,10,7,0.97)', 'rgba(20,14,9,0.97)']}
        style={styles.banner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* ── Header row ── */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.9}
        >
          {/* Live pulse dot */}
          <View style={styles.dotWrap}>
            <Animated.View style={[styles.dotRing, { transform: [{ scale: pulseAnim }] }]} />
            <View style={styles.dot} />
          </View>

          {/* Title */}
          <View style={styles.headerText}>
            <Text style={styles.pipelineLabel}>🚀 SETUP PIPELINE</Text>
            <Text style={styles.stepMeta}>
              Step {pipeline.currentStepIndex + 1} of 4:{' '}
              <Text style={[styles.stepName, { color: currentStep?.color || Colors.saffron }]}>
                {currentStep?.label}
              </Text>
            </Text>
          </View>

          {/* Right buttons */}
          <View style={styles.headerActions}>
            {/* Go to step */}
            {currentStep && (
              <TouchableOpacity
                style={[styles.goBtn, { borderColor: `${currentStep.color}55`, backgroundColor: `${currentStep.color}18` }]}
                onPress={() => {
                  if (!isAlreadyOnStep) router.push(currentStep.route as any);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.goBtnText, { color: currentStep.color }]}>
                  {isAlreadyOnStep ? 'Here' : 'Go'}
                </Text>
                <Feather name={isAlreadyOnStep ? 'check' : 'arrow-right'} size={11} color={currentStep.color} />
              </TouchableOpacity>
            )}

            {/* Expand toggle */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setExpanded((e) => !e)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name={expanded ? 'chevron-down' : 'chevron-up'}
                size={14}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            {/* Dismiss */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color={Colors.textDim} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* ── Expanded steps row ── */}
        <Animated.View style={[styles.stepsContainer, { maxHeight: expandedHeight, overflow: 'hidden' }]}>
          <View style={styles.stepsRow}>
            {PIPELINE_STEPS.map((step, i) => {
              const isDone = pipeline.isStepDone(step.id);
              const isActive = pipeline.isStepActive(step.id);
              const isFuture = !isDone && !isActive;

              return (
                <React.Fragment key={step.id}>
                  {/* Step card */}
                  <TouchableOpacity
                    style={[
                      styles.stepCard,
                      isActive && { borderColor: `${step.color}55`, backgroundColor: `${step.color}14` },
                      isDone && styles.stepCardDone,
                      isFuture && styles.stepCardFuture,
                    ]}
                    onPress={() => {
                      if (!isFuture) router.push(step.route as any);
                    }}
                    activeOpacity={isFuture ? 1 : 0.8}
                    disabled={isFuture}
                  >
                    {/* Icon circle */}
                    <View
                      style={[
                        styles.stepIcon,
                        isDone && styles.stepIconDone,
                        isActive && { backgroundColor: `${step.color}20`, borderColor: `${step.color}50` },
                      ]}
                    >
                      {isDone ? (
                        <Feather name="check" size={12} color={Colors.emerald} />
                      ) : (
                        <Feather
                          name={step.icon as any}
                          size={12}
                          color={isFuture ? Colors.textDim : step.color}
                        />
                      )}
                    </View>

                    {/* Active glow pulse ring */}
                    {isActive && (
                      <GlowRing color={step.color} />
                    )}

                    {/* Labels */}
                    <Text
                      style={[
                        styles.stepLabel,
                        isDone && { color: Colors.emerald },
                        isActive && { color: step.color },
                        isFuture && { color: Colors.textDim },
                      ]}
                      numberOfLines={1}
                    >
                      {step.label}
                    </Text>
                    <Text style={styles.stepSublabel} numberOfLines={1}>
                      {isDone ? '✓ Done' : step.sublabel}
                    </Text>
                  </TouchableOpacity>

                  {/* Connector line */}
                  {i < PIPELINE_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.connector,
                        isDone && styles.connectorDone,
                      ]}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </Animated.View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((pipeline.currentStepIndex) / 4) * 100}%` },
            ]}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── Glow Ring (active step pulse) ─────────────────────────────────────────────

function GlowRing({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.glowRing,
        { borderColor: color, opacity: anim },
      ]}
    />
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 20 : 12,
    left: 12,
    right: 12,
    zIndex: 999,
  },
  banner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    overflow: 'hidden',
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  dotWrap: { width: 10, height: 10, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  dotRing: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.saffron, opacity: 0.4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.saffron },
  headerText: { flex: 1 },
  pipelineLabel: {
    fontSize: 9,
    fontFamily: Fonts.outfitBold,
    color: Colors.saffron,
    letterSpacing: 0.8,
  },
  stepMeta: {
    fontSize: 11,
    fontFamily: Fonts.outfit,
    color: Colors.textMuted,
    marginTop: 1,
  },
  stepName: {
    fontFamily: Fonts.outfitSemiBold,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  goBtnText: { fontSize: 11, fontFamily: Fonts.outfitSemiBold },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Steps
  stepsContainer: { paddingHorizontal: 12 },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 14,
  },
  stepCard: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: (SCREEN_WIDTH - 24 - 3 * 12 - 4 * 12) / 4,
    position: 'relative',
    overflow: 'visible',
  },
  stepCardDone: {
    borderColor: 'rgba(16,185,129,0.3)',
    backgroundColor: 'rgba(16,185,129,0.06)',
  },
  stepCardFuture: { opacity: 0.4 },
  stepIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 5,
  },
  stepIconDone: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  glowRing: {
    borderRadius: 12,
    borderWidth: 1.5,
    margin: -2,
  },
  stepLabel: {
    fontSize: 9,
    fontFamily: Fonts.outfitBold,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  stepSublabel: {
    fontSize: 8,
    color: Colors.textDim,
    fontFamily: Fonts.outfit,
    textAlign: 'center',
    marginTop: 1,
  },
  connector: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 4,
    borderRadius: 1,
  },
  connectorDone: {
    backgroundColor: 'rgba(16,185,129,0.45)',
  },

  // Progress bar
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.saffron,
    borderRadius: 2,
  },

  // Pill (dismissed state)
  pill: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: 'rgba(14,10,7,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.4)',
    shadowColor: Colors.saffron,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  pillEmoji: { fontSize: 13 },
  pillText: { fontSize: 11, fontFamily: Fonts.outfitBold, color: Colors.saffron },
  pillBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  pillBadgeText: { fontSize: 9, fontFamily: Fonts.outfitSemiBold },
});
