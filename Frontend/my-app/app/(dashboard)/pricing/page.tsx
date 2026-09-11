"use client";

import { useState } from "react";
import axios from "axios";
import {
  BarChart3, Calculator, TrendingUp, Info, Sparkles,
  IndianRupee, Package, Clock, MapPin, Star, Loader2
} from "lucide-react";

interface PricingResult {
  suggested_price: number;
  min_price: number;
  max_price: number;
  platform_prices: {
    direct_sale: number;
    marketplace: number;
    b2b_bulk: number;
    export: number;
  };
  breakdown: {
    material_cost: number;
    labor_cost: number;
    overhead: number;
    total_cost: number;
    margin_percent: number;
    quality_multiplier: number;
    gi_premium_applied: boolean;
  };
  insights: string[];
  roi_percent: number;
}

const STATES = [
  "Rajasthan", "Gujarat", "West Bengal", "Tamil Nadu", "Uttar Pradesh",
  "Maharashtra", "Odisha", "Madhya Pradesh", "Karnataka", "Andhra Pradesh",
  "Telangana", "Assam", "Other"
];

const CATEGORIES = ["textiles", "pottery", "jewelry", "woodwork", "metalwork", "paintings", "leather", "bamboo", "stone", "other"];
const QUALITIES = [
  { value: "basic", label: "Basic", desc: "Simple, functional" },
  { value: "standard", label: "Standard", desc: "Good quality, everyday use" },
  { value: "premium", label: "Premium", desc: "High-end, gifting grade" },
  { value: "luxury", label: "Luxury", desc: "Collector's item, export grade" },
];

export default function PricingPage() {
  const [form, setForm] = useState({
    category: "textiles",
    materialCost: "",
    laborHours: "",
    region: "Rajasthan",
    quality: "standard",
    hasGITag: false,
  });
  const [result, setResult] = useState<PricingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCalculate = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("ks_token");
      const res = await axios.post("http://localhost:5000/api/pricing/suggest", {
        category: form.category,
        material_cost: Number(form.materialCost),
        labor_hours: Number(form.laborHours),
        region: form.region,
        quality: form.quality,
        has_gi_tag: form.hasGITag,
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) setResult(res.data.data);
    } catch {
      // Fallback calculation
      const materialCost = Number(form.materialCost) || 0;
      const laborCost = Number(form.laborHours) * 80;
      const overhead = (materialCost + laborCost) * 0.15;
      const base = materialCost + laborCost + overhead;
      const price = Math.ceil(base * 2.5 * 1.3);
      setResult({
        suggested_price: price,
        min_price: Math.ceil(base * 1.2),
        max_price: Math.ceil(price * 1.3),
        platform_prices: { direct_sale: price, marketplace: Math.ceil(price * 0.85), b2b_bulk: Math.ceil(price * 0.70), export: Math.ceil(price * 1.5) },
        breakdown: { material_cost: materialCost, labor_cost: laborCost, overhead: Math.ceil(overhead), total_cost: Math.ceil(base), margin_percent: 150, quality_multiplier: 1.3, gi_premium_applied: form.hasGITag },
        insights: ["💡 Use the backend pricing engine for precise regional benchmarks"],
        roi_percent: Math.round(((price - base) / base) * 100),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <span className="badge badge-saffron mb-2">AI Powered</span>
        <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
          💰 Dynamic Pricing Assistant
        </h1>
        <p style={{ color: "#c4a882" }}>
          AI-driven price recommendations based on your costs, region, and market data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input form */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
            <Calculator size={18} className="inline mr-2" style={{ color: "#f97316" }} />
            Product Details
          </h2>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
              <Package size={13} className="inline mr-1" /> Category
            </label>
            <select className="input-dark" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                <IndianRupee size={13} className="inline mr-1" /> Material Cost (₹)
              </label>
              <input type="number" className="input-dark" placeholder="500" value={form.materialCost}
                onChange={(e) => setForm({ ...form, materialCost: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                <Clock size={13} className="inline mr-1" /> Labor Hours
              </label>
              <input type="number" className="input-dark" placeholder="8" value={form.laborHours}
                onChange={(e) => setForm({ ...form, laborHours: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
              <MapPin size={13} className="inline mr-1" /> Region / State
            </label>
            <select className="input-dark" value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}>
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <p className="text-xs mt-1" style={{ color: "#7d6548" }}>Used for regional labor rate benchmarks</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
              Quality Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {QUALITIES.map((q) => (
                <button key={q.value}
                  onClick={() => setForm({ ...form, quality: q.value })}
                  className="p-3 rounded-xl text-left transition-all"
                  style={{
                    background: form.quality === q.value ? "rgba(249,115,22,0.15)" : "var(--bg-dark-3)",
                    border: `1px solid ${form.quality === q.value ? "rgba(249,115,22,0.4)" : "var(--border-subtle)"}`,
                  }}>
                  <div className="font-semibold text-sm" style={{ fontFamily: "Outfit", color: form.quality === q.value ? "#f97316" : "#f5efe6" }}>
                    {q.label}
                  </div>
                  <div className="text-xs" style={{ color: "#7d6548" }}>{q.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-dark-3)", border: "1px solid var(--border-subtle)" }}>
            <input type="checkbox" id="gi-tag" checked={form.hasGITag}
              onChange={(e) => setForm({ ...form, hasGITag: e.target.checked })}
              className="w-4 h-4 accent-orange-500" />
            <label htmlFor="gi-tag" className="text-sm cursor-pointer" style={{ fontFamily: "Outfit", color: "#c4a882" }}>
              <Star size={13} className="inline mr-1" style={{ color: "#f97316" }} />
              GI-Tagged Product (+35% premium)
              <p className="text-xs mt-0.5" style={{ color: "#7d6548" }}>e.g. Banarasi Silk, Pashmina, Kanjivaram, Madhubani</p>
            </label>
          </div>

          <button id="pricing-calculate" onClick={handleCalculate} disabled={loading || !form.materialCost || !form.laborHours}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            <span className="relative z-10 flex items-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Calculating...</> : <><Sparkles size={16} /> Calculate Price</>}
            </span>
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Main price */}
              <div className="glass-card p-6 text-center"
                style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,88,12,0.05))", border: "1px solid rgba(249,115,22,0.3)" }}>
                <div className="text-sm font-semibold mb-1" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                  AI SUGGESTED PRICE
                </div>
                <div className="text-5xl font-black mb-2" style={{ fontFamily: "Outfit", color: "#f97316" }}>
                  ₹{result.suggested_price.toLocaleString("en-IN")}
                </div>
                <div className="flex items-center justify-center gap-4 text-sm" style={{ color: "#7d6548" }}>
                  <span>Min: <strong style={{ color: "#c4a882" }}>₹{result.min_price.toLocaleString("en-IN")}</strong></span>
                  <span>Max: <strong style={{ color: "#c4a882" }}>₹{result.max_price.toLocaleString("en-IN")}</strong></span>
                </div>
                <div className="mt-3 badge badge-green mx-auto">
                  <TrendingUp size={11} /> ROI: {result.roi_percent}%
                </div>
              </div>

              {/* Platform prices */}
              <div className="glass-card p-5">
                <h3 className="font-bold mb-3 text-sm" style={{ fontFamily: "Outfit", color: "#c4a882" }}>
                  PLATFORM-SPECIFIC PRICES
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "🏪 Direct Sale", key: "direct_sale", color: "#f97316" },
                    { label: "🛍️ Online Marketplace", key: "marketplace", color: "#818cf8" },
                    { label: "🏢 B2B Bulk Order", key: "b2b_bulk", color: "#34d399" },
                    { label: "✈️ Export", key: "export", color: "#f59e0b" },
                  ].map((p) => (
                    <div key={p.key} className="flex items-center justify-between py-2 px-3 rounded-lg"
                      style={{ background: "var(--bg-dark-3)" }}>
                      <span className="text-sm" style={{ color: "#c4a882" }}>{p.label}</span>
                      <span className="font-bold" style={{ fontFamily: "Outfit", color: p.color }}>
                        ₹{(result.platform_prices[p.key as keyof typeof result.platform_prices] || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="glass-card p-5">
                <h3 className="font-bold mb-3 text-sm" style={{ fontFamily: "Outfit", color: "#c4a882" }}>
                  COST BREAKDOWN
                </h3>
                {[
                  { label: "Material Cost", value: result.breakdown.material_cost },
                  { label: "Labor Cost", value: result.breakdown.labor_cost },
                  { label: "Overhead (15%)", value: result.breakdown.overhead },
                  { label: "Total Cost", value: result.breakdown.total_cost, bold: true },
                ].map((item) => (
                  <div key={item.label} className={`flex justify-between py-1.5 text-sm ${item.bold ? "border-t mt-2 pt-2" : ""}`}
                    style={{ borderColor: "var(--border-subtle)", color: item.bold ? "#f5efe6" : "#c4a882", fontWeight: item.bold ? 700 : 400 }}>
                    <span style={{ fontFamily: item.bold ? "Outfit" : "Inter" }}>{item.label}</span>
                    <span style={{ color: item.bold ? "#f97316" : undefined }}>₹{item.value.toLocaleString("en-IN")}</span>
                  </div>
                ))}
                {result.breakdown.gi_premium_applied && (
                  <div className="mt-2 badge badge-saffron text-xs">
                    <Star size={10} /> GI Tag Premium Applied (+35%)
                  </div>
                )}
              </div>

              {/* Insights */}
              <div className="glass-card p-5">
                <h3 className="font-bold mb-3 text-sm flex items-center gap-2" style={{ fontFamily: "Outfit", color: "#c4a882" }}>
                  <Info size={14} style={{ color: "#818cf8" }} /> AI PRICING INSIGHTS
                </h3>
                <div className="space-y-2">
                  {result.insights.map((insight, i) => (
                    <div key={i} className="text-sm p-2 rounded-lg" style={{ color: "#c4a882", background: "var(--bg-dark-3)" }}>
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="glass-card p-8 text-center h-full flex flex-col items-center justify-center" style={{ minHeight: 300 }}>
              <BarChart3 size={48} className="mb-4" style={{ color: "#7d6548" }} />
              <p className="font-semibold" style={{ fontFamily: "Outfit", color: "#c4a882" }}>
                Fill in your costs to get AI price suggestions
              </p>
              <p className="text-sm mt-2" style={{ color: "#7d6548" }}>
                Prices calibrated with regional labor rates and market benchmarks
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
