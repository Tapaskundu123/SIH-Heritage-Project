"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Mic, AlertCircle } from "lucide-react";
import axios from "axios";

const CRAFTS = [
  "Weaving", "Pottery", "Embroidery", "Woodwork",
  "Metalwork", "Jewelry", "Painting", "Leatherwork", "Stone Carving", "Bamboo Craft", "Other"
];

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Gujarat", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan",
  "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Other"
];

const LANGUAGES = [
  { code: "hi", label: "हिंदी (Hindi)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "or", label: "ଓଡ଼ିଆ (Odia)" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "en", label: "English" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    region: "", state: "", craftType: "other", preferredLanguage: "hi",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 2-step registration

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", {
        ...form,
        craftType: form.craftType.toLowerCase().replace(" ", ""),
      });
      if (res.data.success) {
        localStorage.setItem("ks_token", res.data.data.token);
        localStorage.setItem("ks_user", JSON.stringify(res.data.data.user));
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex gradient-hero mandala-bg">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative">
        <div className="absolute top-0 left-0 right-0 bottom-0 opacity-20"
          style={{ background: "radial-gradient(circle at 50% 50%, #f97316, transparent 70%)" }} />
        <div className="relative text-center">
          <div className="w-20 h-20 rounded-2xl gradient-saffron flex items-center justify-center mx-auto mb-6 glow-saffron float-anim">
            <span className="text-white font-black text-3xl" style={{ fontFamily: "Outfit" }}>KS</span>
          </div>
          <h2 className="text-4xl font-black mb-4" style={{ fontFamily: "Outfit" }}>
            Karigar<span style={{ color: "#f97316" }}>Setu</span>
          </h2>
          <p className="text-lg" style={{ color: "#c4a882" }}>
            AI Business Manager for Indian Artisans
          </p>

          <div className="mt-12 space-y-4 text-left max-w-sm">
            {[
              "🎙️ Voice-based product cataloging in 12+ languages",
              "🖼️ AI photo studio — professional images from phone photos",
              "💰 Dynamic pricing based on market data",
              "🛍️ B2B marketplace for bulk buyers",
              "📦 Smart inventory management",
            ].map((feat) => (
              <div key={feat} className="flex items-start gap-3 text-sm" style={{ color: "#c4a882" }}>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="glass-card p-8">
            {/* Header */}
            <div className="mb-8">
              <Link href="/" className="flex items-center gap-2 mb-6 lg:hidden">
                <div className="w-7 h-7 rounded-lg gradient-saffron flex items-center justify-center">
                  <span className="text-white font-bold text-xs">KS</span>
                </div>
                <span className="font-bold" style={{ fontFamily: "Outfit" }}>
                  Karigar<span style={{ color: "#f97316" }}>Setu</span>
                </span>
              </Link>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>
                {step === 1 ? "Create Account" : "Your Craft Profile"}
              </h1>
              <p className="text-sm mt-1" style={{ color: "#c4a882" }}>
                {step === 1 ? "Join thousands of artisans selling online" : "Tell us about your craft"}
              </p>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      step >= s ? "gradient-saffron text-white" : "text-gray-500"
                    }`} style={{ background: step < s ? "rgba(255,255,255,0.05)" : undefined }}>
                      {s}
                    </div>
                    {s === 1 && <div className="w-16 h-0.5 rounded" style={{ background: step >= 2 ? "#f97316" : "rgba(255,255,255,0.1)" }} />}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Full Name</label>
                  <input id="reg-name" type="text" placeholder="आपका नाम / Your Name" value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="input-dark" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Email</label>
                  <input id="reg-email" type="email" placeholder="email@example.com" value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="input-dark" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Mobile Number</label>
                  <input id="reg-phone" type="tel" placeholder="+91 98765 43210" value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="input-dark" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Password</label>
                  <div className="relative">
                    <input id="reg-password" type={showPass ? "text" : "password"} placeholder="Min 6 characters" value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="input-dark pr-12" />
                    <button className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      onClick={() => setShowPass(!showPass)}
                      style={{ color: "#7d6548" }}
                      type="button">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2"
                  onClick={() => setStep(2)}
                  disabled={!form.name || !form.email || !form.phone || !form.password.length}>
                  <span className="relative z-10 flex items-center gap-2">
                    Next — Craft Profile <ArrowRight size={16} />
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Your Craft / Trade</label>
                  <select id="reg-craft" value={form.craftType}
                    onChange={(e) => handleChange("craftType", e.target.value)}
                    className="input-dark" style={{ cursor: "pointer" }}>
                    {CRAFTS.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>State</label>
                  <select id="reg-state" value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="input-dark" style={{ cursor: "pointer" }}>
                    <option value="">Select State</option>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>District / Region</label>
                  <input id="reg-region" type="text" placeholder="e.g. Varanasi, Jaipur, Kanchipuram" value={form.region}
                    onChange={(e) => handleChange("region", e.target.value)}
                    className="input-dark" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    <Mic size={14} className="inline mr-1" style={{ color: "#f97316" }} />
                    Preferred Language
                  </label>
                  <select id="reg-language" value={form.preferredLanguage}
                    onChange={(e) => handleChange("preferredLanguage", e.target.value)}
                    className="input-dark" style={{ cursor: "pointer" }}>
                    {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button className="btn-ghost py-3 px-4" onClick={() => setStep(1)}>← Back</button>
                  <button id="reg-submit" className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                    onClick={handleSubmit} disabled={loading || !form.state || !form.region}>
                    <span className="relative z-10">
                      {loading ? "Creating Account..." : "Create Account 🚀"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-sm mt-6" style={{ color: "#7d6548" }}>
              Already registered?{" "}
              <Link href="/auth/login" className="font-medium transition-colors" style={{ color: "#f97316" }}>
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
