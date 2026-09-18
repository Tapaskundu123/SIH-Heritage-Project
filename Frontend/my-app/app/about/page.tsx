"use client";

import Link from "next/link";
import {
  Award, Heart, ShieldCheck, Globe, Users, ArrowRight,
  TrendingUp, Sparkles, CheckCircle2, Landmark, Compass
} from "lucide-react";

export default function AboutPage() {
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
            { label: "Features", href: "/features", active: false },
            { label: "Marketplace", href: "/marketplace", active: false },
            { label: "Pricing", href: "/pricing", active: false },
            { label: "About", href: "/about", active: true },
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
            <Landmark size={14} /> Smart India Hackathon — Heritage &amp; Culture Track
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black" style={{ fontFamily: "Outfit" }}>
            Preserving India&#39;s <span className="gradient-text">Living Heritage</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#c4a882] max-w-2xl mx-auto" style={{ lineHeight: 1.6 }}>
            KarigarSetu bridges traditional Indian craftspersons, weavers, and rural artisans directly to national and global buyers through ethical, language-inclusive AI.
          </p>
        </div>
      </section>

      {/* ---- The Core Mission & Problem Statement ---- */}
      <section className="py-20 px-6 max-w-6xl mx-auto space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-xs uppercase tracking-widest font-bold text-amber-400">
              The Reality of Indian Artisans
            </span>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ fontFamily: "Outfit" }}>
              Why We Built KarigarSetu
            </h2>
            <p className="text-sm text-[#c4a882] leading-relaxed">
              India is home to over <strong>200 million craftspeople and weavers</strong> who sustain millennia-old traditions — from Banarasi silk and Kanchipuram brocades to Jaipur blue pottery and Madhubani paintings.
            </p>
            <p className="text-sm text-[#c4a882] leading-relaxed">
              Yet, more than <strong>70% of the retail price</strong> is captured by exploitative middlemen, exporters, and intermediaries. Most master artisans cannot navigate complex English-only marketplaces, high photography fees, and algorithmic pricing traps.
            </p>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              💡 <strong>Our Mission:</strong> Zero-commission, voice-driven digital enablement so that every rupee paid for authentic Indian heritage goes directly into the artisan&#39;s hands.
            </div>
          </div>

          {/* Stat Pillars */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-6 border border-white/10 space-y-2">
              <div className="text-3xl font-black text-amber-400" style={{ fontFamily: "Outfit" }}>200M+</div>
              <div className="text-xs font-bold text-white">Artisans &amp; Weavers</div>
              <p className="text-[11px] text-stone-400">Second largest employer in rural India after agriculture.</p>
            </div>

            <div className="glass-card p-6 border border-white/10 space-y-2">
              <div className="text-3xl font-black text-red-400" style={{ fontFamily: "Outfit" }}>70%</div>
              <div className="text-xs font-bold text-white">Lost to Middlemen</div>
              <p className="text-[11px] text-stone-400">Traditional traders exploit linguistic and digital barriers.</p>
            </div>

            <div className="glass-card p-6 border border-white/10 space-y-2">
              <div className="text-3xl font-black text-emerald-400" style={{ fontFamily: "Outfit" }}>22+</div>
              <div className="text-xs font-bold text-white">Indian Languages</div>
              <p className="text-[11px] text-stone-400">Artisans speak naturally in their native mother tongue.</p>
            </div>

            <div className="glass-card p-6 border border-white/10 space-y-2">
              <div className="text-3xl font-black text-blue-400" style={{ fontFamily: "Outfit" }}>100%</div>
              <div className="text-xs font-bold text-white">Direct Payout</div>
              <p className="text-[11px] text-stone-400">Protected by escrow until buyer confirms quality.</p>
            </div>
          </div>
        </div>

        {/* Four Pillars */}
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs uppercase tracking-widest font-bold text-amber-400">
              Our Core Principles
            </span>
            <h3 className="text-3xl font-black text-white" style={{ fontFamily: "Outfit" }}>
              The Four Pillars of KarigarSetu
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl gradient-saffron flex items-center justify-center text-white font-bold">
                <Compass size={20} />
              </div>
              <h4 className="font-bold text-base text-white" style={{ fontFamily: "Outfit" }}>
                1. Linguistic Inclusion
              </h4>
              <p className="text-xs text-[#c4a882] leading-relaxed">
                Technology should adapt to the artisan, not the other way around. Speech-to-listing allows anyone who can speak to sell online.
              </p>
            </div>

            <div className="glass-card p-6 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                <Sparkles size={20} />
              </div>
              <h4 className="font-bold text-base text-white" style={{ fontFamily: "Outfit" }}>
                2. Professional Studio
              </h4>
              <p className="text-xs text-[#c4a882] leading-relaxed">
                Empowering artisans with studio-grade photography tools on their regular smartphones without costly photographers.
              </p>
            </div>

            <div className="glass-card p-6 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold">
                <TrendingUp size={20} />
              </div>
              <h4 className="font-bold text-base text-white" style={{ fontFamily: "Outfit" }}>
                3. Fair Dignified Pricing
              </h4>
              <p className="text-xs text-[#c4a882] leading-relaxed">
                Pricing models that compute the true value of intricate hand labor, heritage craft history, and GI certification.
              </p>
            </div>

            <div className="glass-card p-6 border border-white/10 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white font-bold">
                <ShieldCheck size={20} />
              </div>
              <h4 className="font-bold text-base text-white" style={{ fontFamily: "Outfit" }}>
                4. GI Heritage Protection
              </h4>
              <p className="text-xs text-[#c4a882] leading-relaxed">
                Protecting buyers and genuine artisans by authenticating Geographical Indication tags and vetting counterfeit powerloom goods.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Card */}
        <div className="glass-card p-10 border border-amber-500/30 text-center space-y-5 bg-gradient-to-b from-amber-500/10 to-transparent">
          <h3 className="text-3xl font-black text-white" style={{ fontFamily: "Outfit" }}>
            Join the Movement to Empower Indian Crafts
          </h3>
          <p className="text-sm text-[#c4a882] max-w-xl mx-auto">
            Whether you are an artisan weaving silk in Varanasi, or a buyer seeking authentic handcrafted treasures in Mumbai or Bengaluru — KarigarSetu is your bridge.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <Link href="/auth/register">
              <button className="btn-primary px-8 py-3.5 flex items-center gap-2 text-sm">
                Register as Artisan <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/marketplace">
              <button className="btn-ghost px-8 py-3.5 flex items-center gap-2 text-sm">
                Browse Marketplace 🛍️
              </button>
            </Link>
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
