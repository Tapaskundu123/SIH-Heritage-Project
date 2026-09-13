"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Mic, AlertCircle, Sparkles, ShoppingBag, ShieldCheck } from "lucide-react";
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
  const [role, setRole] = useState<"artisan" | "buyer">("artisan");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    region: "",
    state: "",
    craftType: "weaving",
    preferredLanguage: "hi",
    // Buyer specific
    street: "",
    city: "",
    pincode: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        role,
      };

      if (role === "artisan") {
        payload.craftType = form.craftType.toLowerCase().replace(/\s+/g, "");
        payload.region = form.region;
        payload.state = form.state;
        payload.preferredLanguage = form.preferredLanguage;
      } else {
        payload.region = form.city;
        payload.state = form.state;
        payload.shippingAddress = {
          street: form.street,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        };
      }

      const res = await axios.post("http://localhost:5000/api/auth/register", payload);
      if (res.data.success) {
        const registeredUser = {
          ...res.data.data.user,
          role: res.data.data.user?.role || role,
        };
        localStorage.setItem("ks_token", res.data.data.token);
        localStorage.setItem("ks_user", JSON.stringify(registeredUser));

        if (role === "artisan") {
          router.push("/dashboard");
        } else {
          router.push("/marketplace");
        }
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
        <div
          className="absolute top-0 left-0 right-0 bottom-0 opacity-20"
          style={{ background: "radial-gradient(circle at 50% 50%, #f97316, transparent 70%)" }}
        />
        <div className="relative text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl gradient-saffron flex items-center justify-center mx-auto mb-6 glow-saffron float-anim">
            <span className="text-white font-black text-3xl" style={{ fontFamily: "Outfit" }}>KS</span>
          </div>
          <h2 className="text-4xl font-black mb-4" style={{ fontFamily: "Outfit" }}>
            Karigar<span style={{ color: "#f97316" }}>Setu</span>
          </h2>
          <p className="text-lg mb-8" style={{ color: "#c4a882" }}>
            Bridging Authentic Indian Artisans with National & Global Buyers
          </p>

          <div className="space-y-4 text-left p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(249,115,22,0.15)" }}>
            <div className="flex items-start gap-3">
              <Sparkles size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">For Artisans & Karigars</p>
                <p className="text-xs text-amber-200/70">Voice cataloging, AI studio, order fulfillment & instant earnings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShoppingBag size={20} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">For Customers & Buyers</p>
                <p className="text-xs text-blue-200/70">GI-tagged verified crafts, secure payments & real-time live tracking.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white">Verified Heritage Quality</p>
                <p className="text-xs text-emerald-200/70">Admin-verified artisan identities & authentic direct-from-weaver prices.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="glass-card p-8">
            {/* Header */}
            <div className="mb-6">
              <Link href="/" className="flex items-center gap-2 mb-4 lg:hidden">
                <div className="w-7 h-7 rounded-lg gradient-saffron flex items-center justify-center">
                  <span className="text-white font-bold text-xs">KS</span>
                </div>
                <span className="font-bold" style={{ fontFamily: "Outfit" }}>
                  Karigar<span style={{ color: "#f97316" }}>Setu</span>
                </span>
              </Link>

              <h1 className="text-2xl font-bold" style={{ fontFamily: "Outfit" }}>
                {step === 1 ? "Choose Your Role & Sign Up" : role === "artisan" ? "Artisan Craft Profile" : "Buyer Delivery Details"}
              </h1>
              <p className="text-sm mt-1" style={{ color: "#c4a882" }}>
                {step === 1
                  ? "Select how you would like to participate in KarigarSetu"
                  : role === "artisan"
                  ? "Tell us about your handcraft and region"
                  : "Where should your handcrafted orders be delivered?"}
              </p>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mt-4">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        step >= s ? "gradient-saffron text-white" : "text-gray-500"
                      }`}
                      style={{ background: step < s ? "rgba(255,255,255,0.05)" : undefined }}
                    >
                      {s}
                    </div>
                    {s === 1 && (
                      <div
                        className="w-16 h-0.5 rounded"
                        style={{ background: step >= 2 ? "#f97316" : "rgba(255,255,255,0.1)" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg mb-4 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
              >
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            {step === 1 ? (
              <div className="space-y-4">
                {/* Role Switcher Tabs */}
                <div>
                  <label className="block text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "#c4a882" }}>
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("artisan")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === "artisan"
                          ? "border-amber-500 bg-amber-500/15 shadow-md shadow-amber-500/10"
                          : "border-white/10 bg-white/5 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="text-xl mb-1">🧵</div>
                      <div className="text-sm font-bold text-white">Artisan / Karigar</div>
                      <div className="text-xs text-amber-300/80 mt-0.5">Upload products, sell & earn</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("buyer")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === "buyer"
                          ? "border-blue-500 bg-blue-500/15 shadow-md shadow-blue-500/10"
                          : "border-white/10 bg-white/5 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="text-xl mb-1">🛍️</div>
                      <div className="text-sm font-bold text-white">Customer / Buyer</div>
                      <div className="text-xs text-blue-300/80 mt-0.5">Shop, pay & track orders</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    placeholder="आपका नाम / Your Name"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    Email Address
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    Mobile Number
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showPass ? "text" : "password"}
                      placeholder="Minimum 6 characters"
                      value={form.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className="input-dark pr-12"
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      onClick={() => setShowPass(!showPass)}
                      style={{ color: "#7d6548" }}
                      type="button"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-4"
                  onClick={() => setStep(2)}
                  disabled={!form.name || !form.email || !form.phone || form.password.length < 6}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Next — {role === "artisan" ? "Craft Profile" : "Delivery Details"} <ArrowRight size={16} />
                  </span>
                </button>
              </div>
            ) : role === "artisan" ? (
              /* Artisan Step 2 */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    Your Craft / Trade
                  </label>
                  <select
                    id="reg-craft"
                    value={form.craftType}
                    onChange={(e) => handleChange("craftType", e.target.value)}
                    className="input-dark"
                    style={{ cursor: "pointer" }}
                  >
                    {CRAFTS.map((c) => (
                      <option key={c} value={c.toLowerCase()}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    State of Origin
                  </label>
                  <select
                    id="reg-state"
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="input-dark"
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">Select State</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    Cluster / District / City
                  </label>
                  <input
                    id="reg-region"
                    type="text"
                    placeholder="e.g. Varanasi, Jaipur, Kanchipuram"
                    value={form.region}
                    onChange={(e) => handleChange("region", e.target.value)}
                    className="input-dark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    <Mic size={14} className="inline mr-1" style={{ color: "#f97316" }} />
                    Preferred Voice & Catalog Language
                  </label>
                  <select
                    id="reg-language"
                    value={form.preferredLanguage}
                    onChange={(e) => handleChange("preferredLanguage", e.target.value)}
                    className="input-dark"
                    style={{ cursor: "pointer" }}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="btn-ghost py-3 px-4" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button
                    id="reg-submit"
                    className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                    onClick={handleSubmit}
                    disabled={loading || !form.state || !form.region}
                  >
                    <span className="relative z-10">
                      {loading ? "Registering Artisan..." : "Complete Registration 🚀"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* Buyer Step 2 */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    Street Address / House No.
                  </label>
                  <input
                    id="reg-street"
                    type="text"
                    placeholder="Apartment, Street, Locality"
                    value={form.street}
                    onChange={(e) => handleChange("street", e.target.value)}
                    className="input-dark"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                      City / District
                    </label>
                    <input
                      id="reg-city"
                      type="text"
                      placeholder="e.g. Mumbai, Bengaluru"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      className="input-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                      Pincode
                    </label>
                    <input
                      id="reg-pincode"
                      type="text"
                      placeholder="e.g. 400001"
                      value={form.pincode}
                      onChange={(e) => handleChange("pincode", e.target.value)}
                      className="input-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                    State
                  </label>
                  <select
                    id="reg-buyer-state"
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    className="input-dark"
                    style={{ cursor: "pointer" }}
                  >
                    <option value="">Select Delivery State</option>
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button className="btn-ghost py-3 px-4" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button
                    id="reg-submit-buyer"
                    className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                    onClick={handleSubmit}
                    disabled={loading || !form.street || !form.city || !form.state}
                  >
                    <span className="relative z-10">
                      {loading ? "Creating Account..." : "Start Shopping 🛍️"}
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
