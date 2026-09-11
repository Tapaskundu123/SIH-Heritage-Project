"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Mic } from "lucide-react";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", form);
      if (res.data.success) {
        localStorage.setItem("ks_token", res.data.data.token);
        localStorage.setItem("ks_user", JSON.stringify(res.data.data.user));
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero mandala-bg p-6">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <div className="w-16 h-16 rounded-2xl gradient-saffron flex items-center justify-center mx-auto mb-4 glow-saffron">
              <span className="text-white font-black text-2xl" style={{ fontFamily: "Outfit" }}>KS</span>
            </div>
          </Link>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
            Welcome Back
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#c4a882" }}>
            Login to manage your craft business
          </p>
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg mb-5 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-dark"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder="Your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-dark pr-12"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  onClick={() => setShowPass(!showPass)}
                  style={{ color: "#7d6548" }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
              disabled={loading}>
              <span className="relative z-10">
                {loading ? "Logging in..." : "Login to Dashboard"}
              </span>
            </button>
          </form>

          <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.1)", color: "#c4a882" }}>
            <Mic size={12} className="inline mr-1" style={{ color: "#f97316" }} />
            <strong style={{ color: "#f97316" }}>Demo:</strong> Use email <code>demo@artisan.com</code> password <code>demo123</code>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: "#7d6548" }}>
            New artisan?{" "}
            <Link href="/auth/register" className="font-medium" style={{ color: "#f97316" }}>
              Register here — it&#39;s free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
