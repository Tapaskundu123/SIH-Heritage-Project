"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mic, Image as ImageIcon, BarChart3, ShoppingBag, Package,
  Star, ArrowRight, Zap, Globe, Shield, ChevronRight,
  Sparkles, Users, TrendingUp, Award
} from "lucide-react";

const ROTATING_LANGUAGES = [
  { text: "अपनी कला बेचें", lang: "Hindi" },
  { text: "আপনার শিল্প বিক্রি করুন", lang: "Bengali" },
  { text: "உங்கள் கலையை விற்கவும்", lang: "Tamil" },
  { text: "మీ కళని అమ్మండి", lang: "Telugu" },
  { text: "तुमची कला विका", lang: "Marathi" },
  { text: "ਆਪਣੀ ਕਲਾ ਵੇਚੋ", lang: "Punjabi" },
  { text: "Sell Your Art", lang: "English" },
];

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Cataloger",
    description: "Describe your product in your language — Hindi, Tamil, Bengali, or any regional language. AI converts speech to professional catalog.",
    badge: "Most Used",
    color: "saffron",
    href: "/voice-cataloger",
  },
  {
    icon: ImageIcon,
    title: "AI Photo Studio",
    description: "Remove backgrounds, enhance lighting, and create e-commerce-ready images from simple phone photos.",
    badge: "Smart AI",
    color: "indigo",
    href: "/ai-studio",
  },
  {
    icon: BarChart3,
    title: "Dynamic Pricing",
    description: "Get data-driven price recommendations based on materials, labor, region, and market benchmarks.",
    badge: "Maximize Profit",
    color: "emerald",
    href: "/pricing",
  },
  {
    icon: ShoppingBag,
    title: "B2B Marketplace",
    description: "Connect directly with bulk buyers, exporters, and corporate gifting companies across India.",
    badge: "Nationwide",
    color: "terra",
    href: "/marketplace",
  },
  {
    icon: Package,
    title: "Smart Inventory",
    description: "Track stock levels with low-stock alerts. Never miss a sale due to inventory surprises.",
    badge: "Auto Alerts",
    color: "saffron",
    href: "/inventory",
  },
  {
    icon: Sparkles,
    title: "AI Catalog Writer",
    description: "Generate SEO-optimized, multilingual product descriptions from a voice note or image.",
    badge: "AI Powered",
    color: "indigo",
    href: "/products/new",
  },
];

const STATS = [
  { value: "12+", label: "Indian Languages", icon: Globe },
  { value: "100%", label: "Authentic GI Crafts", icon: Shield },
  { value: "6", label: "Smart Business Tools", icon: Zap },
  { value: "0%", label: "Middleman Commission", icon: Award },
];

const TESTIMONIALS = [
  {
    name: "Rekha Devi",
    craft: "Banarasi Silk Weaver, UP",
    text: "पहले फोटो और description बनाना बहुत मुश्किल था। अब बस बोलने से सब हो जाता है!",
    rating: 5,
    avatar: "R",
  },
  {
    name: "Muthu Selvam",
    craft: "Tanjore Painter, Tamil Nadu",
    text: "என் படங்களுக்கு இப்போது professional look வந்துவிட்டது. விலையும் சரியாக கிடைக்கிறது.",
    rating: 5,
    avatar: "M",
  },
  {
    name: "Rajkumar Soni",
    craft: "Meenakari Jeweler, Rajasthan",
    text: "B2B marketplace se bulk orders aa rahe hain. Business 3x grow kiya in 2 months!",
    rating: 5,
    avatar: "R",
  },
];

export default function LandingPage() {
  const [langIndex, setLangIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setLangIndex((prev) => (prev + 1) % ROTATING_LANGUAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const colorMap = {
    saffron: "rgba(249,115,22,0.15)",
    indigo: "rgba(99,102,241,0.15)",
    emerald: "rgba(16,185,129,0.15)",
    terra: "rgba(185,80,50,0.15)",
  };

  const textColorMap = {
    saffron: "#fb923c",
    indigo: "#818cf8",
    emerald: "#34d399",
    terra: "#cd7c5b",
  };

  return (
    <div className="min-h-screen overflow-hidden">
      {/* ---- Navbar ---- */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(12,9,8,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(249,115,22,0.1)" }}>
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-saffron flex items-center justify-center">
            <span className="text-white font-bold text-sm" style={{ fontFamily: "Outfit" }}>KS</span>
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
            Karigar<span style={{ color: "#f97316" }}>Setu</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {["Features", "Marketplace", "Pricing", "About"].map((item) => (
            <Link key={item} href={`/${item.toLowerCase()}`}
              className="text-sm font-medium transition-colors"
              style={{ color: "#c4a882", fontFamily: "Outfit" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f97316")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#c4a882")}>
              {item}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-ghost text-sm px-4 py-2">
            Login
          </Link>
          <Link href="/auth/register">
            <button className="btn-primary text-sm px-5 py-2 relative z-10">
              <span className="relative z-10">Start Free</span>
            </button>
          </Link>
        </div>
      </nav>

      {/* ---- Hero Section ---- */}
      <section ref={heroRef} className="gradient-hero mandala-bg pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />

        <div className={`max-w-6xl mx-auto text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 badge badge-saffron mb-6">
            <Sparkles size={12} />
            Smart India Hackathon 2024 — Heritage & Culture
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight" style={{ fontFamily: "Outfit" }}>
            <span style={{ color: "#f5efe6" }}>AI Manager for</span>
            <br />
            <span className="gradient-text glow-text-saffron">Indian Artisans</span>
          </h1>

          {/* Rotating language text */}
          <div className="h-16 flex items-center justify-center mb-6">
            <div key={langIndex} className="text-2xl md:text-3xl font-semibold transition-all"
              style={{
                fontFamily: langIndex < 6 ? "Noto Sans Devanagari, sans-serif" : "Outfit",
                color: "#f97316",
                animation: "page-in 0.4s ease-out",
              }}>
              {ROTATING_LANGUAGES[langIndex].text}
              <span className="ml-3 text-base badge badge-saffron">{ROTATING_LANGUAGES[langIndex].lang}</span>
            </div>
          </div>

          <p className="text-lg md:text-xl max-w-3xl mx-auto mb-10" style={{ color: "#c4a882", lineHeight: 1.7 }}>
            KarigarSetu is an AI-powered virtual business manager that helps Indian artisans, weavers, and
            micro-entrepreneurs digitize and sell their crafts online — with{" "}
            <strong style={{ color: "#f5efe6" }}>zero technical knowledge</strong> required.
            Connecting authentic Indian heritage directly with national & global buyers with fair, direct pricing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/auth/register">
              <button className="btn-primary flex items-center gap-2 px-8 py-4 text-base">
                <span className="relative z-10 flex items-center gap-2">
                  <Mic size={18} />
                  Start with Voice Catalog
                  <ArrowRight size={16} />
                </span>
              </button>
            </Link>
            <Link href="/marketplace">
              <button className="btn-ghost flex items-center gap-2 px-8 py-4 text-base">
                <ShoppingBag size={18} />
                Browse Marketplace
              </button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {STATS.map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <stat.icon size={20} className="mx-auto mb-2" style={{ color: "#f97316" }} />
                <div className="text-2xl font-black" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                  {stat.value}
                </div>
                <div className="text-xs mt-1" style={{ color: "#7d6548" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Customer & Artisan Workflow Pipeline ---- */}
      <section className="py-20 px-6" style={{ background: "var(--bg-dark-2)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="badge badge-saffron mb-4">⭐ How It Works</span>
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "Outfit" }}>
              Craft to Market <span className="gradient-text">Workflow</span>
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: "#c4a882" }}>
              A seamless, transparent journey from the artisan&#39;s loom to certified digital listings with fair market pricing.
            </p>
          </div>

          {/* Flow Cards */}
          <div className="space-y-6">
            {/* Visual Studio Phase */}
            <div className="glass-card p-6 border border-amber-500/20">
              <div className="text-xs uppercase tracking-wider font-bold text-amber-400 mb-4 flex items-center gap-2">
                <span>📸 Visual Studio Phase</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                {[
                  { step: "1", icon: "📸", label: "Upload product Image", sub: "Simple phone camera photo" },
                  { step: "2", icon: "✂️", label: "Background Removal", sub: "Clean subject separation" },
                  { step: "3", icon: "✨", label: "Image Enhancer", sub: "Studio lighting & contrast" },
                  { step: "4", icon: "🖼️", label: "final Product Image", sub: "E-commerce ready asset" },
                ].map((item, idx) => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="flex-1 pipeline-step flex-col text-center p-4">
                      <div className="text-2xl mb-1.5">{item.icon}</div>
                      <div className="font-bold text-sm text-white" style={{ fontFamily: "Outfit" }}>{item.label}</div>
                      <div className="text-xs mt-1 text-stone-400">{item.sub}</div>
                    </div>
                    {idx < 3 && (
                      <div className="hidden lg:block text-amber-500 font-bold text-xl shrink-0">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Connecting transition indicator */}
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm">
              <span>↓</span>
              <span className="text-xs uppercase tracking-widest text-stone-400 font-semibold">
                Coupled with voice storytelling
              </span>
              <span>↓</span>
            </div>

            {/* Voice & Intelligence Phase */}
            <div className="glass-card p-6 border border-blue-500/20">
              <div className="text-xs uppercase tracking-wider font-bold text-blue-400 mb-4 flex items-center gap-2">
                <span>🎙️ Voice, Catalog & Pricing Phase</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
                {[
                  { step: "5", icon: "🎙️", label: "Artisan's voice", sub: "Spoken in regional language" },
                  { step: "6", icon: "📝", label: "Transcript", sub: "Spoken words to text" },
                  { step: "7", icon: "🌐", label: "Translate(Hindi/English)", sub: "Bilingual translation" },
                  { step: "8", icon: "📋", label: "Product Catalog", sub: "Title, specs, materials" },
                  { step: "9", icon: "💰", label: "Price Prediction", sub: "Fair market benchmark" },
                ].map((item, idx) => (
                  <div key={item.step} className="flex items-center gap-2">
                    <div className="flex-1 pipeline-step flex-col text-center p-4">
                      <div className="text-2xl mb-1.5">{item.icon}</div>
                      <div className="font-bold text-xs text-white" style={{ fontFamily: "Outfit" }}>{item.label}</div>
                      <div className="text-[11px] mt-1 text-stone-400">{item.sub}</div>
                    </div>
                    {idx < 4 && (
                      <div className="hidden lg:block text-blue-400 font-bold text-base shrink-0">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/auth/register">
              <button className="btn-primary px-8 py-4 flex items-center gap-2 mx-auto">
                <span className="relative z-10 flex items-center gap-2">
                  <Mic size={18} />
                  Experience The Flow
                  <ArrowRight size={16} />
                </span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Features Grid ---- */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ fontFamily: "Outfit" }}>
              Everything an Artisan Needs
            </h2>
            <p style={{ color: "#c4a882", fontSize: 18 }}>
              7 AI-powered modules working together to grow your craft business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature) => (
              <Link href={feature.href} key={feature.title}>
                <div className="glass-card glass-card-hover p-6 h-full cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: colorMap[feature.color as keyof typeof colorMap] }}>
                      <feature.icon size={22} style={{ color: textColorMap[feature.color as keyof typeof textColorMap] }} />
                    </div>
                    <span className="badge badge-saffron text-xs">{feature.badge}</span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 group-hover:text-orange-400 transition-colors"
                    style={{ fontFamily: "Outfit" }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#c4a882" }}>
                    {feature.description}
                  </p>
                  <div className="flex items-center gap-1 mt-4 text-xs font-medium transition-colors"
                    style={{ color: "#7d6548" }}>
                    Explore <ChevronRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Testimonials ---- */}
      <section className="py-20 px-6" style={{ background: "var(--bg-dark-2)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3" style={{ fontFamily: "Outfit" }}>
              Artisans Love KarigarSetu
            </h2>
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="#f97316" style={{ color: "#f97316" }} />)}
              <span className="ml-2 text-sm" style={{ color: "#c4a882" }}>from craft communities across India</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="glass-card p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, i) => <Star key={i} size={14} fill="#f97316" style={{ color: "#f97316" }} />)}
                </div>
                <p className="text-sm leading-relaxed mb-5 italic" style={{ color: "#c4a882", fontFamily: t.name === "Muthu Selvam" ? "Noto Sans Devanagari" : "Inter" }}>
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-saffron flex items-center justify-center text-white font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>{t.name}</div>
                    <div className="text-xs" style={{ color: "#7d6548" }}>{t.craft}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA Section ---- */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(249,115,22,0.08), transparent)" }} />
        <div className="max-w-3xl mx-auto text-center relative">
          <Award size={48} className="mx-auto mb-6" style={{ color: "#f97316" }} />
          <h2 className="text-4xl md:text-5xl font-black mb-5" style={{ fontFamily: "Outfit" }}>
            Start Your Digital Journey
          </h2>
          <p className="text-lg mb-8" style={{ color: "#c4a882" }}>
            Join thousands of artisans already using AI to grow their craft business.
            Free to use. No technical skills needed. Works in your language.
          </p>
          <Link href="/auth/register">
            <button className="btn-primary px-10 py-5 text-lg flex items-center gap-3 mx-auto">
              <span className="relative z-10 flex items-center gap-3">
                <Users size={22} />
                Register as Artisan — Free
                <ArrowRight size={20} />
              </span>
            </button>
          </Link>
          <p className="mt-4 text-sm" style={{ color: "#7d6548" }}>
            🏆 Built for Smart India Hackathon 2024 · Heritage &amp; Culture Track
          </p>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer style={{ background: "var(--bg-dark-2)", borderTop: "1px solid var(--border-subtle)" }}
        className="py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg gradient-saffron flex items-center justify-center">
              <span className="text-white font-bold text-xs">KS</span>
            </div>
            <span className="font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
              Karigar<span style={{ color: "#f97316" }}>Setu</span>
            </span>
          </div>
          <p className="text-sm" style={{ color: "#7d6548" }}>
            Made with ❤️ for Indian Artisans · SIH 2024
          </p>
          <div className="flex gap-5">
            {["Dashboard", "Marketplace", "Voice Cataloger"].map((l) => (
              <Link key={l} href={`/${l.toLowerCase().replace(" ", "-")}`}
                className="text-sm transition-colors"
                style={{ color: "#7d6548", fontFamily: "Outfit" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f97316")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#7d6548")}>
                {l}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
