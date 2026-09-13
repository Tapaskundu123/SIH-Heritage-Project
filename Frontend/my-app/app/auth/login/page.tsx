"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";
import axios from "axios";
import { useOnboardingPipeline } from "../../hooks/use-onboarding-pipeline";

export default function LoginPage() {
  const router = useRouter();
  const { startOnboarding } = useOnboardingPipeline();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectByRole = (role?: string) => {
    if (role === "admin") {
      router.push("/admin");
    } else if (role === "buyer") {
      router.push("/marketplace");
    } else {
      // Artisans: start the guided onboarding pipeline and redirect to upload image page (AI Studio)
      startOnboarding();
      router.push("/ai-studio?onboarding=1");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form);
      if (res.data.success && res.data.data?.token) {
        const userObj = res.data.data.user;
        const resolvedRole = userObj?.role || "artisan";
        const finalUser = { ...userObj, role: resolvedRole };
        localStorage.setItem("ks_token", res.data.data.token);
        localStorage.setItem("ks_user", JSON.stringify(finalUser));
        redirectByRole(resolvedRole);
      } else {
        setError(res.data.message || "Invalid credentials");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Login failed. Please verify your email and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero mandala-bg p-6">
      {/* Ambient glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="w-16 h-16 rounded-2xl gradient-saffron flex items-center justify-center mx-auto mb-4 glow-saffron">
              <span className="text-white font-black text-2xl" style={{ fontFamily: "Outfit" }}>KS</span>
            </div>
          </Link>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
            Sign In to KarigarSetu
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#c4a882" }}>
            Authorized portal for Artisans, Buyers &amp; Administrators
          </p>
        </div>

        <div className="glass-card p-8 border border-white/10 shadow-2xl">
          {error && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg mb-5 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}
            >
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-dark pr-10"
                  required
                />
                <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-dark pr-12"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  onClick={() => setShowPass(!showPass)}
                  style={{ color: "#7d6548" }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                id="login-submit"
                type="submit"
                className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 font-bold shadow-lg shadow-amber-500/20"
                disabled={loading}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? "Authenticating..." : "Sign In to Your Account"} <ArrowRight size={16} />
                </span>
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-white/10 text-center text-sm" style={{ color: "#7d6548" }}>
            Don&#39;t have an account?{" "}
            <Link href="/auth/register" className="font-semibold text-amber-500 hover:text-amber-400 transition-colors">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
