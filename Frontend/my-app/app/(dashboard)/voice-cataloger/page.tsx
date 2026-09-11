"use client";

import { useState, useRef, useCallback } from "react";
import axios from "axios";
import {
  Mic, MicOff, Square, Play, Pause, ChevronRight,
  Check, RefreshCw, Save, AlertCircle, Sparkles, Globe,
  FileText, Tag, Package, DollarSign, Loader2
} from "lucide-react";

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
    translated: string;
    was_translated: boolean;
  };
  extraction?: {
    name: string;
    category: string;
    materials: string[];
    colors: string[];
    craft_technique?: string;
    price_hint?: number;
    tags: string[];
    description_en: string;
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
  recording: "Recording...",
  processing: "Processing audio...",
  transcribing: "Whisper ASR — Transcribing...",
  translating: "NLLB — Translating...",
  extracting: "Flan-T5 — Extracting product info...",
  done: "Done!",
  error: "Error occurred",
};

const STAGE_INDEX: Record<PipelineStage, number> = {
  idle: -1, recording: -1, processing: 0,
  transcribing: 0, translating: 1, extracting: 2, done: 3, error: -1
};

const PIPELINE_STEPS = [
  { icon: "📝", label: "Whisper ASR", desc: "Transcription" },
  { icon: "🌐", label: "NLLB", desc: "Translation" },
  { icon: "🧠", label: "Flan-T5", desc: "Extraction" },
  { icon: "✅", label: "Done!", desc: "Ready to save" },
];

const EXAMPLE_PROMPTS = [
  { lang: "Hindi", text: "मेरे पास बनारसी रेशम की साड़ी है, लाल और सुनहरे रंग में, हाथ से बुनी हुई, कीमत 3500 रुपये।", flag: "🇮🇳" },
  { lang: "Tamil", text: "கஞ்சிவரம் பட்டு புடவை, தங்க நூல் வேலை, பாரம்பரிய முறையில் நெய்யப்பட்டது.", flag: "🇮🇳" },
  { lang: "Bengali", text: "মসলিন কাপড়ের শাড়ি, ঢাকাই জামদানি, হাতে বোনা, সূক্ষ্ম নকশা।", flag: "🇮🇳" },
];

export default function VoiceCatalogerPage() {
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [editedProduct, setEditedProduct] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

      const res = await axios.post("http://localhost:5000/api/ai/voice/transcribe", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000,
      });

      if (res.data.success) {
        const pipeline = res.data.data.pipeline;
        setResult(pipeline);
        setEditedProduct({
          name: pipeline.extraction?.name || "",
          category: pipeline.extraction?.category || "other",
          description: pipeline.extraction?.description_en || "",
          materials: pipeline.extraction?.materials?.join(", ") || "",
          tags: pipeline.extraction?.tags?.join(", ") || "",
          price: pipeline.extraction?.price_hint || "",
          craftTechnique: pipeline.extraction?.craft_technique || "",
        });
        setStage("done");
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
      await axios.post("http://localhost:5000/api/products", {
        ...editedProduct,
        materials: String(editedProduct?.materials || "").split(",").map((m: string) => m.trim()).filter(Boolean),
        tags: String(editedProduct?.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean),
        price: Number(editedProduct?.price) || 0,
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-saffron">⭐ Most Important</span>
          <span className="badge badge-indigo">AI Pipeline</span>
        </div>
        <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
          🎙️ Multilingual Voice Cataloger
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
          {stage === "transcribing" && "Whisper model is converting your speech to text..."}
          {stage === "translating" && "NLLB-200 translating to English..."}
          {stage === "extracting" && "Flan-T5 extracting product information..."}
          {stage === "done" && "✅ Your product catalog has been generated! Review and save below."}
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

      {/* Extracted Product Info — Editable */}
      {editedProduct && stage === "done" && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles size={18} style={{ color: "#f97316" }} />
            <h3 className="font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
              AI-Extracted Product Information
            </h3>
            <span className="badge badge-green ml-auto">
              <Check size={10} /> Auto-filled
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                <Package size={12} className="inline mr-1" /> Product Name
              </label>
              <input className="input-dark" value={String(editedProduct.name || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                Category
              </label>
              <select className="input-dark" value={String(editedProduct.category || "other")}
                onChange={(e) => setEditedProduct({ ...editedProduct, category: e.target.value })}>
                {["textiles", "pottery", "jewelry", "woodwork", "metalwork", "paintings", "leather", "bamboo", "stone", "other"].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                <FileText size={12} className="inline mr-1" /> Description
              </label>
              <textarea className="input-dark resize-none" rows={3}
                value={String(editedProduct.description || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                Materials (comma separated)
              </label>
              <input className="input-dark" value={String(editedProduct.materials || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, materials: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                <DollarSign size={12} className="inline mr-1" /> Suggested Price (₹)
              </label>
              <input type="number" className="input-dark" value={String(editedProduct.price || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, price: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                <Tag size={12} className="inline mr-1" /> Tags (comma separated)
              </label>
              <input className="input-dark" value={String(editedProduct.tags || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, tags: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                Craft Technique
              </label>
              <input className="input-dark" value={String(editedProduct.craftTechnique || "")}
                onChange={(e) => setEditedProduct({ ...editedProduct, craftTechnique: e.target.value })} />
            </div>
          </div>

          {/* Confidence badge */}
          {result?.extraction?.confidence && (
            <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: "#7d6548" }}>
              AI Extraction Confidence:
              <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--bg-dark-3)" }}>
                <div className="h-full rounded-full" style={{
                  width: `${result.extraction.confidence * 100}%`,
                  background: result.extraction.confidence > 0.7 ? "#10b981" : "#f97316",
                }} />
              </div>
              <span style={{ color: result.extraction.confidence > 0.7 ? "#34d399" : "#f97316" }}>
                {Math.round(result.extraction.confidence * 100)}%
              </span>
            </div>
          )}

          {/* Action buttons */}
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

          {saved && (
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
