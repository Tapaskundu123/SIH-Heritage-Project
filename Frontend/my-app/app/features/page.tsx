"use client";

import Link from "next/link";
import {
  Mic, Sparkles, Image as ImageIcon, BarChart3, ShoppingBag,
  Truck, ShieldCheck, ArrowRight, CheckCircle2, Globe, Users,
  Layers, Zap, Award, ChevronRight
} from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-dark)] text-stone-100 selection:bg-amber-500 selection:text-white">
      {/* ---- Navbar ---- */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(12,9,8,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(249,115,22,0.15)",
        }}
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-saffron flex items-center justify-center">
            <span className="text-white font-bold text-sm" style={{ fontFamily: "Outfit" }}>KS</span>
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
            Karigar<span style={{ color: "#f97316" }}>Setu</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {[
            { label: "Features", href: "/features", active: true },
            { label: "Marketplace", href: "/marketplace", active: false },
            { label: "Pricing", href: "/pricing", active: false },
            { label: "About", href: "/about", active: false },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                item.active ? "text-amber-400 font-bold" : "text-[#c4a882] hover:text-amber-400"
              }`}
              style={{ fontFamily: "Outfit" }}
            >
              {item.label}
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
      <section className="pt-36 pb-20 px-6 gradient-hero mandala-bg relative text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 badge badge-saffron mb-2">
            <Sparkles size={14} /> Comprehensive Feature Matrix
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black" style={{ fontFamily: "Outfit" }}>
            End-to-End Tools for <span className="gradient-text">Indian Crafts</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#c4a882] max-w-2xl mx-auto" style={{ lineHeight: 1.6 }}>
            Designed specifically for artisans and weavers with zero technical friction. Speak in your dialect, snap a photo, and start selling nationally.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link href="/voice-cataloger">
              <button className="btn-primary px-7 py-3.5 flex items-center gap-2 text-sm">
                <Mic size={16} /> Try Voice Cataloger <ArrowRight size={14} />
              </button>
            </Link>
            <Link href="/ai-studio">
              <button className="btn-ghost px-7 py-3.5 flex items-center gap-2 text-sm">
                <ImageIcon size={16} /> Open Photo Studio
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Sequential Flow Banner ---- */}
      <section className="py-12 px-6 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-xs uppercase tracking-widest font-bold text-amber-400">
              Integrated Product Journey
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs font-semibold text-stone-300">
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
              📸 Upload product Image
            </span>
            <span className="text-amber-500">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              ✂️ Background Removal
            </span>
            <span className="text-amber-500">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              ✨ Image Enhancer
            </span>
            <span className="text-amber-500">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              🖼️ final Product Image
            </span>
            <span className="text-amber-500">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
              🎙️ Artisan&#39;s voice
            </span>
            <span className="text-amber-500">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              📝 Transcript
            </span>
            <span className="text-amber-500">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              🌐 Translate(Hindi/English)
            </span>
            <span className="text-amber-500">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              📋 Product Catalog
            </span>
            <span className="text-amber-500">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              💰 Price Prediction
            </span>
          </div>
        </div>
      </section>

      {/* ---- Detailed Features Grid ---- */}
      <section className="py-20 px-6 max-w-6xl mx-auto space-y-16">
        {/* Feature 1: Voice Cataloger */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl gradient-saffron flex items-center justify-center text-white">
              <Mic size={24} />
            </div>
            <h2 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
              Voice-First Multilingual Cataloger
            </h2>
            <p className="text-sm text-[#c4a882] leading-relaxed">
              Most traditional artisans struggle with complex English e-commerce forms. With KarigarSetu, an artisan simply presses record and describes their craft in Hindi, Tamil, Bengali, Telugu, Marathi, or Gujarati.
            </p>
            <ul className="space-y-2 text-xs text-stone-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Supports 22+ native Indian languages and regional dialects</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Automatic transcript generation and bilingual translation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Instant extraction of materials, dimensions, and craft technique</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link href="/voice-cataloger">
                <button className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2">
                  Launch Voice Cataloger <ChevronRight size={14} />
                </button>
              </Link>
            </div>
          </div>
          <div className="glass-card p-6 border border-amber-500/20 bg-amber-500/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Live Voice Sample</span>
              <span className="badge badge-saffron text-[10px]">Audio to Listing</span>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-900/80 border border-white/5 space-y-2">
              <p className="text-xs text-stone-400">Artisan Spoken Input (Hindi):</p>
              <p className="text-sm text-stone-200 italic font-devanagari">
                “यह बनारसी रेशम की साड़ी है, हाथ से बुनी कढ़वा तकनीक, शुद्ध ज़री बॉर्डर, कीमत ₹8,500”
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-900/80 border border-white/5 space-y-2">
              <p className="text-xs text-stone-400">Generated E-Commerce Listing:</p>
              <p className="text-sm font-bold text-amber-400">Authentic Banarasi Kadhwa Pure Silk Saree</p>
              <p className="text-xs text-stone-300">Handloom zari border, GI-certified weave from Varanasi master artisan.</p>
            </div>
          </div>
        </div>

        {/* Feature 2: Photo Studio */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="glass-card p-6 border border-indigo-500/20 bg-indigo-500/5 space-y-4 order-2 lg:order-1">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Studio Image Processing</span>
              <span className="badge badge-indigo text-[10px]">Studio Quality</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-xl bg-stone-900/80 border border-white/5">
                <div className="h-28 rounded-lg bg-stone-800 flex items-center justify-center text-xs text-stone-500">
                  Raw Phone Photo
                </div>
                <p className="text-[11px] text-stone-400 mt-2">Cluttered workshop background</p>
              </div>
              <div className="p-3 rounded-xl bg-stone-900/80 border border-amber-500/30">
                <div className="h-28 rounded-lg bg-white flex items-center justify-center text-xs text-stone-900 font-bold">
                  Studio Product Asset
                </div>
                <p className="text-[11px] text-emerald-400 mt-2">Clean isolated PNG + lighting</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 order-1 lg:order-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <ImageIcon size={24} />
            </div>
            <h2 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
              AI Product Photo Studio
            </h2>
            <p className="text-sm text-[#c4a882] leading-relaxed">
              Turn simple smartphone snapshots taken on workshop floors into high-resolution, e-commerce-ready images that look like they were shot in a professional photography studio.
            </p>
            <ul className="space-y-2 text-xs text-stone-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Automated background removal with sharp edge preservation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Color calibration to render authentic silk and pottery pigments</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>1024×1024 white backdrop square canvas export</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link href="/ai-studio">
                <button className="btn-ghost text-xs px-5 py-2.5 flex items-center gap-2">
                  Explore Photo Studio <ChevronRight size={14} />
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature 3: Dynamic Pricing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <BarChart3 size={24} />
            </div>
            <h2 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
              Dynamic Fair-Pricing Advisor
            </h2>
            <p className="text-sm text-[#c4a882] leading-relaxed">
              Artisans frequently undervalue their master craft due to lack of market data. Our pricing algorithm factors raw material costs, handcraft labor hours, regional cluster standards, and GI certification premiums.
            </p>
            <ul className="space-y-2 text-xs text-stone-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Breakdown of material, labor, overhead, and fair profit margin</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Multi-tier pricing for direct retail, B2B wholesale, and exports</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>Automatic 15–25% GI-tag heritage authenticity premium</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link href="/pricing">
                <button className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2">
                  Calculate Craft Price <ChevronRight size={14} />
                </button>
              </Link>
            </div>
          </div>
          <div className="glass-card p-6 border border-emerald-500/20 bg-emerald-500/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Pricing Calculation Breakdown</span>
              <span className="text-xs text-stone-400">Jaipur Blue Pottery</span>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-stone-300">
                <span>Material Cost (Quartz, glass, glaze)</span>
                <span className="font-mono">₹450</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Skilled Artisan Labor (6 hours)</span>
                <span className="font-mono">₹900</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Kiln Firing & Overhead</span>
                <span className="font-mono">₹200</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Heritage GI Authentic Margin (+35%)</span>
                <span className="font-mono">+₹542</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                <span>Recommended Retail Price</span>
                <span className="text-amber-400 font-mono text-base">₹2,090</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature 4: Role Based Access Control */}
        <div className="glass-card p-8 border border-white/10 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-widest font-bold text-amber-400">
              Tailored Experiences
            </span>
            <h3 className="text-2xl font-black text-white" style={{ fontFamily: "Outfit" }}>
              Three Dedicated Portals in One Platform
            </h3>
            <p className="text-xs text-stone-400">
              Role-based authorization ensures each participant has the exact tools they need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="text-2xl">🧵</div>
              <h4 className="font-bold text-white text-base" style={{ fontFamily: "Outfit" }}>
                Artisan / Karigar
              </h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Voice cataloging, image studio, order management, parcel dispatch with tracking numbers, and live earnings payout ledger.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-3">
              <div className="text-2xl">🛍️</div>
              <h4 className="font-bold text-white text-base" style={{ fontFamily: "Outfit" }}>
                Customer / Buyer
              </h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Explore authentic GI crafts, interactive UPI/Card checkout, direct artisan support, and live 4-stage delivery tracking.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3">
              <div className="text-2xl">🛡️</div>
              <h4 className="font-bold text-white text-base" style={{ fontFamily: "Outfit" }}>
                Platform Admin
              </h4>
              <p className="text-xs text-stone-300 leading-relaxed">
                Platform-wide GMV analytics, 1-click artisan GI verification badges, product content moderation, and real-time order feeds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer
        style={{ background: "var(--bg-dark-2)", borderTop: "1px solid var(--border-subtle)" }}
        className="py-10 px-6 mt-20"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg gradient-saffron flex items-center justify-center">
              <span className="text-white font-bold text-xs">KS</span>
            </div>
            <span className="font-bold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
              KarigarSetu
            </span>
            <span className="text-xs" style={{ color: "#7d6548" }}>
              · AI Business Manager for Indian Artisans
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "#7d6548" }}>
            <Link href="/features" className="hover:text-amber-400">Features</Link>
            <Link href="/marketplace" className="hover:text-amber-400">Marketplace</Link>
            <Link href="/pricing" className="hover:text-amber-400">Pricing</Link>
            <Link href="/about" className="hover:text-amber-400">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
