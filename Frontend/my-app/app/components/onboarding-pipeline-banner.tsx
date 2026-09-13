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
  const [minimized, setMinimized] = useState(false);

  // Don't render if not onboarding or pipeline is complete
  if (!pipeline.hydrated) return null;
  if (!pipeline.isOnboarding) return null;
  if (pipeline.step === "complete") return null;

  const currentStep = PIPELINE_STEPS.find((s) => s.id === pipeline.step);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(249,115,22,0.3)",
        background: "linear-gradient(to right, rgba(10,8,6,0.97), rgba(15,10,5,0.97))",
        boxShadow: "0 -4px 40px rgba(249,115,22,0.12)",
        transition: "transform 0.3s ease",
        transform: minimized ? "translateY(calc(100% - 44px))" : "translateY(0)",
      }}
    >
      {/* Collapsed grab bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 20px",
          cursor: "pointer",
          borderBottom: minimized ? "none" : "1px solid rgba(249,115,22,0.1)",
        }}
        onClick={() => setMinimized((m) => !m)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Animated pulse dot */}
          <div style={{ position: "relative", width: 10, height: 10 }}>
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
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#f97316",
              }}
            />
          </div>

          <span
            style={{
              fontSize: 12,
              fontFamily: "Outfit",
              fontWeight: 700,
              color: "#f97316",
              letterSpacing: "0.04em",
            }}
          >
            🚀 ARTISAN SETUP PIPELINE
          </span>

          <span
            style={{
              fontSize: 11,
              color: "#c4a882",
              fontFamily: "Outfit",
            }}
          >
            Step {pipeline.currentStepIndex + 1} of 4:{" "}
            <span style={{ color: currentStep?.color || "#f97316" }}>
              {currentStep?.label}
            </span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Skip to current step button */}
          {currentStep && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(currentStep.href);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 20,
                background: "rgba(249,115,22,0.15)",
                border: "1px solid rgba(249,115,22,0.3)",
                color: "#f97316",
                fontSize: 11,
                fontFamily: "Outfit",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go to Step <ArrowRight size={11} />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setMinimized((m) => !m);
            }}
            style={{
              background: "none",
              border: "none",
              color: "#7d6548",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            {minimized ? <ChevronRight size={16} style={{ transform: "rotate(-90deg)" }} /> : <ChevronRight size={16} style={{ transform: "rotate(90deg)" }} />}
          </button>
        </div>
      </div>

      {/* Expanded pipeline steps */}
      {!minimized && (
        <div
          style={{
            padding: "12px 20px 16px",
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
                style={{ display: "flex", alignItems: "center", flex: i < PIPELINE_STEPS.length - 1 ? "1 1 auto" : "0 0 auto" }}
              >
                {/* Step card */}
                <button
                  onClick={() => {
                    // Only allow navigating to done or active steps
                    if (isDone || isActive) router.push(step.href);
                  }}
                  disabled={isFuture}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    borderRadius: 12,
                    border: `1px solid ${
                      isActive
                        ? `${step.color}50`
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
                    transition: "all 0.25s",
                    minWidth: 120,
                    position: "relative",
                  }}
                >
                  {/* Icon circle */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
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
                      transition: "all 0.3s",
                    }}
                  >
                    {isDone ? <Check size={14} /> : step.icon}
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
                      {isDone ? "✓ Complete" : step.sublabel}
                    </div>
                  </div>

                  {/* Active glow pulse */}
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        inset: -2,
                        borderRadius: 14,
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
                      minWidth: 16,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

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

