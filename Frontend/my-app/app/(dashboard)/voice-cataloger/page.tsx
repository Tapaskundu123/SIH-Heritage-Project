"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Mic, MicOff, Square, Play, Pause, ChevronRight,
  Check, RefreshCw, Save, AlertCircle, Sparkles, Globe,
  FileText, Tag, Package, DollarSign, Loader2, ArrowRight,
  TrendingUp, ImageIcon
} from "lucide-react";
import { useOnboardingPipeline } from "../../hooks/use-onboarding-pipeline";
import OnboardingPipelineBanner from "../../components/onboarding-pipeline-banner";

type PipelineStage = "idle" | "recording" | "processing" | "transcribing" | "translating" | "extracting" | "done" | "error";

interface PipelineResult {
  asr?: {
    transcript: string;
    detected_language: string;
    language_name: string;
    confidence: number;
  };
  translation?: {
    original: string;
    english?: string;
    translated: string;
    was_translated: boolean;
  };
  extraction?: {
    name: string;
    name_hindi?: string;
    category: string;
    materials: string[];
    colors: string[];
    craft_technique?: string;
    origin_region?: string;
    dimensions?: string;
    price_hint?: number;
    price?: number;
    suggestedPrice?: number;
    tags: string[];
    key_features?: string[];
    description_en: string;
    description_hi?: string;
    care_instructions?: string;
    ai_engine?: string;
    confidence: number;
  };
}

const LANG_NAMES: Record<string, string> = {
  hi: "हिंदी", bn: "বাংলা", ta: "தமிழ்", te: "తెలుగు",
  mr: "मराठी", gu: "ગુજરાતી", kn: "ಕನ್ನಡ", ml: "മലയാളം",
  or: "ଓଡ଼ିଆ", pa: "ਪੰਜਾਬੀ", en: "English", ur: "اردو",
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: "Ready to record",
  recording: "Recording artisan's voice...",
  processing: "Processing audio...",
  transcribing: "Generating transcript...",
  translating: "Translate (Hindi/English)...",
  extracting: "Product Catalog & Price Prediction...",
  done: "Product Catalog Ready!",
  error: "Error occurred",
};

const STAGE_INDEX: Record<PipelineStage, number> = {
  idle: -1, recording: -1, processing: 0,
  transcribing: 0, translating: 1, extracting: 2, done: 3, error: -1
};

const PIPELINE_STEPS = [
  { icon: "📝", label: "Transcript", desc: "Speech to text" },
  { icon: "🌐", label: "Translate", desc: "Hindi/English" },
  { icon: "📋", label: "Product Catalog", desc: "Specs & materials" },
  { icon: "💰", label: "Price Prediction", desc: "Market benchmark" },
];

const EXAMPLE_PROMPTS = [
  { lang: "Hindi", text: "मेरे पास बनारसी रेशम की साड़ी है, लाल और सुनहरे रंग में, हाथ से बुनी हुई, कीमत 3500 रुपये।", flag: "🇮🇳" },
  { lang: "Tamil", text: "காஞ்சிவரம் பட்டு புடவை, தங்க நூல் வேலை, பாரம்பரிய முறையில் நெய்யப்பட்டது.", flag: "🇮🇳" },
  { lang: "Bengali", text: "মসলিন কাপড়ের শাড়ি, ঢাকাই জামদানি, হাতে বোনা, সূক্ষ্ম নকশা।", flag: "🇮🇳" },
];

export default function VoiceCatalogerPage() {
  const router = useRouter();
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [editedProduct, setEditedProduct] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);

  // Onboarding state
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [onboardingContinueCountdown, setOnboardingContinueCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pipelineHook = useOnboardingPipeline();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("onboarding") === "1" || pipelineHook.isOnboarding) setIsOnboardingMode(true);
    }
  }, [pipelineHook.isOnboarding]);

  // Start countdown to price prediction page
  const startOnboardingCountdown = useCallback(() => {
    setOnboardingContinueCountdown(4);
    countdownRef.current = setInterval(() => {
      setOnboardingContinueCountdown((c) => {
        if (c === null || c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          router.push("/onboarding/price-prediction");
          return null;
        }
        return c - 1;
      });
    }, 1000);
  }, [router]);

  const startRecording = useCallback(async () => {
    setError("");
    setResult(null);
    setSaved(false);
    setEditedProduct(null);
    chunksRef.current = [];
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(blob);
      };

      recorder.start(100);
      setStage("recording");

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => {
          if (t >= 120) { // Max 2 minutes
            stopRecording();
            return t;
          }
          return t + 1;
        });
      }, 1000);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone permission.");
      setStage("error");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setStage("processing");
  }, []);

  const processAudio = async (audioBlob: Blob) => {
    try {
      const token = localStorage.getItem("ks_token");
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      setStage("transcribing");
      await new Promise((r) => setTimeout(r, 500));
      setStage("translating");
      await new Promise((r) => setTimeout(r, 300));
      setStage("extracting");

      const res = await axios.post("/api/ai/voice/transcribe", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      });

      if (res.data.success) {
        const pipeline = res.data.data.pipeline;
        setResult(pipeline);
        const ext = pipeline.extraction || {};
        const specs = {
          name: ext.name || "",
          name_hindi: ext.name_hindi || "",
          category: ext.category || "other",
          description: ext.description_en || "",
          description_hi: ext.description_hi || "",
          materials: Array.isArray(ext.materials) ? ext.materials.join(", ") : (ext.materials || ""),
          colors: Array.isArray(ext.colors) ? ext.colors.join(", ") : (ext.colors || ""),
          tags: Array.isArray(ext.tags) ? ext.tags.join(", ") : (ext.tags || ""),
          price: ext.suggestedPrice || ext.price_hint || ext.price || "",
          craftTechnique: ext.craft_technique || "",
          originRegion: ext.origin_region || "",
          dimensions: ext.dimensions || "",
          key_features: Array.isArray(ext.key_features) ? ext.key_features : [],
          care_instructions: ext.care_instructions || "",
          ai_engine: ext.ai_engine || "",
        };
        setEditedProduct(specs);
        setStage("done");

        // ── Onboarding: save specs to pipeline state and start countdown ──
        if (isOnboardingMode) {
          pipelineHook.completeVoiceStep({
            name: String(specs.name),
            category: String(specs.category),
            description: String(specs.description),
            materials: String(specs.materials),
            tags: String(specs.tags),
            craftTechnique: String(specs.craftTechnique),
            price_hint: Number(specs.price) || null,
            transcript: pipeline.asr?.transcript,
            detectedLanguage: pipeline.asr?.detected_language,
            confidence: pipeline.extraction?.confidence,
          });
          startOnboardingCountdown();
        }
      } else {
        throw new Error("Pipeline failed");
      }
    } catch (err: unknown) {
      const axiosErr = err as { message?: string; response?: { data?: { message?: string } } };
      console.error("Voice pipeline error:", err);
      setError(axiosErr.response?.data?.message || axiosErr.message || "Voice processing failed. Make sure the AI service is running.");
      setStage("error");
    }
  };

  const handleSaveProduct = async () => {
    try {
      const token = localStorage.getItem("ks_token");
      await axios.post("/api/products", {
        ...editedProduct,
        materials: String(editedProduct?.materials || "").split(",").map((m: string) => m.trim()).filter(Boolean),
        colors: String(editedProduct?.colors || "").split(",").map((c: string) => c.trim()).filter(Boolean),
        tags: String(editedProduct?.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
        price: Number(editedProduct?.price) || 0,
        stock: Number(editedProduct?.stock) > 0 ? Number(editedProduct?.stock) : 10,
        name_hindi: String(editedProduct?.name_hindi || ""),
        description_hi: String(editedProduct?.description_hi || ""),
        voiceTranscript: result?.asr?.transcript,
        detectedLanguage: result?.asr?.detected_language,
        isAIGenerated: true,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSaved(true);
    } catch {
      setError("Failed to save product. Please try again.");
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const currentStageIdx = STAGE_INDEX[stage];

  return (
    <div className="max-w-4xl mx-auto space-y-6" style={{ paddingBottom: isOnboardingMode ? 100 : 0 }}>
      {/* Onboarding Banner */}
      {isOnboardingMode && <OnboardingPipelineBanner />}

      {/* Header */}
      <div>
        {isOnboardingMode && (
          <div
            style={{
              padding: "14px 20px",
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(129,140,248,0.12), rgba(99,102,241,0.06))",
              border: "1px solid rgba(129,140,248,0.35)",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: "rgba(129,140,248,0.2)",
                border: "1px solid rgba(129,140,248,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#818cf8", fontSize: 20,
              }}
            >
              🎙️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontFamily: "Outfit", fontWeight: 700, color: "#818cf8", marginBottom: 3 }}>
                Step 2 of 4 — Voice Cataloger
              </div>
              <div style={{ fontSize: 12, color: "#c4a882" }}>
                Speak about your product in your language. AI will extract specifications, materials, and details automatically.
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {["image", "voice", "pricing", "catalog"].map((s, i) => (
                <div
                  key={s}
                  style={{
                    width: i === 1 ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i <= 1 ? (i === 1 ? "#818cf8" : "#10b981") : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-saffron">⭐ Most Important</span>
          <span className="badge badge-indigo">AI Pipeline</span>
          {isOnboardingMode && <span className="badge badge-green">Step 2/4</span>}
        </div>
        <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
          🎙️  Multilingual Voice Cataloger
        </h1>
        <p style={{ color: "#c4a882" }}>
          Speak in your language. AI converts it to a professional product listing automatically.
        </p>
      </div>

      {/* Main mic area */}
      <div className="glass-card p-8 text-center">
        {/* Status badge */}
        <div className="mb-6">
          <span className={`badge text-sm ${stage === "done" ? "badge-green" : stage === "error" ? "badge-red" : "badge-saffron"}`}>
            {STAGE_LABELS[stage]}
          </span>
        </div>

        {/* Big mic button */}
        <div className="relative inline-flex items-center justify-center mb-6">
          {/* Ring animations when recording */}
          {stage === "recording" && (
            <>
              <div className="absolute w-40 h-40 rounded-full mic-ring" style={{ background: "rgba(239,68,68,0.2)" }} />
              <div className="absolute w-40 h-40 rounded-full mic-ring" style={{ background: "rgba(239,68,68,0.1)", animationDelay: "0.5s" }} />
            </>
          )}

          <button
            onClick={stage === "recording" ? stopRecording : startRecording}
            disabled={["processing", "transcribing", "translating", "extracting"].includes(stage)}
            className={`relative w-28 h-28 rounded-full flex items-center justify-center text-white transition-all duration-300 ${
              stage === "recording" ? "mic-recording" : ""
            }`}
            style={{
              background: stage === "recording"
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : stage === "done"
                ? "linear-gradient(135deg, #10b981, #059669)"
                : ["processing", "transcribing", "translating", "extracting"].includes(stage)
                ? "rgba(249,115,22,0.3)"
                : "linear-gradient(135deg, #f97316, #ea580c)",
              boxShadow: stage === "recording"
                ? "0 0 40px rgba(239,68,68,0.5)"
                : "0 0 30px rgba(249,115,22,0.3)",
              cursor: ["processing", "transcribing", "translating", "extracting"].includes(stage) ? "not-allowed" : "pointer",
            }}>
            {["processing", "transcribing", "translating", "extracting"].includes(stage) ? (
              <Loader2 size={40} className="animate-spin" />
            ) : stage === "recording" ? (
              <Square size={36} fill="white" />
            ) : stage === "done" ? (
              <Check size={40} />
            ) : (
              <Mic size={40} />
            )}
          </button>
        </div>

        {/* Timer */}
        {stage === "recording" && (
          <div className="text-3xl font-mono font-bold mb-4" style={{ color: "#ef4444" }}>
            {formatTime(recordingTime)}
          </div>
        )}

        {/* Waveform animation */}
        {stage === "recording" && (
          <div className="flex items-center justify-center gap-1 mb-4 h-10">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.08}s` }} />
            ))}
          </div>
        )}

        <p className="text-sm" style={{ color: "#7d6548" }}>
          {stage === "idle" && "Click the mic and describe your product in any Indian language"}
          {stage === "recording" && "Speak clearly — click the square button to stop recording"}
          {stage === "processing" && "Sending audio to AI service..."}
          {stage === "transcribing" && "Converting artisan's voice into transcript..."}
          {stage === "translating" && "Translate (Hindi/English) in progress..."}
          {stage === "extracting" && "Generating Product Catalog & Price Prediction..."}
          {stage === "done" && "✅ Product Catalog & Price Prediction generated! Review and save below."}
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg text-sm text-left mx-auto max-w-md"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>Error: </strong>{error}
              {error.includes("AI service") && (
                <div className="mt-1 text-xs" style={{ color: "#f87171", opacity: 0.8 }}>
                  Run: <code>cd AI && uvicorn main:app --reload</code>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pipeline progress */}
      {!["idle", "recording"].includes(stage) && (
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4 text-sm" style={{ fontFamily: "Outfit", color: "#c4a882" }}>
            AI PIPELINE PROGRESS
          </h3>
          <div className="space-y-3">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={step.label} className={`pipeline-step ${currentStageIdx === i ? "active" : ""} ${currentStageIdx > i ? "done" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                  currentStageIdx > i ? "bg-emerald-500/20 text-emerald-400" :
                  currentStageIdx === i ? "gradient-saffron text-white" :
                  ""
                }`} style={currentStageIdx < i ? { background: "rgba(255,255,255,0.05)", color: "#7d6548" } : {}}>
                  {currentStageIdx > i ? <Check size={14} /> : step.icon}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ fontFamily: "Outfit", color: currentStageIdx >= i ? "#f5efe6" : "#7d6548" }}>
                    {step.label}
                  </div>
                  <div className="text-xs" style={{ color: "#7d6548" }}>{step.desc}</div>
                </div>
                {currentStageIdx === i && <Loader2 size={16} className="animate-spin" style={{ color: "#f97316" }} />}
                {currentStageIdx > i && <Check size={16} style={{ color: "#34d399" }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results panels */}
      {result && stage === "done" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ASR Transcript */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} style={{ color: "#f97316" }} />
              <h3 className="font-bold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                Voice Transcript
              </h3>
              {result.asr?.detected_language && (
                <span className="badge badge-saffron text-xs ml-auto">
                  {LANG_NAMES[result.asr.detected_language] || result.asr.detected_language}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ color: "#c4a882", background: "var(--bg-dark-3)", fontFamily: "Noto Sans Devanagari, sans-serif" }}>
              {result.asr?.transcript || "—"}
            </p>
            {result.asr?.confidence && (
              <div className="mt-2 text-xs" style={{ color: "#7d6548" }}>
                Confidence: <span style={{ color: "#34d399" }}>{Math.round(result.asr.confidence * 100)}%</span>
              </div>
            )}
          </div>

          {/* Translation */}
          {result.translation?.was_translated && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <ChevronRight size={16} style={{ color: "#818cf8" }} />
                <h3 className="font-bold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                  Translated to English
                </h3>
              </div>
              <p className="text-sm leading-relaxed p-3 rounded-lg" style={{ color: "#c4a882", background: "var(--bg-dark-3)" }}>
                {result.translation.translated}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── AI-Generated Product Specification (Bilingual) ── */}
      {editedProduct && stage === "done" && (
        <div className="glass-card p-6" style={{ position: "relative", overflow: "hidden" }}>
          {/* Decorative background accent */}
          <div style={{
            position: "absolute", top: -60, right: -60, width: 180, height: 180,
            borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.08), transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, rgba(249,115,22,0.25), rgba(234,88,12,0.15))",
              border: "1px solid rgba(249,115,22,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={18} style={{ color: "#f97316" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 className="font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6", fontSize: 16 }}>
                AI-Generated Product Specification
              </h3>
              <div style={{ fontSize: 11, color: "#7d6548" }}>
                {String(editedProduct.ai_engine || "Qwen2.5-3B-Instruct")} · Bilingual EN + HI
              </div>
            </div>
            <span className="badge badge-green">
              <Check size={10} /> Auto-Generated
            </span>
          </div>

          {/* ── Bilingual Title Block ── */}
          <div style={{
            marginBottom: 20,
            padding: "16px 18px",
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(249,115,22,0.07), rgba(129,140,248,0.04))",
            border: "1px solid rgba(249,115,22,0.2)",
          }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#f97316", letterSpacing: 1, marginBottom: 4 }}>
                ENGLISH TITLE
              </div>
              <input
                className="input-dark"
                style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 15, color: "#f5efe6" }}
                value={String(editedProduct.name || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#818cf8", letterSpacing: 1, marginBottom: 4 }}>
                हिंदी शीर्षक
              </div>
              <input
                className="input-dark"
                style={{ fontFamily: "Noto Sans Devanagari, sans-serif", fontWeight: 600, fontSize: 15, color: "#c4a882" }}
                value={String(editedProduct.name_hindi || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, name_hindi: e.target.value })}
              />
            </div>
          </div>

          {/* ── Meta Row: Category / Region / Technique / Price ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 20 }}>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-dark-3)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 9, color: "#7d6548", fontFamily: "Outfit", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>CATEGORY</div>
              <select
                className="input-dark"
                style={{ padding: "4px 6px", fontSize: 12, background: "transparent", border: "none", color: "#f5efe6", width: "100%" }}
                value={String(editedProduct.category || "other")}
                onChange={(e) => setEditedProduct({ ...editedProduct, category: e.target.value })}
              >
                {["textiles","pottery","jewelry","woodwork","metalwork","paintings","leather","bamboo","stone","other"].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-dark-3)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 9, color: "#7d6548", fontFamily: "Outfit", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>ORIGIN REGION</div>
              <input
                className="input-dark"
                style={{ padding: "4px 6px", fontSize: 12, background: "transparent", border: "none", color: "#f5efe6", width: "100%" }}
                value={String(editedProduct.originRegion || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, originRegion: e.target.value })}
              />
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-dark-3)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 9, color: "#7d6548", fontFamily: "Outfit", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>CRAFT TECHNIQUE</div>
              <input
                className="input-dark"
                style={{ padding: "4px 6px", fontSize: 11, background: "transparent", border: "none", color: "#f5efe6", width: "100%" }}
                value={String(editedProduct.craftTechnique || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, craftTechnique: e.target.value })}
              />
            </div>
            <div style={{
              padding: "10px 12px", borderRadius: 10,
              background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.07))",
              border: "1px solid rgba(16,185,129,0.3)",
            }}>
              <div style={{ fontSize: 9, color: "#34d399", fontFamily: "Outfit", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>SUGGESTED PRICE ₹</div>
              <input
                type="number"
                className="input-dark"
                style={{ padding: "4px 6px", fontSize: 14, fontWeight: 700, background: "transparent", border: "none", color: "#34d399", width: "100%" }}
                value={String(editedProduct.price || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, price: e.target.value })}
              />
            </div>
          </div>

          {/* ── Bilingual Description Block ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#f97316", letterSpacing: 1, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={11} /> ENGLISH DESCRIPTION
              </div>
              <textarea
                className="input-dark resize-none"
                rows={4}
                style={{ lineHeight: 1.7, fontSize: 13 }}
                value={String(editedProduct.description || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })}
              />
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#818cf8", letterSpacing: 1, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Globe size={11} /> हिंदी विवरण
              </div>
              <textarea
                className="input-dark resize-none"
                rows={4}
                style={{ lineHeight: 1.8, fontSize: 13, fontFamily: "Noto Sans Devanagari, sans-serif", color: "#c4a882" }}
                value={String(editedProduct.description_hi || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, description_hi: e.target.value })}
              />
            </div>
          </div>

          {/* ── Key Features ── */}
          {Array.isArray(editedProduct.key_features) && (editedProduct.key_features as string[]).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#c4a882", letterSpacing: 1, marginBottom: 8 }}>
                ✨ KEY FEATURES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(editedProduct.key_features as string[]).map((feat: string, i: number) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "8px 12px", borderRadius: 8,
                    background: "var(--bg-dark-3)", border: "1px solid var(--border-subtle)",
                  }}>
                    <Check size={12} style={{ color: "#34d399", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: 12, color: "#c4a882", lineHeight: 1.5 }}>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Materials / Colors / Tags Row ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#c4a882", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                MATERIALS (comma separated)
              </label>
              <input
                className="input-dark"
                value={String(editedProduct.materials || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, materials: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#c4a882", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                COLORS
              </label>
              <input
                className="input-dark"
                value={String(editedProduct.colors || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, colors: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#c4a882", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                <Tag size={10} className="inline mr-1" /> TAGS
              </label>
              <input
                className="input-dark"
                value={String(editedProduct.tags || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, tags: e.target.value })}
              />
            </div>
          </div>

          {/* ── Dimensions + Care Instructions ── */}
          {(editedProduct.dimensions || editedProduct.care_instructions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
              {editedProduct.dimensions && (
                <div>
                  <label style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#c4a882", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                    DIMENSIONS
                  </label>
                  <input
                    className="input-dark"
                    value={String(editedProduct.dimensions || "")}
                    onChange={(e) => setEditedProduct({ ...editedProduct, dimensions: e.target.value })}
                  />
                </div>
              )}
              {editedProduct.care_instructions && (
                <div>
                  <label style={{ fontSize: 10, fontFamily: "Outfit", fontWeight: 700, color: "#c4a882", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                    CARE INSTRUCTIONS
                  </label>
                  <input
                    className="input-dark"
                    value={String(editedProduct.care_instructions || "")}
                    onChange={(e) => setEditedProduct({ ...editedProduct, care_instructions: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Confidence Bar ── */}
          {result?.extraction?.confidence && (
            <div className="flex items-center gap-3 text-xs" style={{ color: "#7d6548", marginBottom: 20 }}>
              <span style={{ whiteSpace: "nowrap" }}>AI Confidence:</span>
              <div style={{ flex: 1, height: 4, borderRadius: 4, background: "var(--bg-dark-3)" }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  width: `${result.extraction.confidence * 100}%`,
                  background: result.extraction.confidence > 0.7
                    ? "linear-gradient(90deg, #10b981, #34d399)"
                    : "linear-gradient(90deg, #f97316, #fb923c)",
                  transition: "width 0.8s ease",
                }} />
              </div>
              <span style={{ color: result.extraction.confidence > 0.7 ? "#34d399" : "#f97316", fontWeight: 700 }}>
                {Math.round(result.extraction.confidence * 100)}%
              </span>
            </div>
          )}

          {/* ── ONBOARDING: Continue to Price Prediction ── */}
          {isOnboardingMode && (
            <div style={{
              padding: "18px 20px",
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))",
              border: "1px solid rgba(16,185,129,0.4)",
            }}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontFamily: "Outfit", fontWeight: 700, color: "#10b981", marginBottom: 4 }}>
                  ✅ Voice Pipeline Complete!
                </div>
                <div style={{ fontSize: 12, color: "#c4a882" }}>
                  Product specifications extracted. Now let AI predict the optimal price using your product image + specs.
                </div>
              </div>

              {onboardingContinueCountdown !== null && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "#7d6548", marginBottom: 4 }}>Auto-navigating to AI Price Prediction in...</div>
                  <div style={{ fontSize: 28, fontFamily: "Outfit", fontWeight: 900, color: "#f97316" }}>
                    {onboardingContinueCountdown}s
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (countdownRef.current) clearInterval(countdownRef.current);
                  pipelineHook.completeVoiceStep({
                    name: String(editedProduct?.name || ""),
                    category: String(editedProduct?.category || ""),
                    description: String(editedProduct?.description || ""),
                    materials: String(editedProduct?.materials || ""),
                    tags: String(editedProduct?.tags || ""),
                    craftTechnique: String(editedProduct?.craftTechnique || ""),
                    price_hint: Number(editedProduct?.price) || null,
                    transcript: result?.asr?.transcript,
                    detectedLanguage: result?.asr?.detected_language,
                  });
                  router.push("/onboarding/price-prediction");
                }}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 20px", borderRadius: 12,
                  background: "linear-gradient(135deg, #f97316, #ea580c)",
                  border: "none", cursor: "pointer", color: "white",
                  fontSize: 14, fontFamily: "Outfit", fontWeight: 700,
                  boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
                }}
              >
                <TrendingUp size={16} />
                Continue to AI Price Prediction
                <ArrowRight size={16} />
              </button>
              <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#7d6548" }}>
                Step 3 of 4: SigLIP + TabPFN multimodal price prediction →
              </div>
            </div>
          )}

          {/* Standard action buttons (non-onboarding) */}
          {!isOnboardingMode && (
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setStage("idle"); setResult(null); setEditedProduct(null); setSaved(false); }}
                className="btn-ghost flex items-center gap-2 px-4 py-2.5">
                <RefreshCw size={15} /> Record Again
              </button>
              <button onClick={handleSaveProduct} disabled={saved}
                className="btn-primary flex items-center gap-2 px-6 py-2.5">
                <span className="relative z-10 flex items-center gap-2">
                  {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Product</>}
                </span>
              </button>
            </div>
          )}

          {saved && !isOnboardingMode && (
            <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: "#34d399" }}>
              <Check size={14} /> Product saved! <a href="/products" style={{ color: "#f97316", textDecoration: "underline" }}>View Products →</a>
            </div>
          )}
        </div>
      )}

      {/* Example prompts */}
      {stage === "idle" && (
        <div className="glass-card p-5">
          <h3 className="font-bold mb-4 text-sm" style={{ fontFamily: "Outfit", color: "#c4a882" }}>
            💡 EXAMPLE DESCRIPTIONS (Try saying these)
          </h3>
          <div className="space-y-3">
            {EXAMPLE_PROMPTS.map((ex) => (
              <div key={ex.lang} className="p-3 rounded-lg" style={{ background: "var(--bg-dark-3)", border: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{ex.flag}</span>
                  <span className="badge badge-saffron text-xs">{ex.lang}</span>
                </div>
                <p className="text-sm" style={{ color: "#c4a882", fontFamily: "Noto Sans Devanagari, sans-serif" }}>
                  "{ex.text}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

