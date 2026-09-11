"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import {
  Upload, X, Scissors, Sparkles, Download, RefreshCw,
  ImageIcon, Loader2, Check, AlertCircle, Wand2, Eye
} from "lucide-react";

type ProcessStep = "original" | "bg-removed" | "enhanced" | "ecommerce";

interface ProcessedImage {
  original: string;
  bgRemoved?: string;
  enhanced?: string;
  ecommerce?: string;
}

export default function AIStudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [images, setImages] = useState<ProcessedImage | null>(null);
  const [activeView, setActiveView] = useState<ProcessStep>("original");
  const [error, setError] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setPreview(URL.createObjectURL(accepted[0]));
      setImages(null);
      setError("");
      setActiveView("original");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  });

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("ks_token")}`,
  });

  const removeBackground = async () => {
    if (!file) return;
    setProcessing("bg");
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await axios.post("http://localhost:5000/api/ai/image/remove-bg", formData, {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
        responseType: "blob",
        timeout: 120000,
      });
      const url = URL.createObjectURL(res.data);
      setImages((prev) => ({ ...prev, original: preview!, bgRemoved: url }));
      setActiveView("bg-removed");
    } catch {
      setError("Background removal failed. Make sure AI service is running.");
    } finally {
      setProcessing(null);
    }
  };

  const enhanceImage = async () => {
    if (!file) return;
    setProcessing("enhance");
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await axios.post("http://localhost:5000/api/ai/image/enhance", formData, {
        headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
        responseType: "blob",
        timeout: 120000,
      });
      const url = URL.createObjectURL(res.data);
      setImages((prev) => ({ ...prev, original: preview!, enhanced: url }));
      setActiveView("enhanced");
    } catch {
      setError("Image enhancement failed. Make sure AI service is running.");
    } finally {
      setProcessing(null);
    }
  };

  const downloadImage = (src: string, name: string) => {
    const link = document.createElement("a");
    link.href = src;
    link.download = name;
    link.click();
  };

  const VIEW_TABS: { key: ProcessStep; label: string; available: boolean }[] = [
    { key: "original", label: "Original", available: !!preview },
    { key: "bg-removed", label: "BG Removed", available: !!images?.bgRemoved },
    { key: "enhanced", label: "Enhanced", available: !!images?.enhanced },
  ];

  const currentImg = activeView === "original" ? preview
    : activeView === "bg-removed" ? images?.bgRemoved
    : activeView === "enhanced" ? images?.enhanced
    : images?.ecommerce;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="badge badge-indigo">AI Powered</span>
          <span className="badge badge-saffron">CUDA Accelerated</span>
        </div>
        <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
          🖼️ AI Product Photo Studio
        </h1>
        <p style={{ color: "#c4a882" }}>
          Turn your phone photos into professional e-commerce product images.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload zone */}
        <div className="space-y-4">
          <div {...getRootProps()} className={`upload-zone p-8 text-center transition-all ${isDragActive ? "drag-active" : ""}`}
            style={{ minHeight: 200 }}>
            <input {...getInputProps()} id="studio-upload" />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Upload preview" className="max-h-48 mx-auto rounded-lg object-contain" />
                <button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                  onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); setImages(null); }}>
                  <X size={14} style={{ color: "white" }} />
                </button>
              </div>
            ) : (
              <div>
                <Upload size={36} className="mx-auto mb-3" style={{ color: isDragActive ? "#f97316" : "#7d6548" }} />
                <p className="font-semibold" style={{ fontFamily: "Outfit", color: isDragActive ? "#f97316" : "#c4a882" }}>
                  {isDragActive ? "Drop it here!" : "Upload Product Photo"}
                </p>
                <p className="text-sm mt-1" style={{ color: "#7d6548" }}>
                  Drag & drop or click · JPG, PNG, WEBP · Max 20MB
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Action buttons */}
          {file && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={removeBackground} disabled={!!processing}
                className="glass-card glass-card-hover p-4 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid rgba(249,115,22,0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  {processing === "bg" ? <Loader2 size={18} className="animate-spin" style={{ color: "#f97316" }} /> : <Scissors size={18} style={{ color: "#f97316" }} />}
                  <span className="font-semibold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>Remove BG</span>
                </div>
                <p className="text-xs" style={{ color: "#7d6548" }}>
                  {processing === "bg" ? "Processing with U2Net..." : "Transparent background PNG"}
                </p>
                {images?.bgRemoved && <Check size={12} style={{ color: "#34d399" }} className="mt-1" />}
              </button>

              <button onClick={enhanceImage} disabled={!!processing}
                className="glass-card glass-card-hover p-4 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="flex items-center gap-2 mb-1">
                  {processing === "enhance" ? <Loader2 size={18} className="animate-spin" style={{ color: "#818cf8" }} /> : <Sparkles size={18} style={{ color: "#818cf8" }} />}
                  <span className="font-semibold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>Enhance</span>
                </div>
                <p className="text-xs" style={{ color: "#7d6548" }}>
                  {processing === "enhance" ? "Denoising & sharpening..." : "2x upscale, sharpen, denoise"}
                </p>
                {images?.enhanced && <Check size={12} style={{ color: "#34d399" }} className="mt-1" />}
              </button>
            </div>
          )}

          {/* Processing steps */}
          {file && (
            <div className="glass-card p-4">
              <h4 className="text-xs font-semibold mb-3" style={{ fontFamily: "Outfit", color: "#c4a882" }}>
                HOW IT WORKS
              </h4>
              <div className="space-y-2">
                {[
                  { icon: "📸", step: "Upload phone photo of your product" },
                  { icon: "✂️", step: "Remove background with U2Net AI (rembg)" },
                  { icon: "✨", step: "Auto-enhance: denoise, sharpen, white-balance" },
                  { icon: "📦", step: "Download e-commerce ready 1024×1024 image" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span>{s.icon}</span>
                    <span style={{ color: "#c4a882" }}>{s.step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Result preview */}
        <div className="space-y-4">
          {/* View tabs */}
          <div className="flex gap-2">
            {VIEW_TABS.filter((t) => t.available).map((tab) => (
              <button key={tab.key}
                onClick={() => setActiveView(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === tab.key ? "gradient-saffron text-white" : "btn-ghost"}`}
                style={{ fontFamily: "Outfit" }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ background: activeView === "bg-removed" ? "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 20px 20px" : "var(--bg-dark-3)", minHeight: 320 }}>
            {currentImg ? (
              <img src={currentImg} alt="Result" className="max-w-full max-h-80 object-contain" />
            ) : processing ? (
              <div className="text-center p-8">
                <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "#f97316" }} />
                <p style={{ color: "#c4a882" }}>
                  {processing === "bg" ? "Removing background..." : "Enhancing image quality..."}
                </p>
                <p className="text-sm mt-2" style={{ color: "#7d6548" }}>Running AI on RTX 4050...</p>
              </div>
            ) : (
              <div className="text-center p-8">
                <ImageIcon size={48} className="mx-auto mb-3" style={{ color: "#7d6548" }} />
                <p style={{ color: "#7d6548" }}>Upload an image to get started</p>
              </div>
            )}
          </div>

          {currentImg && currentImg !== preview && (
            <button onClick={() => downloadImage(currentImg, `karigarsetu-${activeView}.${activeView === "bg-removed" ? "png" : "jpg"}`)}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              <span className="relative z-10 flex items-center gap-2">
                <Download size={16} /> Download {VIEW_TABS.find((t) => t.key === activeView)?.label}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
