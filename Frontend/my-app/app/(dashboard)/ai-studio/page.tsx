"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import {
  Upload, X, Scissors, Sparkles, Download, RefreshCw,
  ImageIcon, Loader2, Check, AlertCircle, Wand2, Zap,
  ChevronRight, Info, ShoppingBag, Layers, Eye, EyeOff,
  ArrowRight, ShieldCheck, CheckCircle2
} from "lucide-react";

// AI service runs on port 8000 directly
const AI_BASE = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:8000";

type ProcessStep = "original" | "bg-removed" | "enhanced" | "ecommerce";
type Operation = "remove_bg" | "enhance" | "ecommerce" | "all";

interface PipelineStage {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  color: string;
}

interface ProcessedImages {
  original: string;
  bgRemoved?: string;
  enhanced?: string;
  ecommerce?: string;
}

interface PipelineProgress {
  stage: number;   // 0 = idle, 1 = bg, 2 = enhance, 3 = ecom
  done: number[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "bg",
    label: "Background Removal",
    sublabel: "Clean subject separation",
    icon: <Scissors size={14} />,
    color: "#f97316",
  },
  {
    id: "enhance",
    label: "Image Enhancer",
    sublabel: "Contrast & lighting",
    icon: <Zap size={14} />,
    color: "#818cf8",
  },
  {
    id: "ecom",
    label: "final Product Image",
    sublabel: "Studio ready canvas",
    icon: <ShoppingBag size={14} />,
    color: "#10b981",
  },
];

const OPERATIONS: { id: Operation; label: string; desc: string; icon: React.ReactNode; accent: string; steps: string[] }[] = [
  {
    id: "remove_bg",
    label: "Background Removal",
    desc: "Clean transparent PNG with sharp subject isolation",
    icon: <Scissors size={18} />,
    accent: "#f97316",
    steps: ["Subject separation", "Edge refinement", "Clean transparent PNG"],
  },
  {
    id: "enhance",
    label: "Image Enhancer",
    desc: "Adaptive lighting, true-color vibrancy, and detail sharpening",
    icon: <Sparkles size={18} />,
    accent: "#818cf8",
    steps: ["Adaptive lighting", "Color vibrancy", "Noise reduction", "Detail sharpening"],
  },
  {
    id: "all",
    label: "Full Image Pipeline",
    desc: "Upload product Image → Background Removal → Image Enhancer → final Product Image",
    icon: <Layers size={18} />,
    accent: "#10b981",
    steps: ["Upload product Image", "Background Removal", "Image Enhancer", "final Product Image"],
  },
];

export default function AIStudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [operation, setOperation] = useState<Operation>("all");
  const [processing, setProcessing] = useState(false);
  const [images, setImages] = useState<ProcessedImages | null>(null);
  const [activeView, setActiveView] = useState<ProcessStep>("original");
  const [error, setError] = useState("");
  const [pipeline, setPipeline] = useState<PipelineProgress>({ stage: 0, done: [] });
  const [bgBackdrop, setBgBackdrop] = useState<"checker" | "white" | "dark" | "cream">("checker");
  const [peekOriginal, setPeekOriginal] = useState(false);

  // Target product integration (when opened from /products or /products/[id])
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const [targetProductName, setTargetProductName] = useState<string | null>(null);
  const [attachingToProduct, setAttachingToProduct] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get("productId");
      const pname = params.get("productName");
      if (pid) setTargetProductId(pid);
      if (pname) setTargetProductName(pname);
    }
  }, []);

  const handleAttachToProduct = async () => {
    if (!targetProductId || !images) return;
    setAttachingToProduct(true);
    setAttachSuccess(false);
    setError("");
    try {
      const token = localStorage.getItem("ks_token");
      const imagesToAttach = [];
      if (images.ecommerce) {
        imagesToAttach.push({ url: images.ecommerce, isOriginal: false, isEnhanced: true, isBgRemoved: false });
      }
      if (images.bgRemoved) {
        imagesToAttach.push({ url: images.bgRemoved, isOriginal: false, isEnhanced: false, isBgRemoved: true });
      }
      if (images.enhanced) {
        imagesToAttach.push({ url: images.enhanced, isOriginal: false, isEnhanced: true, isBgRemoved: false });
      }
      if (images.original) {
        imagesToAttach.push({ url: images.original, isOriginal: true, isEnhanced: false, isBgRemoved: false });
      }

      await axios.post(
        `http://localhost:5000/api/products/${targetProductId}/images`,
        { images: imagesToAttach },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setAttachSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to attach studio images to product");
    } finally {
      setAttachingToProduct(false);
    }
  };

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("ks_token") || ""}`,
  });

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setPreview(URL.createObjectURL(accepted[0]));
      setImages(null);
      setError("");
      setActiveView("original");
      setPipeline({ stage: 0, done: [] });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  });

  const resetFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    setImages(null);
    setError("");
    setPipeline({ stage: 0, done: [] });
  };

  // ---- Single operations ----
  const runRemoveBg = async () => {
    if (!file) return;
    setProcessing(true);
    setPipeline({ stage: 1, done: [] });
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(`${AI_BASE}/ai/image/remove-bg`, fd, {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
        responseType: "blob",
        timeout: 120000,
      });
      const url = URL.createObjectURL(res.data);
      setImages((p) => ({ ...p, original: preview!, bgRemoved: url }));
      setActiveView("bg-removed");
      setPipeline({ stage: 0, done: [1] });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Background removal failed — is the AI service running on port 8000?");
      setPipeline({ stage: 0, done: [] });
    } finally {
      setProcessing(false);
    }
  };

  const runEnhance = async () => {
    if (!file) return;
    setProcessing(true);
    setPipeline({ stage: 2, done: [] });
    setError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(`${AI_BASE}/ai/image/enhance`, fd, {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
        responseType: "blob",
        timeout: 120000,
      });
      const url = URL.createObjectURL(res.data);
      setImages((p) => ({ ...p, original: preview!, enhanced: url }));
      setActiveView("enhanced");
      setPipeline({ stage: 0, done: [2] });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Enhancement failed — is the AI service running on port 8000?");
      setPipeline({ stage: 0, done: [] });
    } finally {
      setProcessing(false);
    }
  };

  const runFullPipeline = async () => {
    if (!file) return;
    setProcessing(true);
    setError("");
    setPipeline({ stage: 1, done: [] });

    try {
      // Animate stage progression
      const stageDelay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const fd = new FormData();
      fd.append("image", file);

      // Kick off the request
      const promise = axios.post(`${AI_BASE}/ai/image/process-complete`, fd, {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
        timeout: 180000,
      });

      // Animate stages while waiting (estimated timing)
      await stageDelay(3000);
      setPipeline({ stage: 2, done: [1] });
      await stageDelay(4000);
      setPipeline({ stage: 3, done: [1, 2] });

      const res = await promise;
      const data = res.data.data;

      const bgRemovedUrl = `data:image/png;base64,${data.no_background}`;
      const enhancedUrl = `data:image/jpeg;base64,${data.enhanced}`;
      const ecomUrl = `data:image/jpeg;base64,${data.ecommerce_ready}`;

      setImages({
        original: preview!,
        bgRemoved: bgRemovedUrl,
        enhanced: enhancedUrl,
        ecommerce: ecomUrl,
      });
      setActiveView("ecommerce");
      setPipeline({ stage: 0, done: [1, 2, 3] });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Pipeline failed — is the AI service running on port 8000?");
      setPipeline({ stage: 0, done: [] });
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = () => {
    if (operation === "remove_bg") return runRemoveBg();
    if (operation === "enhance") return runEnhance();
    return runFullPipeline();
  };

  // ---- Download ----
  const downloadImage = (src: string, name: string) => {
    const a = document.createElement("a");
    a.href = src;
    a.download = name;
    a.click();
  };

  // ---- View tabs ----
  const VIEW_TABS: { key: ProcessStep; label: string; available: boolean; color?: string }[] = [
    { key: "original", label: "Original", available: !!preview },
    { key: "bg-removed", label: "BG Removed", available: !!images?.bgRemoved, color: "#f97316" },
    { key: "enhanced", label: "Enhanced", available: !!images?.enhanced, color: "#818cf8" },
    { key: "ecommerce", label: "E-Commerce ✨", available: !!images?.ecommerce, color: "#10b981" },
  ];

  const currentImg =
    activeView === "original" ? preview
    : activeView === "bg-removed" ? images?.bgRemoved
    : activeView === "enhanced" ? images?.enhanced
    : images?.ecommerce;

  const displayImg = peekOriginal && images?.original ? images.original : currentImg;

  return (
    <div className="max-w-6xl mx-auto space-y-6 page-enter" style={{ padding: "0 0 40px" }}>
      {/* ---- Page Header ---- */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="badge badge-indigo">AI Powered</span>
          <span className="badge badge-saffron">Background Removal + Image Enhancer</span>
          <span className="badge badge-green">Studio Quality</span>
        </div>
        <h1 className="text-4xl font-black mb-2 gradient-text" style={{ fontFamily: "Outfit" }}>
          AI Product Studio
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          Transform phone photos into professional e-commerce images with automatic background removal and studio enhancement.
        </p>
      </div>

      {/* Target Product Context Banner */}
      {targetProductId && (
        <div className="glass-card p-4 border border-[#f97316]/50 bg-[#f97316]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/20 border border-[#f97316]/40 flex items-center justify-center text-[#f97316] flex-shrink-0">
              <Sparkles size={20} className="animate-spin" style={{ animationDuration: "8s" }} />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#f97316]">
                Target Product Connected
              </div>
              <div className="text-base font-bold text-[#f5efe6]">
                Adding studio photos for: <span className="text-[#fb923c]">{targetProductName || "Selected Product"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Link href={`/products/${targetProductId}`}>
              <button className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5">
                View Product <ArrowRight size={13} />
              </button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ======== LEFT PANEL ======== */}
        <div className="lg:col-span-2 space-y-4">

          {/* Upload Zone */}
          <div
            {...getRootProps()}
            id="studio-upload-zone"
            className={`upload-zone transition-all cursor-pointer ${isDragActive ? "drag-active" : ""}`}
            style={{ padding: 0, minHeight: 220, position: "relative", overflow: "hidden" }}
          >
            <input {...getInputProps()} id="studio-file-input" />
            {preview ? (
              <div style={{ position: "relative", width: "100%", height: 220 }}>
                <img
                  src={preview}
                  alt="Uploaded product"
                  style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 14, background: "var(--bg-dark-3)" }}
                />
                <button
                  id="studio-clear-btn"
                  onClick={resetFile}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    width: 28, height: 28, borderRadius: "50%",
                    background: "rgba(0,0,0,0.65)", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <X size={14} color="white" />
                </button>
                <div style={{
                  position: "absolute", bottom: 10, left: 10,
                  background: "rgba(0,0,0,0.6)", borderRadius: 8, padding: "3px 10px",
                  fontSize: 11, color: "#c4a882", fontFamily: "Outfit",
                }}>
                  {file?.name} · {(file!.size / 1024).toFixed(0)}KB
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 220, padding: 24 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: isDragActive ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 16, transition: "all 0.3s",
                }}>
                  <Upload size={28} color={isDragActive ? "#f97316" : "#7d6548"} />
                </div>
                <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 15, color: isDragActive ? "#f97316" : "var(--text-primary)", marginBottom: 6 }}>
                  {isDragActive ? "Drop to upload!" : "Upload Product Photo"}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                  Drag & drop or click · JPG, PNG, WEBP · Max 20MB
                </p>
              </div>
            )}
          </div>

          {/* Operation Selector */}
          {file && (
            <div className="glass-card" style={{ padding: 16 }}>
              <p style={{ fontSize: 11, fontFamily: "Outfit", fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Processing Mode
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {OPERATIONS.map((op) => (
                  <button
                    key={op.id}
                    id={`studio-op-${op.id}`}
                    onClick={() => setOperation(op.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                      border: `1px solid ${operation === op.id ? op.accent + "50" : "rgba(196,168,130,0.1)"}`,
                      background: operation === op.id ? `${op.accent}10` : "transparent",
                      transition: "all 0.2s", textAlign: "left",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: operation === op.id ? `${op.accent}25` : "rgba(196,168,130,0.06)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: operation === op.id ? op.accent : "var(--text-muted)",
                      transition: "all 0.2s",
                    }}>
                      {op.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 13, color: operation === op.id ? op.accent : "var(--text-primary)", marginBottom: 2 }}>
                        {op.label}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{op.desc}</p>
                    </div>
                    {operation === op.id && <ChevronRight size={14} color={op.accent} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Process button */}
          {file && !processing && (
            <button
              id="studio-process-btn"
              onClick={handleProcess}
              className="btn-primary w-full"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 24px", fontSize: 15 }}
            >
              <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                <Wand2 size={18} />
                {operation === "remove_bg" ? "Remove Background"
                  : operation === "enhance" ? "Enhance Image"
                  : "Run Full Pipeline"}
              </span>
            </button>
          )}

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13 }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              {error}
            </div>
          )}

          {/* How it works */}
          {file && (
            <div className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Info size={13} color="var(--text-muted)" />
                <p style={{ fontSize: 11, fontFamily: "Outfit", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  AI Pipeline
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {OPERATIONS.find(o => o.id === operation)?.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: OPERATIONS.find(o => o.id === operation)!.accent, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======== RIGHT PANEL ======== */}
        <div className="lg:col-span-3 space-y-4">

          {/* Pipeline Progress (during full pipeline) */}
          {processing && operation === "all" && (
            <div className="glass-card" style={{ padding: 20 }}>
              <p style={{ fontSize: 12, fontFamily: "Outfit", fontWeight: 600, color: "var(--text-muted)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Processing Pipeline
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {PIPELINE_STAGES.map((stage, i) => {
                  const stageNum = i + 1;
                  const isDone = pipeline.done.includes(stageNum);
                  const isActive = pipeline.stage === stageNum;
                  return (
                    <div
                      key={stage.id}
                      className={`pipeline-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        background: isDone ? "rgba(16,185,129,0.2)" : isActive ? `${stage.color}20` : "rgba(196,168,130,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: isDone ? "#10b981" : isActive ? stage.color : "var(--text-muted)",
                        transition: "all 0.4s",
                      }}>
                        {isDone ? <Check size={14} /> : isActive ? <Loader2 size={14} className="animate-spin" /> : stage.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 13, color: isDone ? "#10b981" : isActive ? stage.color : "var(--text-muted)" }}>
                          {stage.label}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{stage.sublabel}</p>
                      </div>
                      {isDone && <span style={{ fontSize: 11, color: "#10b981", fontFamily: "Outfit", fontWeight: 600 }}>Done</span>}
                      {isActive && <span style={{ fontSize: 11, color: stage.color, fontFamily: "Outfit", fontWeight: 600 }}>Running...</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single-op spinner */}
          {processing && operation !== "all" && (
            <div className="glass-card" style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Loader2 size={40} className="animate-spin" color="#f97316" />
              <p style={{ fontFamily: "Outfit", fontWeight: 600, color: "var(--text-primary)" }}>
                {operation === "remove_bg" ? "Removing background..." : "Enhancing image..."}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>This may take 15–60 seconds on first run</p>
            </div>
          )}

          {/* View tabs */}
          {!processing && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {VIEW_TABS.filter((t) => t.available).map((tab) => {
                  const isSelected = activeView === tab.key;
                  return (
                    <button
                      key={tab.key}
                      id={`studio-tab-${tab.key}`}
                      onClick={() => {
                        setActiveView(tab.key);
                        setPeekOriginal(false);
                      }}
                      style={{
                        padding: "7px 16px",
                        borderRadius: 10,
                        fontSize: 12,
                        fontFamily: "Outfit",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background: isSelected
                          ? (tab.color ? `${tab.color}20` : "rgba(249,115,22,0.15)")
                          : "rgba(255,255,255,0.03)",
                        color: isSelected
                          ? (tab.color || "#f97316")
                          : "var(--text-secondary)",
                        border: isSelected
                          ? `1px solid ${tab.color || "#f97316"}`
                          : "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {tab.key === "bg-removed" && <Scissors size={12} />}
                      {tab.key === "enhanced" && <Sparkles size={12} />}
                      {tab.key === "ecommerce" && <ShoppingBag size={12} />}
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- Professional Studio Viewport ---- */}
          {!processing && (
            <div
              style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  activeView === "bg-removed"
                    ? bgBackdrop === "white"
                      ? "#ffffff"
                      : bgBackdrop === "cream"
                      ? "#f8f5ee"
                      : bgBackdrop === "dark"
                      ? "#151518"
                      : "repeating-conic-gradient(#262629 0% 25%, #18181a 0% 50%) 0 0 / 20px 20px"
                    : activeView === "ecommerce"
                    ? "#ffffff"
                    : "var(--bg-dark-3)",
                minHeight: 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                userSelect: "none",
                padding: 24,
                transition: "background 0.3s ease",
              }}
            >
              {/* Floating Studio Toolbar */}
              {displayImg && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 14,
                    right: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {/* Status chip */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 20,
                      background: "rgba(18,18,22,0.8)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: peekOriginal ? "#f59e0b" : VIEW_TABS.find((t) => t.key === activeView)?.color || "#f5efe6",
                      fontSize: 11,
                      fontFamily: "Outfit",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: peekOriginal ? "#f59e0b" : VIEW_TABS.find((t) => t.key === activeView)?.color || "#f97316",
                      }}
                    />
                    {peekOriginal ? "Viewing Original Photo" : VIEW_TABS.find((t) => t.key === activeView)?.label}
                  </div>

                  {/* Right side studio tools */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
                    {/* Backdrop palette for BG-removed PNGs */}
                    {activeView === "bg-removed" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 10px",
                          borderRadius: 20,
                          background: "rgba(18,18,22,0.8)",
                          backdropFilter: "blur(12px)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "Outfit", marginRight: 2 }}>Canvas:</span>
                        {[
                          { id: "checker", label: "Transparent", bg: "repeating-conic-gradient(#666 0% 25%, #333 0% 50%) 0 0 / 6px 6px" },
                          { id: "white", label: "Pure White", bg: "#ffffff" },
                          { id: "cream", label: "Studio Cream", bg: "#f8f5ee" },
                          { id: "dark", label: "Charcoal", bg: "#151518" },
                        ].map((b) => (
                          <button
                            key={b.id}
                            title={b.label}
                            onClick={() => setBgBackdrop(b.id as any)}
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: b.bg,
                              border: bgBackdrop === b.id ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.3)",
                              cursor: "pointer",
                              padding: 0,
                              transform: bgBackdrop === b.id ? "scale(1.2)" : "scale(1)",
                              transition: "transform 0.15s",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Hold to Peek Original */}
                    {images?.original && activeView !== "original" && (
                      <button
                        onMouseDown={() => setPeekOriginal(true)}
                        onMouseUp={() => setPeekOriginal(false)}
                        onMouseLeave={() => setPeekOriginal(false)}
                        onTouchStart={() => setPeekOriginal(true)}
                        onTouchEnd={() => setPeekOriginal(false)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 12px",
                          borderRadius: 20,
                          background: peekOriginal ? "rgba(249,115,22,0.25)" : "rgba(18,18,22,0.8)",
                          backdropFilter: "blur(12px)",
                          border: peekOriginal ? "1px solid #f97316" : "1px solid rgba(255,255,255,0.1)",
                          color: peekOriginal ? "#f97316" : "var(--text-secondary)",
                          fontSize: 11,
                          fontFamily: "Outfit",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          userSelect: "none",
                        }}
                      >
                        {peekOriginal ? <EyeOff size={13} /> : <Eye size={13} />}
                        {peekOriginal ? "Original" : "Hold to Peek"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Full Image Display */}
              {displayImg ? (
                <img
                  src={displayImg}
                  alt={activeView}
                  style={{
                    maxWidth: "100%",
                    maxHeight: 480,
                    objectFit: "contain",
                    borderRadius: 6,
                    filter:
                      activeView === "bg-removed" && (bgBackdrop === "white" || bgBackdrop === "cream")
                        ? "drop-shadow(0 14px 28px rgba(0,0,0,0.15))"
                        : "none",
                    transition: "filter 0.25s ease",
                  }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <ImageIcon size={48} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
                  <p style={{ color: "var(--text-muted)", fontFamily: "Outfit" }}>
                    {file ? "Click a processing mode on the left to start" : "Upload an image to open studio"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ---- Download + All-outputs grid ---- */}
          {!processing && images && (
            <>
              {currentImg && currentImg !== preview && (
                <button
                  id="studio-download-btn"
                  onClick={() => downloadImage(currentImg, `karigarsetu-${activeView}.${activeView === "bg-removed" ? "png" : "jpg"}`)}
                  className="btn-primary w-full"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px 24px" }}
                >
                  <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                    <Download size={16} />
                    Download {VIEW_TABS.find((t) => t.key === activeView)?.label}
                    {activeView === "bg-removed" ? " (PNG)" : " (JPEG)"}
                  </span>
                </button>
              )}

              {/* Attach directly to target product */}
              {targetProductId && (
                <div className="glass-card p-4 border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} /> Attach Images to Product
                    </span>
                    <span className="text-[11px] text-[#c4a882]">{targetProductName || "Selected Product"}</span>
                  </div>

                  <button
                    id="studio-attach-product-btn"
                    onClick={handleAttachToProduct}
                    disabled={attachingToProduct || attachSuccess}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold text-sm"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {attachingToProduct ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Attaching to Product...
                        </>
                      ) : attachSuccess ? (
                        <>
                          <Check size={16} /> Attached to {targetProductName || "Product"}!
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Save & Attach Studio Images to {targetProductName || "Product"}
                        </>
                      )}
                    </span>
                  </button>

                  {attachSuccess && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-emerald-300">Images added to product gallery!</span>
                      <Link href={`/products/${targetProductId}`}>
                        <button className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1">
                          View in Product Details <ArrowRight size={12} />
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* All outputs thumbnail grid */}
              {(images.bgRemoved || images.enhanced || images.ecommerce) && (
                <div className="glass-card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 11, fontFamily: "Outfit", fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    All Outputs
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    {([
                      { key: "bg-removed" as ProcessStep, label: "BG Removed", src: images.bgRemoved, color: "#f97316", ext: "png" },
                      { key: "enhanced" as ProcessStep, label: "Enhanced", src: images.enhanced, color: "#818cf8", ext: "jpg" },
                      { key: "ecommerce" as ProcessStep, label: "E-Commerce", src: images.ecommerce, color: "#10b981", ext: "jpg" },
                    ]).filter(o => o.src).map((out) => (
                      <div key={out.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div
                          onClick={() => setActiveView(out.key)}
                          style={{
                            borderRadius: 10, overflow: "hidden", cursor: "pointer",
                            border: `2px solid ${activeView === out.key ? out.color : "transparent"}`,
                            background: out.key === "bg-removed"
                              ? "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 10px 10px"
                              : "var(--bg-dark-3)",
                            transition: "border-color 0.2s",
                          }}
                        >
                          <img src={out.src} alt={out.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "contain" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 10, color: out.color, fontFamily: "Outfit", fontWeight: 600 }}>{out.label}</span>
                          <button
                            id={`studio-dl-${out.key}`}
                            onClick={() => downloadImage(out.src!, `karigarsetu-${out.key}.${out.ext}`)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                          >
                            <Download size={12} color="var(--text-muted)" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
