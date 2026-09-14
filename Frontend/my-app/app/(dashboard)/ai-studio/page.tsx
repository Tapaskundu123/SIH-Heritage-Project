"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import {
  Upload, X, Scissors, Sparkles, Download, RefreshCw,
  ImageIcon, Loader2, Check, AlertCircle, Wand2, Zap,
  ChevronRight, Info, ShoppingBag, Layers, Eye, EyeOff,
  ArrowRight, ShieldCheck, CheckCircle2, Mic, TrendingUp,
  Camera, SwitchCamera, Video
} from "lucide-react";
import { useOnboardingPipeline } from "../../hooks/use-onboarding-pipeline";
import OnboardingPipelineBanner from "../../components/onboarding-pipeline-banner";

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
  const router = useRouter();
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

  // ── Camera & Photo Input states ──────────────────────────────────────────
  const [inputTab, setInputTab] = useState<"upload" | "camera">("upload");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraLoading(false);
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment" = facingMode) => {
    setCameraError(null);
    setCameraLoading(true);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {}
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No camera device was found on this system. You can use the Upload Image option.");
      } else if (err.name === "NotReadableError") {
        setCameraError("Camera is currently in use by another application.");
      } else {
        setCameraError(err?.message || "Failed to start camera.");
      }
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  }, [facingMode]);

  const switchCamera = useCallback(() => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  }, [facingMode, startCamera]);

  const captureImage = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 200);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `camera-product-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setFile(capturedFile);
        const objUrl = URL.createObjectURL(blob);
        setPreview(objUrl);
        setImages(null);
        setError("");
        setActiveView("original");
        setPipeline({ stage: 0, done: [] });
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  }, [stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Target product integration (when opened from /products or /products/[id])
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const [targetProductName, setTargetProductName] = useState<string | null>(null);
  const [attachingToProduct, setAttachingToProduct] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState(false);

  // ── Onboarding pipeline integration ──────────────────────────────────────
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [onboardingContinueCountdown, setOnboardingContinueCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pipelineHook = useOnboardingPipeline();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const pid = params.get("productId");
      const pname = params.get("productName");
      const onboarding = params.get("onboarding");
      if (pid) setTargetProductId(pid);
      if (pname) setTargetProductName(pname);
      if (onboarding === "1" || pipelineHook.isOnboarding) setIsOnboardingMode(true);
    }
  }, [pipelineHook.isOnboarding]);

  // Auto-navigate countdown to Voice Cataloger after pipeline done in onboarding mode
  const startOnboardingCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setOnboardingContinueCountdown(4);
    countdownRef.current = setInterval(() => {
      setOnboardingContinueCountdown((c) => {
        if (c === null || c <= 1) {
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  // Trigger navigation safely in useEffect when countdown hits 0 (avoids setState during render error)
  useEffect(() => {
    if (onboardingContinueCountdown === 0) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setOnboardingContinueCountdown(null);
      router.push("/voice-cataloger?onboarding=1");
    }
  }, [onboardingContinueCountdown, router]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
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

  const resetFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    stopCamera();
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

      const finalImages: ProcessedImages = {
        original: preview!,
        bgRemoved: bgRemovedUrl,
        enhanced: enhancedUrl,
        ecommerce: ecomUrl,
      };

      setImages(finalImages);
      setActiveView("ecommerce");
      setPipeline({ stage: 0, done: [1, 2, 3] });

      // ── Onboarding: save images to pipeline state and start countdown ──
      if (isOnboardingMode) {
        pipelineHook.completeImageStep({
          original: preview!,
          bgRemoved: bgRemovedUrl,
          enhanced: enhancedUrl,
          ecommerce: ecomUrl,
        });
        startOnboardingCountdown();
      }
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

  const isPipelineDone = images?.ecommerce !== undefined || (pipeline.done.length === 3);

  return (
    <div className="max-w-6xl mx-auto space-y-6 page-enter" style={{ padding: isOnboardingMode ? "0 0 100px" : "0 0 40px" }}>
      {/* Onboarding Banner */}
      {isOnboardingMode && <OnboardingPipelineBanner />}

      {/* ── Onboarding Welcome Banner ── */}
      {isOnboardingMode && (
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.06))",
            border: "1px solid rgba(249,115,22,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(249,115,22,0.2)",
              border: "1px solid rgba(249,115,22,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#f97316",
            }}
          >
            <Sparkles size={22} className="animate-spin" style={{ animationDuration: "6s" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontFamily: "Outfit", fontWeight: 700, color: "#f97316", marginBottom: 3 }}>
              🎉 Welcome! Step 1 of 4 — AI Photo Studio
            </div>
            <div style={{ fontSize: 12, color: "#c4a882" }}>
              Upload your product photo. Our AI will remove the background, enhance it, and create a professional e-commerce image automatically.
            </div>
          </div>
          {/* Step indicator */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {["image", "voice", "pricing", "catalog"].map((s, i) => (
              <div
                key={s}
                style={{
                  width: i === 0 ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === 0 ? "#f97316" : "rgba(255,255,255,0.1)",
                  transition: "all 0.3s",
                }}
              />
            ))}
          </div>
        </div>
      )}

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

          {/* Mode Selector Tabs (Upload Image vs Open Camera) */}
          {!preview && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                padding: 4,
                background: "rgba(30, 23, 18, 0.6)",
                border: "1px solid rgba(245, 190, 130, 0.12)",
                borderRadius: 14,
              }}
            >
              <button
                type="button"
                id="studio-tab-upload"
                onClick={() => {
                  stopCamera();
                  setInputTab("upload");
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: inputTab === "upload" ? "1px solid #f97316" : "1px solid transparent",
                  background: inputTab === "upload" ? "rgba(249, 115, 22, 0.16)" : "transparent",
                  color: inputTab === "upload" ? "#fb923c" : "var(--text-secondary)",
                  fontFamily: "Outfit",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                }}
              >
                <Upload size={16} />
                Upload Image
              </button>

              <button
                type="button"
                id="studio-tab-camera"
                onClick={() => {
                  setInputTab("camera");
                  if (!isCameraActive) {
                    startCamera();
                  }
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: inputTab === "camera" ? "1px solid #818cf8" : "1px solid transparent",
                  background: inputTab === "camera" ? "rgba(129, 140, 248, 0.16)" : "transparent",
                  color: inputTab === "camera" ? "#a5b4fc" : "var(--text-secondary)",
                  fontFamily: "Outfit",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                }}
              >
                <Camera size={16} />
                Open Camera & Click Image
              </button>
            </div>
          )}

          {/* If an image is already selected/captured */}
          {preview ? (
            <div className="glass-card" style={{ padding: 12, overflow: "hidden" }}>
              <div style={{ position: "relative", width: "100%", height: 260, borderRadius: 12, overflow: "hidden", background: "var(--bg-dark-3)" }}>
                <img
                  src={preview}
                  alt="Product preview"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
                <button
                  id="studio-clear-btn"
                  onClick={resetFile}
                  title="Remove image"
                  style={{
                    position: "absolute", top: 10, right: 10,
                    width: 30, height: 30, borderRadius: "50%",
                    background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", transition: "all 0.2s",
                  }}
                >
                  <X size={15} />
                </button>
                <div style={{
                  position: "absolute", bottom: 10, left: 10,
                  background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
                  borderRadius: 8, padding: "4px 10px",
                  fontSize: 11, color: "#f5efe6", fontFamily: "Outfit",
                  display: "flex", alignItems: "center", gap: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                  <span style={{ color: "#fb923c", fontWeight: 600 }}>Active:</span>
                  {file?.name || "image.jpg"} · {file ? (file.size / 1024).toFixed(0) : "0"}KB
                </div>
              </div>

              {/* Action buttons to upload different or click new with camera */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  id="studio-change-upload-btn"
                  onClick={() => {
                    resetFile();
                    setInputTab("upload");
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(245, 190, 130, 0.15)",
                    background: "rgba(249, 115, 22, 0.08)",
                    color: "#f5efe6",
                    fontSize: 12,
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Upload size={13} color="#f97316" />
                  Upload Different
                </button>

                <button
                  type="button"
                  id="studio-change-camera-btn"
                  onClick={() => {
                    resetFile();
                    setInputTab("camera");
                    startCamera();
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(129, 140, 248, 0.25)",
                    background: "rgba(129, 140, 248, 0.08)",
                    color: "#f5efe6",
                    fontSize: 12,
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Camera size={13} color="#818cf8" />
                  Click New Photo
                </button>
              </div>
            </div>
          ) : inputTab === "upload" ? (
            /* Option 1: Upload Zone */
            <div
              {...getRootProps()}
              id="studio-upload-zone"
              className={`upload-zone transition-all cursor-pointer ${isDragActive ? "drag-active" : ""}`}
              style={{ padding: 0, minHeight: 260, position: "relative", overflow: "hidden" }}
            >
              <input {...getInputProps()} id="studio-file-input" />
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, padding: 24, textAlign: "center" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: isDragActive ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 14, transition: "all 0.3s",
                }}>
                  <Upload size={28} color={isDragActive ? "#f97316" : "#fb923c"} />
                </div>
                <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color: isDragActive ? "#f97316" : "var(--text-primary)", marginBottom: 6 }}>
                  {isDragActive ? "Drop product photo here!" : isOnboardingMode ? "📸 Upload Product Photo" : "Upload Product Photo"}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16, maxWidth: 260 }}>
                  Drag & drop your file or click to browse · JPG, PNG, WEBP · Max 20MB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInputTab("camera");
                    startCamera();
                  }}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 20,
                    background: "rgba(129, 140, 248, 0.12)",
                    border: "1px solid rgba(129, 140, 248, 0.3)",
                    color: "#a5b4fc",
                    fontSize: 12,
                    fontFamily: "Outfit",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <Camera size={14} />
                  Or Open Camera & Click Image
                </button>
              </div>
            </div>
          ) : (
            /* Option 2: Camera Capture View */
            <div
              className="glass-card"
              style={{
                minHeight: 260,
                position: "relative",
                overflow: "hidden",
                border: "1px solid rgba(129, 140, 248, 0.25)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {isCameraActive ? (
                /* Active Viewfinder */
                <div style={{ position: "relative", width: "100%", height: 300, background: "#050404" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />

                  {/* Viewfinder frame corners */}
                  <div style={{ position: "absolute", top: 16, left: 16, width: 22, height: 22, borderTop: "2px solid #f97316", borderLeft: "2px solid #f97316" }} />
                  <div style={{ position: "absolute", top: 16, right: 16, width: 22, height: 22, borderTop: "2px solid #f97316", borderRight: "2px solid #f97316" }} />
                  <div style={{ position: "absolute", bottom: 64, left: 16, width: 22, height: 22, borderBottom: "2px solid #f97316", borderLeft: "2px solid #f97316" }} />
                  <div style={{ position: "absolute", bottom: 64, right: 16, width: 22, height: 22, borderBottom: "2px solid #f97316", borderRight: "2px solid #f97316" }} />

                  {/* Top bar controls */}
                  <div style={{
                    position: "absolute", top: 10, left: 10, right: 10,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
                      padding: "4px 10px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: 11, color: "#34d399", fontWeight: 700, fontFamily: "Outfit",
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
                      LIVE CAMERA
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      {hasMultipleCameras && (
                        <button
                          type="button"
                          onClick={switchCamera}
                          title="Switch Camera"
                          style={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.2)",
                            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <SwitchCamera size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={stopCamera}
                        title="Close Camera"
                        style={{
                          width: 30, height: 30, borderRadius: "50%",
                          background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.2)",
                          color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Shutter Flash effect */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "white",
                      opacity: shutterFlash ? 0.9 : 0,
                      pointerEvents: "none",
                      transition: "opacity 0.2s ease-out",
                    }}
                  />

                  {/* Bottom Shutter Controls */}
                  <div style={{
                    position: "absolute", bottom: 12, left: 0, right: 0,
                    display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
                  }}>
                    <button
                      type="button"
                      id="studio-click-image-btn"
                      onClick={captureImage}
                      style={{
                        padding: "10px 24px",
                        borderRadius: 24,
                        background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                        color: "white",
                        fontFamily: "Outfit",
                        fontWeight: 700,
                        fontSize: 14,
                        border: "2px solid rgba(255,255,255,0.85)",
                        boxShadow: "0 4px 20px rgba(249, 115, 22, 0.5)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Camera size={17} />
                      Click Image
                    </button>
                  </div>
                </div>
              ) : cameraLoading ? (
                /* Loading spinner */
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, padding: 24 }}>
                  <Loader2 size={36} className="animate-spin" color="#f97316" style={{ marginBottom: 12 }} />
                  <p style={{ fontFamily: "Outfit", fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                    Starting Camera...
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Please grant camera permission in your browser
                  </p>
                </div>
              ) : (
                /* Camera Standby Card */
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 260, padding: 24, textAlign: "center" }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: "rgba(129, 140, 248, 0.12)",
                    border: "1px solid rgba(129, 140, 248, 0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 14,
                  }}>
                    <Camera size={30} color="#818cf8" />
                  </div>
                  <p style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>
                    Live Camera Studio
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 18, maxWidth: 280 }}>
                    Click below to open your camera, align your product in the viewfinder, and click the image.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}>
                    <button
                      type="button"
                      id="studio-open-camera-btn"
                      onClick={() => startCamera()}
                      className="btn-primary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "11px 28px",
                        fontSize: 14,
                        width: "auto",
                      }}
                    >
                      <Camera size={17} />
                      Open Camera
                    </button>

                    <button
                      type="button"
                      onClick={() => setInputTab("upload")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: 12,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Or switch back to Upload Image
                    </button>
                  </div>
                </div>
              )}

              {/* Camera Error Alert */}
              {cameraError && (
                <div style={{
                  padding: 12,
                  margin: 10,
                  borderRadius: 10,
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#fca5a5",
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{cameraError}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: "#ef4444",
                        color: "white",
                        border: "none",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "Outfit",
                        fontWeight: 600,
                      }}
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCameraError(null);
                        setInputTab("upload");
                      }}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.1)",
                        color: "white",
                        border: "none",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "Outfit",
                      }}
                    >
                      Use Upload Instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                  : isOnboardingMode ? "✨ Run Full Pipeline & Continue →" : "Run Full Pipeline"}
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

          {/* ── ONBOARDING SUCCESS BANNER ── */}
          {isOnboardingMode && isPipelineDone && !processing && images && (
            <div
              style={{
                padding: "20px 24px",
                borderRadius: 16,
                background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))",
                border: "1px solid rgba(16,185,129,0.4)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(16,185,129,0.2)",
                    border: "2px solid rgba(16,185,129,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#10b981",
                  }}
                >
                  <Check size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontFamily: "Outfit", fontWeight: 700, color: "#10b981" }}>
                    ✅ AI Studio Complete!
                  </div>
                  <div style={{ fontSize: 12, color: "#c4a882" }}>
                    Your product image has been professionally processed.
                  </div>
                </div>
              </div>

              {/* Auto-navigate countdown */}
              {onboardingContinueCountdown !== null && (
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "#7d6548", marginBottom: 4 }}>
                    Auto-navigating to Voice Cataloger in...
                  </div>
                  <div style={{ fontSize: 28, fontFamily: "Outfit", fontWeight: 900, color: "#f97316" }}>
                    {onboardingContinueCountdown}s
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    if (countdownRef.current) clearInterval(countdownRef.current);
                    router.push("/voice-cataloger?onboarding=1");
                  }}
                  style={{
                    flex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 20px", borderRadius: 12,
                    background: "linear-gradient(135deg, #f97316, #ea580c)",
                    border: "none", cursor: "pointer", color: "white",
                    fontSize: 14, fontFamily: "Outfit", fontWeight: 700,
                    boxShadow: "0 4px 20px rgba(249,115,22,0.4)",
                    transition: "all 0.2s",
                  }}
                >
                  <Mic size={16} />
                  Continue to Voice Cataloger
                  <ArrowRight size={16} />
                </button>
              </div>

              <div style={{ marginTop: 10, textAlign: "center" }}>
                <span style={{ fontSize: 11, color: "#7d6548" }}>
                  Step 2 of 4: Describe your product in your language →
                </span>
              </div>
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
                        <><Loader2 size={16} className="animate-spin" /> Attaching to Product...</>
                      ) : attachSuccess ? (
                        <><Check size={16} /> Attached to {targetProductName || "Product"}!</>
                      ) : (
                        <><Sparkles size={16} /> Save & Attach Studio Images to {targetProductName || "Product"}</>
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

