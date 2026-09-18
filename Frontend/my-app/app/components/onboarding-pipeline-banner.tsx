"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImageIcon, Mic, TrendingUp, Package,
  Check, ChevronRight, Sparkles, X, ArrowRight
} from "lucide-react";
import {
  useOnboardingPipeline,
  OnboardingStep
} from "../hooks/use-onboarding-pipeline";

// ─── Pipeline steps configuration ────────────────────────────────────────────

const PIPELINE_STEPS: {
  id: OnboardingStep;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  accentBg: string;
}[] = [
  {
    id: "image",
    label: "AI Photo Studio",
    sublabel: "Upload & enhance product image",
    icon: <ImageIcon size={14} />,
    href: "/ai-studio?onboarding=1",
    color: "#f97316",
    accentBg: "rgba(249,115,22,0.15)",
  },
  {
    id: "voice",
    label: "Voice Cataloger",
    sublabel: "Describe product in your language",
    icon: <Mic size={14} />,
    href: "/voice-cataloger?onboarding=1",
    color: "#818cf8",
    accentBg: "rgba(129,140,248,0.15)",
  },
  {
    id: "pricing",
    label: "AI Price Prediction",
    sublabel: "SigLIP + TabPFN model",
    icon: <TrendingUp size={14} />,
    href: "/onboarding/price-prediction",
    color: "#10b981",
    accentBg: "rgba(16,185,129,0.15)",
  },
  {
    id: "catalog",
    label: "Product Catalog",
    sublabel: "Your product goes live!",
    icon: <Package size={14} />,
    href: "/products",
    color: "#f59e0b",
    accentBg: "rgba(245,158,11,0.15)",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPipelineBanner() {
  const router = useRouter();
  const pipeline = useOnboardingPipeline();
  // Default to minimized = true so it never blocks the screen on load
  const [minimized, setMinimized] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Don't render if not onboarding or pipeline is complete
  if (!pipeline.hydrated) return null;
  if (!pipeline.isOnboarding) return null;
  if (pipeline.step === "complete") return null;

  const currentStep = PIPELINE_STEPS.find((s) => s.id === pipeline.step);

  // When dismissed by the user, show only a tiny non-intrusive floating pill at bottom-right
  if (dismissed) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 24,
          zIndex: 90,
        }}
      >
        <button
          onClick={() => setDismissed(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 30,
            background: "linear-gradient(135deg, rgba(20,15,10,0.95), rgba(30,20,10,0.95))",
            border: "1px solid rgba(249,115,22,0.4)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(249,115,22,0.2)",
            color: "#f97316",
            fontSize: 12,
            fontFamily: "Outfit",
            fontWeight: 700,
            cursor: "pointer",
            backdropFilter: "blur(12px)",
            transition: "all 0.2s ease",
          }}
          title="Click to view setup pipeline"
        >
          <span style={{ fontSize: 13 }}>🚀</span>
          <span>Pipeline: Step {pipeline.currentStepIndex + 1}/4</span>
          <span
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 10,
              background: "rgba(249,115,22,0.2)",
              color: currentStep?.color || "#f97316",
            }}
          >
            Show
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        left: 12,
        right: 12,
        zIndex: 90,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none", // Let clicks through outside the banner
      }}
    >
      <div
        style={{
          pointerEvents: "auto", // Enable clicks inside banner
          width: "100%",
          maxWidth: 880,
          borderRadius: 16,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(249,115,22,0.3)",
          background: "linear-gradient(135deg, rgba(14,10,7,0.96), rgba(20,14,9,0.96))",
          boxShadow: "0 8px 32px rgba(0,0,0,0.65), 0 0 24px rgba(249,115,22,0.12)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        }}
      >
        {/* Header / Grab bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            cursor: "pointer",
            borderBottom: minimized ? "none" : "1px solid rgba(249,115,22,0.15)",
            background: minimized
              ? "transparent"
              : "rgba(249,115,22,0.04)",
          }}
          onClick={() => setMinimized((m) => !m)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Animated pulse dot */}
            <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "#f97316",
                  animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                  opacity: 0.6,
                }}
              />
              <div
                style={{
                  position: "relative",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#f97316",
                }}
              />
            </div>

            <span
              style={{
                fontSize: 11,
                fontFamily: "Outfit",
                fontWeight: 800,
                color: "#f97316",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>🚀</span> SETUP PIPELINE
            </span>

            <span
              style={{
                fontSize: 11,
                color: "#c4a882",
                fontFamily: "Outfit",
              }}
            >
              Step {pipeline.currentStepIndex + 1} of 4:{" "}
              <span style={{ color: currentStep?.color || "#f97316", fontWeight: 600 }}>
                {currentStep?.label}
              </span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Go to Step button */}
            {currentStep && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(currentStep.href);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 20,
                  background: "rgba(249,115,22,0.18)",
                  border: "1px solid rgba(249,115,22,0.4)",
                  color: "#f97316",
                  fontSize: 11,
                  fontFamily: "Outfit",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Go to Step <ArrowRight size={11} />
              </button>
            )}

            {/* Toggle Minimize/Expand */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMinimized((m) => !m);
              }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#c4a882",
                cursor: "pointer",
                padding: "3px 8px",
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 11,
                fontFamily: "Outfit",
              }}
              title={minimized ? "Expand pipeline view" : "Minimize pipeline view"}
            >
              <span>{minimized ? "Expand" : "Collapse"}</span>
              <ChevronRight
                size={13}
                style={{
                  transform: minimized ? "rotate(-90deg)" : "rotate(90deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>

            {/* Dismiss / Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
              }}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "#9ca3af",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              title="Hide pipeline"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Expanded pipeline steps */}
        {!minimized && (
          <div
            style={{
              padding: "12px 16px 14px",
              display: "flex",
              alignItems: "center",
              gap: 0,
              overflowX: "auto",
            }}
          >
            {PIPELINE_STEPS.map((step, i) => {
              const isDone = pipeline.isStepDone(step.id);
              const isActive = pipeline.isStepActive(step.id);
              const isFuture = !isDone && !isActive;

              return (
                <div
                  key={step.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flex: i < PIPELINE_STEPS.length - 1 ? "1 1 auto" : "0 0 auto",
                  }}
                >
                  {/* Step card */}
                  <button
                    onClick={() => {
                      if (isDone || isActive) router.push(step.href);
                    }}
                    disabled={isFuture}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: `1px solid ${
                        isActive
                          ? `${step.color}60`
                          : isDone
                          ? "rgba(16,185,129,0.3)"
                          : "rgba(255,255,255,0.05)"
                      }`,
                      background: isActive
                        ? step.accentBg
                        : isDone
                        ? "rgba(16,185,129,0.08)"
                        : "transparent",
                      cursor: isFuture ? "default" : "pointer",
                      opacity: isFuture ? 0.4 : 1,
                      transition: "all 0.2s",
                      minWidth: 105,
                      position: "relative",
                    }}
                  >
                    {/* Icon circle */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isDone
                          ? "rgba(16,185,129,0.2)"
                          : isActive
                          ? step.accentBg
                          : "rgba(255,255,255,0.04)",
                        color: isDone ? "#10b981" : isActive ? step.color : "#7d6548",
                        border: isDone
                          ? "1.5px solid rgba(16,185,129,0.4)"
                          : isActive
                          ? `1.5px solid ${step.color}60`
                          : "1.5px solid rgba(255,255,255,0.06)",
                        transition: "all 0.2s",
                      }}
                    >
                      {isDone ? <Check size={13} /> : step.icon}
                    </div>

                    {/* Label */}
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: "Outfit",
                          fontWeight: 700,
                          color: isDone
                            ? "#10b981"
                            : isActive
                            ? step.color
                            : "#7d6548",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {step.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "#7d6548",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isDone ? "✓ Done" : step.sublabel}
                      </div>
                    </div>

                    {/* Active glow pulse */}
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          inset: -2,
                          borderRadius: 12,
                          border: `2px solid ${step.color}`,
                          opacity: 0.4,
                          animation: "pulse 2s ease-in-out infinite",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                  </button>

                  {/* Connector line */}
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: 2,
                        margin: "0 4px",
                        borderRadius: 2,
                        background: isDone
                          ? "rgba(16,185,129,0.5)"
                          : "rgba(255,255,255,0.06)",
                        transition: "background 0.5s",
                        minWidth: 12,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CSS for ping animation */}
      <style jsx global>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

