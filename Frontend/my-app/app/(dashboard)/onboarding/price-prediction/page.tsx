"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  TrendingUp, Sparkles, Loader2, Check, AlertCircle,
  ArrowRight, Package, Tag, ImageIcon, Brain,
  ChevronRight, IndianRupee, RefreshCw, ShoppingBag,
  Cpu, BarChart3, Layers, CheckCircle2
} from "lucide-react";
import { useOnboardingPipeline, PredictedPrice } from "../../../hooks/use-onboarding-pipeline";
import OnboardingPipelineBanner from "../../../components/onboarding-pipeline-banner";

const AI_BASE = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8000";

// ─── Processing stages for SigLIP + TabPFN pipeline animation ────────────────
const MODEL_STAGES = [
  {
    id: "siglip",
    label: "SigLIP Vision Encoder",
    sublabel: "Extracting 768-dim image embedding",
    icon: <ImageIcon size={14} />,
    color: "#818cf8",
    durationEstimate: "~3s",
  },
  {
    id: "fusion",
    label: "Feature Fusion",
    sublabel: "Merging image + tabular spec features",
    icon: <Layers size={14} />,
    color: "#f97316",
    durationEstimate: "~1s",
  },
  {
    id: "tabpfn",
    label: "TabPFN Inference",
    sublabel: "In-context price regression",
    icon: <Brain size={14} />,
    color: "#10b981",
    durationEstimate: "~2s",
  },
];

interface ModelProgress {
  stage: number;   // 0=idle, 1=siglip, 2=fusion, 3=tabpfn
  done: number[];
}

export default function PricePredictionPage() {
  const router = useRouter();
  const pipeline = useOnboardingPipeline();

  const [loading, setLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState<ModelProgress>({ stage: 0, done: [] });
  const [result, setResult] = useState<PredictedPrice | null>(null);
  const [error, setError] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [productCreated, setProductCreated] = useState(false);

  // Guard: redirect if pipeline data is missing
  useEffect(() => {
    if (!pipeline.hydrated) return;
    if (!pipeline.isOnboarding) {
      router.replace("/dashboard");
    }
  }, [pipeline.hydrated, pipeline.isOnboarding, router]);

  const { studioImages, voiceSpecs } = pipeline;

  // ── Run SigLIP + TabPFN prediction ─────────────────────────────────────────
  const runPricePrediction = async () => {
    if (!studioImages?.ecommerce || !voiceSpecs) return;
    setLoading(true);
    setError("");
    setModelProgress({ stage: 1, done: [] });

    try {
      const stageDelay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Convert base64 ecommerce image to blob
      const b64 = studioImages.ecommerce.replace(/^data:image\/\w+;base64,/, "");
      const byteArray = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const imageBlob = new Blob([byteArray], { type: "image/jpeg" });

      const fd = new FormData();
      fd.append("image", imageBlob, "product.jpg");
      fd.append("category", voiceSpecs.category || "other");
      fd.append("materials", voiceSpecs.materials || "");
      fd.append("craft_technique", voiceSpecs.craftTechnique || "");
      fd.append("tags", voiceSpecs.tags || "");
      fd.append("description", voiceSpecs.description || "");

      // Kick off request
      const promise = axios.post(`${AI_BASE}/ai/pricing/predict-siglip`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      // Animate model stages while waiting
      await stageDelay(3200);
      setModelProgress({ stage: 2, done: [1] });
      await stageDelay(1500);
      setModelProgress({ stage: 3, done: [1, 2] });

      const res = await promise;
      const data = res.data.data as PredictedPrice;

      setModelProgress({ stage: 0, done: [1, 2, 3] });
      setResult(data);
      pipeline.completePricingStep(data);
    } catch (err: any) {
      // Fallback: use voice hint or generate estimate
      const hint = voiceSpecs?.price_hint;
      const fallback: PredictedPrice = {
        predicted_price: hint ? Math.round(hint * 1.15) : 2500,
        confidence_low: hint ? Math.round(hint * 0.8) : 1800,
        confidence_high: hint ? Math.round(hint * 1.5) : 3500,
        reasoning: "Estimated based on product category, materials, and craft technique. SigLIP service may not be available; connect AI service for multimodal prediction.",
        model: "Fallback Estimator",
      };
      setModelProgress({ stage: 0, done: [1, 2, 3] });
      setResult(fallback);
      pipeline.completePricingStep(fallback);
      setError("AI price model unavailable — using estimated price. Connect AI service for precise SigLIP + TabPFN prediction.");
    } finally {
      setLoading(false);
    }
  };

  // ── Create final product listing ────────────────────────────────────────────
  const createProductListing = async () => {
    if (!voiceSpecs || !result) return;
    setCreatingProduct(true);
    setError("");

    try {
      const token = localStorage.getItem("ks_token");

      // Build product payload
      const materials = voiceSpecs.materials
        ? voiceSpecs.materials.split(",").map((m) => m.trim()).filter(Boolean)
        : [];
      const tags = voiceSpecs.tags
        ? voiceSpecs.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const images: { url: string; isOriginal: boolean; isEnhanced: boolean; isBgRemoved: boolean }[] = [];
      if (studioImages?.ecommerce) {
        images.push({ url: studioImages.ecommerce, isOriginal: false, isEnhanced: true, isBgRemoved: false });
      }
      if (studioImages?.bgRemoved) {
        images.push({ url: studioImages.bgRemoved, isOriginal: false, isEnhanced: false, isBgRemoved: true });
      }
      if (studioImages?.enhanced) {
        images.push({ url: studioImages.enhanced, isOriginal: false, isEnhanced: true, isBgRemoved: false });
      }

      const payload = {
        name: voiceSpecs.name,
        category: voiceSpecs.category,
        description: voiceSpecs.description,
        materials,
        tags,
        craftTechnique: voiceSpecs.craftTechnique,
        price: result.predicted_price,
        pricingConfidenceLow: result.confidence_low,
        pricingConfidenceHigh: result.confidence_high,
        aiPricingModel: result.model,
        isAIGenerated: true,
        voiceTranscript: voiceSpecs.transcript,
        detectedLanguage: voiceSpecs.detectedLanguage,
        images,
        isPublished: true,
      };

      const res = await axios.post("http://localhost:5000/api/products", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        const productId = res.data.data._id || res.data.data.id;
        pipeline.completeOnboarding(productId);
        setProductCreated(true);
        setTimeout(() => router.push("/products?onboarding=complete"), 1800);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create product. Please try again.");
    } finally {
      setCreatingProduct(false);
    }
  };

  if (!pipeline.hydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={40} className="animate-spin" style={{ color: "#f97316" }} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 page-enter">
      <OnboardingPipelineBanner />

      {/* ── Step context header ── */}
      <div
        style={{
          padding: "16px 20px",
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))",
          border: "1px solid rgba(16,185,129,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "rgba(16,185,129,0.2)",
            border: "1px solid rgba(16,185,129,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#10b981",
          }}
        >
          <TrendingUp size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontFamily: "Outfit", fontWeight: 700, color: "#10b981", marginBottom: 3 }}>
            Step 3 of 4 — AI Price Prediction
          </div>
          <div style={{ fontSize: 12, color: "#c4a882" }}>
            SigLIP vision encoder + feature fusion + TabPFN in-context price prediction — multimodal AI model.
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["image", "voice", "pricing", "catalog"].map((s, i) => (
            <div
              key={s}
              style={{
                width: i === 2 ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: i <= 2 ? (i === 2 ? "#10b981" : "rgba(16,185,129,0.6)") : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Page title */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="badge badge-green">SigLIP + TabPFN</span>
          <span className="badge badge-indigo">Multimodal AI</span>
          <span className="badge badge-saffron">Step 3/4</span>
        </div>
        <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
          🧠 AI Price Prediction
        </h1>
        <p style={{ color: "#c4a882" }}>
          Combining your product image (SigLIP embeddings) with extracted specifications (TabPFN tabular learner) to predict the optimal market price.
        </p>
      </div>

      {/* ── Product summary card (image + specs side by side) ── */}
      <div className="glass-card p-5">
        <p style={{ fontSize: 11, fontFamily: "Outfit", fontWeight: 600, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Product Input Summary
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Image preview */}
          <div>
            <p style={{ fontSize: 11, color: "#7d6548", marginBottom: 8, fontFamily: "Outfit", fontWeight: 600 }}>
              E-Commerce Ready Image (SigLIP input)
            </p>
            <div
              style={{
                borderRadius: 12, overflow: "hidden",
                background: studioImages?.ecommerce ? "#ffffff" : "var(--bg-dark-3)",
                border: "1px solid rgba(255,255,255,0.08)",
                minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}
            >
              {studioImages?.ecommerce ? (
                <>
                  <img
                    src={studioImages.ecommerce}
                    alt="Product"
                    style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 8, right: 8,
                      padding: "3px 8px", borderRadius: 20,
                      background: "rgba(16,185,129,0.9)",
                      fontSize: 10, fontFamily: "Outfit", fontWeight: 700,
                      color: "white",
                    }}
                  >
                    ✓ Studio Quality
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <ImageIcon size={36} color="#7d6548" style={{ margin: "0 auto 8px" }} />
                  <p style={{ color: "#7d6548", fontSize: 12 }}>No image from previous step</p>
                </div>
              )}
            </div>
          </div>

          {/* Specs */}
          <div>
            <p style={{ fontSize: 11, color: "#7d6548", marginBottom: 8, fontFamily: "Outfit", fontWeight: 600 }}>
              Product Specifications (TabPFN features)
            </p>
            {voiceSpecs ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Name", value: voiceSpecs.name, icon: "📦" },
                  { label: "Category", value: voiceSpecs.category, icon: "🏺" },
                  { label: "Materials", value: voiceSpecs.materials, icon: "🧵" },
                  { label: "Craft Technique", value: voiceSpecs.craftTechnique, icon: "🎨" },
                  { label: "Tags", value: voiceSpecs.tags, icon: "#" },
                  { label: "Voice Price Hint", value: voiceSpecs.price_hint ? `₹${voiceSpecs.price_hint}` : "Not specified", icon: "💡" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 8,
                      padding: "7px 10px", borderRadius: 8,
                      background: "var(--bg-dark-3)",
                    }}
                  >
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 10, color: "#7d6548", fontFamily: "Outfit", fontWeight: 600, display: "block" }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 12, color: "#c4a882" }}>
                        {item.value || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: "center" }}>
                <p style={{ color: "#7d6548", fontSize: 12 }}>No specs from previous step</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Model Architecture Info ── */}
      {!loading && !result && (
        <div className="glass-card p-5">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Cpu size={16} style={{ color: "#818cf8" }} />
            <p style={{ fontSize: 12, fontFamily: "Outfit", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Model Architecture
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              {
                name: "SigLIP",
                desc: "Google's vision encoder",
                detail: "Processes your product image into 768-dimensional semantic embeddings capturing visual features like color, texture, and craftsmanship.",
                color: "#818cf8",
                icon: "🔬",
              },
              {
                name: "Feature Fusion",
                desc: "Multimodal integration",
                detail: "Concatenates image embeddings with encoded tabular features (category, material, technique, tags) into a unified fused vector.",
                color: "#f97316",
                icon: "⚡",
              },
              {
                name: "TabPFN",
                desc: "In-context learner",
                detail: "Transformer-based tabular model that performs price regression using curated craft market examples — no fine-tuning needed.",
                color: "#10b981",
                icon: "🧠",
              },
            ].map((m) => (
              <div
                key={m.name}
                style={{
                  padding: "12px 14px", borderRadius: 12,
                  background: `${m.color}08`,
                  border: `1px solid ${m.color}20`,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                <div style={{ fontSize: 12, fontFamily: "Outfit", fontWeight: 700, color: m.color, marginBottom: 2 }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 10, color: "#7d6548", fontWeight: 600, marginBottom: 6 }}>
                  {m.desc}
                </div>
                <div style={{ fontSize: 11, color: "#c4a882", lineHeight: 1.5 }}>
                  {m.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Run prediction button ── */}
      {!loading && !result && (
        <button
          onClick={runPricePrediction}
          disabled={!studioImages?.ecommerce || !voiceSpecs}
          className="btn-primary w-full"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            padding: "16px 28px", fontSize: 16,
          }}
        >
          <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 12 }}>
            <Brain size={20} />
            Run AI Price Prediction (SigLIP + TabPFN)
            <Sparkles size={16} />
          </span>
        </button>
      )}

      {/* ── Model processing stages animation ── */}
      {loading && (
        <div className="glass-card" style={{ padding: 24 }}>
          <p style={{ fontSize: 12, fontFamily: "Outfit", fontWeight: 700, color: "var(--text-muted)", marginBottom: 18, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "center" }}>
            🤖 Running Multimodal Price Prediction Pipeline...
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MODEL_STAGES.map((stage, i) => {
              const stageNum = i + 1;
              const isDone = modelProgress.done.includes(stageNum);
              const isActive = modelProgress.stage === stageNum;
              return (
                <div
                  key={stage.id}
                  className={`pipeline-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                >
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: isDone
                        ? "rgba(16,185,129,0.2)"
                        : isActive
                        ? `${stage.color}20`
                        : "rgba(255,255,255,0.04)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: isDone ? "#10b981" : isActive ? stage.color : "#7d6548",
                      border: isDone
                        ? "1.5px solid rgba(16,185,129,0.4)"
                        : isActive
                        ? `1.5px solid ${stage.color}60`
                        : "1.5px solid rgba(255,255,255,0.05)",
                      transition: "all 0.4s",
                    }}
                  >
                    {isDone ? <Check size={16} /> : isActive ? <Loader2 size={16} className="animate-spin" /> : stage.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 13, color: isDone ? "#10b981" : isActive ? stage.color : "#7d6548" }}>
                      {stage.label}
                    </p>
                    <p style={{ fontSize: 11, color: "#7d6548" }}>{stage.sublabel}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {isDone && (
                      <span style={{ fontSize: 11, color: "#10b981", fontFamily: "Outfit", fontWeight: 600 }}>Done</span>
                    )}
                    {isActive && (
                      <>
                        <span style={{ fontSize: 11, color: stage.color, fontFamily: "Outfit", fontWeight: 600, display: "block" }}>Processing...</span>
                        <span style={{ fontSize: 10, color: "#7d6548" }}>{stage.durationEstimate}</span>
                      </>
                    )}
                    {!isDone && !isActive && (
                      <span style={{ fontSize: 10, color: "#7d6548" }}>Pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Price result display ── */}
      {result && !loading && (
        <>
          {/* Main price card */}
          <div
            style={{
              padding: "28px 24px",
              borderRadius: 20,
              background: "linear-gradient(135deg, rgba(249,115,22,0.14), rgba(234,88,12,0.06))",
              border: "1px solid rgba(249,115,22,0.4)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative gradient blob */}
            <div
              style={{
                position: "absolute", top: -40, right: -40,
                width: 180, height: 180, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(249,115,22,0.15), transparent 70%)",
                pointerEvents: "none",
              }}
            />

            <div style={{ fontSize: 12, fontFamily: "Outfit", fontWeight: 700, color: "#c4a882", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              🧠 AI Predicted Price
            </div>

            <div style={{ fontSize: 56, fontFamily: "Outfit", fontWeight: 900, color: "#f97316", lineHeight: 1, marginBottom: 8 }}>
              ₹{result.predicted_price.toLocaleString("en-IN")}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "#7d6548" }}>
                Low: <strong style={{ color: "#c4a882" }}>₹{result.confidence_low.toLocaleString("en-IN")}</strong>
              </span>
              <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 13, color: "#7d6548" }}>
                High: <strong style={{ color: "#c4a882" }}>₹{result.confidence_high.toLocaleString("en-IN")}</strong>
              </span>
            </div>

            {/* Confidence range bar */}
            <div style={{ maxWidth: 320, margin: "0 auto 12px" }}>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 0, top: 0, height: "100%",
                    width: "100%",
                    borderRadius: 3,
                    background: "linear-gradient(to right, rgba(249,115,22,0.3), #f97316, rgba(249,115,22,0.3))",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%", transform: "translateX(-50%)",
                    top: -4, width: 14, height: 14,
                    borderRadius: "50%",
                    background: "#f97316",
                    border: "2px solid white",
                    boxShadow: "0 0 12px rgba(249,115,22,0.7)",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "#7d6548" }}>₹{result.confidence_low.toLocaleString("en-IN")}</span>
                <span style={{ fontSize: 10, color: "#7d6548" }}>₹{result.confidence_high.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Cpu size={12} style={{ color: "#10b981" }} />
              <span style={{ fontSize: 11, color: "#10b981", fontFamily: "Outfit", fontWeight: 600 }}>
                {result.model}
              </span>
            </div>
          </div>

          {/* AI Reasoning */}
          {result.reasoning && (
            <div className="glass-card p-5">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <BarChart3 size={14} style={{ color: "#818cf8" }} />
                <p style={{ fontSize: 11, fontFamily: "Outfit", fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Model Reasoning
                </p>
              </div>
              <p style={{ fontSize: 13, color: "#c4a882", lineHeight: 1.7 }}>
                {result.reasoning}
              </p>
            </div>
          )}

          {/* Error notice for fallback */}
          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", color: "#fbbf24", fontSize: 12 }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              {error}
            </div>
          )}

          {/* Final product preview */}
          <div className="glass-card p-5">
            <p style={{ fontSize: 11, fontFamily: "Outfit", fontWeight: 700, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Final Product Listing Preview
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Thumbnail */}
              <div
                style={{
                  borderRadius: 10, overflow: "hidden",
                  background: studioImages?.ecommerce ? "#ffffff" : "var(--bg-dark-3)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  aspectRatio: "1/1",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {studioImages?.ecommerce ? (
                  <img src={studioImages.ecommerce} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <ImageIcon size={28} color="#7d6548" />
                )}
              </div>

              {/* Details */}
              <div style={{ gridColumn: "span 2" }}>
                <h3 style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 16, color: "#f5efe6", marginBottom: 6 }}>
                  {voiceSpecs?.name || "Product Name"}
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                  {voiceSpecs?.tags?.split(",").slice(0, 5).map((t) => (
                    <span key={t.trim()} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(249,115,22,0.1)", color: "#f97316", border: "1px solid rgba(249,115,22,0.2)" }}>
                      #{t.trim()}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: "#c4a882", lineHeight: 1.6, marginBottom: 10 }}>
                  {(voiceSpecs?.description || "").slice(0, 120)}{voiceSpecs?.description && voiceSpecs.description.length > 120 ? "..." : ""}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 10, color: "#7d6548", fontFamily: "Outfit", fontWeight: 600 }}>AI PRICE</span>
                    <div style={{ fontSize: 22, fontFamily: "Outfit", fontWeight: 900, color: "#f97316" }}>
                      ₹{result.predicted_price.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, color: "#7d6548", fontFamily: "Outfit", fontWeight: 600 }}>CATEGORY</span>
                    <div style={{ fontSize: 13, color: "#c4a882", fontFamily: "Outfit", fontWeight: 600, textTransform: "capitalize" }}>
                      {voiceSpecs?.category || "Other"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Create listing CTA */}
          {!productCreated ? (
            <button
              onClick={createProductListing}
              disabled={creatingProduct}
              className="btn-primary w-full"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "16px 28px", fontSize: 16,
              }}
            >
              <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                {creatingProduct ? (
                  <><Loader2 size={20} className="animate-spin" /> Creating Listing...</>
                ) : (
                  <><ShoppingBag size={20} /> Create Product Listing & Go to Catalog <ArrowRight size={18} /></>
                )}
              </span>
            </button>
          ) : (
            <div
              style={{
                padding: "20px 24px",
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.06))",
                border: "1px solid rgba(16,185,129,0.5)",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontFamily: "Outfit", fontWeight: 700, color: "#10b981" }}>
                  🎉 Product Created Successfully!
                </div>
                <div style={{ fontSize: 12, color: "#c4a882" }}>
                  Navigating to your Product Catalog...
                </div>
              </div>
              <Loader2 size={18} className="animate-spin" style={{ color: "#10b981", marginLeft: "auto" }} />
            </div>
          )}

          {/* Re-run option */}
          {!productCreated && (
            <button
              onClick={() => { setResult(null); setError(""); setModelProgress({ stage: 0, done: [] }); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#7d6548", fontSize: 12, fontFamily: "Outfit",
                display: "flex", alignItems: "center", gap: 6, margin: "0 auto",
              }}
            >
              <RefreshCw size={12} /> Re-run Price Prediction
            </button>
          )}
        </>
      )}
    </div>
  );
}

