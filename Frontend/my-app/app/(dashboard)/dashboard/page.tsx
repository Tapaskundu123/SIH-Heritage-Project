"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Package, TrendingUp, AlertTriangle, ShoppingBag, Mic,
  Image as ImageIcon, BarChart3, Plus, ArrowRight, Star,
  Boxes, Eye, Sparkles
} from "lucide-react";

interface DashboardStats {
  totalProducts: number;
  publishedProducts: number;
  lowStockCount: number;
  totalStock: number;
  totalSold: number;
  recentProducts: Array<{
    _id: string;
    name: string;
    category: string;
    price: number;
    stock: number;
    isPublished: boolean;
    images: Array<{ url: string }>;
  }>;
}

const QUICK_ACTIONS = [
  { label: "Voice Catalog", desc: "Describe product by voice", icon: Mic, href: "/voice-cataloger", color: "#f97316" },
  { label: "AI Photo Studio", desc: "Enhance product images", icon: ImageIcon, href: "/ai-studio", color: "#6366f1" },
  { label: "Add Product", desc: "Manual product entry", icon: Plus, href: "/products/new", color: "#10b981" },
  { label: "Price Advisor", desc: "AI pricing suggestions", icon: BarChart3, href: "/pricing", color: "#f59e0b" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<{ name?: string; craftType?: string; preferredLanguage?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("ks_user");
    if (userData) setUser(JSON.parse(userData));

    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");

    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("ks_token");
      const res = await axios.get("http://localhost:5000/api/products/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setStats(res.data.data);
      } else {
        setStats({
          totalProducts: 0,
          publishedProducts: 0,
          lowStockCount: 0,
          totalStock: 0,
          totalSold: 0,
          recentProducts: [],
        });
      }
    } catch {
      setStats({
        totalProducts: 0,
        publishedProducts: 0,
        lowStockCount: 0,
        totalStock: 0,
        totalSold: 0,
        recentProducts: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const STAT_CARDS = stats ? [
    { label: "Total Products", value: stats.totalProducts, icon: Package, color: "#f97316", bg: "rgba(249,115,22,0.1)" },
    { label: "Published", value: stats.publishedProducts, icon: Eye, color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    { label: "Items in Stock", value: stats.totalStock, icon: Boxes, color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
    { label: "Low Stock Alerts", value: stats.lowStockCount, icon: AlertTriangle, color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  ] : [];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
            {greeting}, <span style={{ color: "#f97316" }}>{user?.name?.split(" ")[0] || "Artisan"}</span> 👋
          </h1>
          <p className="mt-1 capitalize" style={{ color: "#c4a882" }}>
            {user?.craftType || "Craftsperson"} · Ready to grow your business today?
          </p>
        </div>
        <div className="badge badge-saffron">
          <Sparkles size={12} />
          AI Active
        </div>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card h-28 shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                {s.label === "Low Stock Alerts" && (stats?.lowStockCount || 0) > 0 && (
                  <span className="badge badge-saffron text-xs">Action!</span>
                )}
              </div>
              <div className="text-3xl font-black" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>{s.value}</div>
              <div className="text-sm mt-1" style={{ color: "#7d6548" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4" style={{ fontFamily: "Outfit" }}>Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.label} href={action.href}>
              <div className="glass-card glass-card-hover p-5 cursor-pointer group h-full">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${action.color}20` }}>
                  <action.icon size={22} style={{ color: action.color }} />
                </div>
                <div className="font-semibold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>{action.label}</div>
                <div className="text-xs mt-1" style={{ color: "#7d6548" }}>{action.desc}</div>
                <div className="flex items-center gap-1 mt-3 text-xs" style={{ color: action.color }}>
                  Open <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* AI Feature Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Cataloger Spotlight */}
        <div className="relative rounded-2xl overflow-hidden p-6"
          style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(234,88,12,0.05))", border: "1px solid rgba(249,115,22,0.25)" }}>
          <div className="absolute top-4 right-4">
            <span className="badge badge-saffron text-xs">⭐ Featured</span>
          </div>
          <Mic size={40} className="mb-4" style={{ color: "#f97316" }} />
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "Outfit" }}>Voice Cataloger</h3>
          <p className="text-sm mb-4" style={{ color: "#c4a882" }}>
            Speak in Hindi, Tamil, Bengali, or any Indian language. AI creates a complete product listing instantly.
          </p>
          <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "#c4a882" }}>
            <div className="flex gap-1">
              {["hi", "ta", "bn", "te", "mr"].map((l) => (
                <span key={l} className="badge badge-saffron">{l.toUpperCase()}</span>
              ))}
              <span className="badge badge-saffron">+7</span>
            </div>
          </div>
          <Link href="/voice-cataloger">
            <button className="btn-primary py-2 px-5 text-sm">
              <span className="relative z-10 flex items-center gap-2">
                Try Now <ArrowRight size={14} />
              </span>
            </button>
          </Link>
        </div>

        {/* B2B Marketplace */}
        <div className="relative rounded-2xl overflow-hidden p-6"
          style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(79,70,229,0.05))", border: "1px solid rgba(99,102,241,0.25)" }}>
          <ShoppingBag size={40} className="mb-4" style={{ color: "#818cf8" }} />
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "Outfit" }}>B2B Marketplace</h3>
          <p className="text-sm mb-4" style={{ color: "#c4a882" }}>
            Connect with exporters, corporate buyers, and bulk purchasers across India and abroad.
          </p>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-7 h-7 rounded-full gradient-saffron flex items-center justify-center text-white text-xs font-bold -ml-1 first:ml-0 border-2" style={{ borderColor: "var(--bg-dark)" }}>
                  {["E", "C", "B"][i]}
                </div>
              ))}
            </div>
            <span className="text-xs" style={{ color: "#c4a882" }}>Exporters · Corporates · Bulk Buyers</span>
          </div>
          <div className="flex gap-1 mb-4">
            {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="#6366f1" style={{ color: "#6366f1" }} />)}
            <span className="text-xs ml-1" style={{ color: "#7d6548" }}>Trusted by artisans</span>
          </div>
          <Link href="/marketplace">
            <button className="py-2 px-5 text-sm rounded-lg font-semibold flex items-center gap-2 transition-all"
              style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)", fontFamily: "Outfit" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.2)"; }}>
              Browse Marketplace <ArrowRight size={14} />
            </button>
          </Link>
        </div>
      </div>

      {/* Recent Products */}
      {stats?.recentProducts && stats.recentProducts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ fontFamily: "Outfit" }}>Recent Products</h2>
            <Link href="/products" className="text-sm flex items-center gap-1 transition-colors"
              style={{ color: "#f97316" }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {stats.recentProducts.map((product) => (
              <Link key={product._id} href={`/products/${product._id}`}>
                <div className="glass-card glass-card-hover p-3 cursor-pointer">
                  <div className="w-full h-28 rounded-lg mb-3 overflow-hidden"
                    style={{ background: "var(--bg-dark-3)" }}>
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={28} style={{ color: "#7d6548" }} />
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-medium truncate" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                    {product.name}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold" style={{ color: "#f97316" }}>₹{product.price}</span>
                    <span className={`badge text-xs ${product.isPublished ? "badge-green" : "badge-saffron"}`}>
                      {product.isPublished ? "Live" : "Draft"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && stats?.totalProducts === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-2xl gradient-saffron flex items-center justify-center mx-auto mb-5 opacity-50">
            <Package size={36} style={{ color: "white" }} />
          </div>
          <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "Outfit" }}>No Products Yet</h3>
          <p className="mb-6" style={{ color: "#c4a882" }}>Start by adding your first product with our AI voice cataloger!</p>
          <Link href="/voice-cataloger">
            <button className="btn-primary px-8 py-3 flex items-center gap-2 mx-auto">
              <span className="relative z-10 flex items-center gap-2"><Mic size={18} /> Try Voice Cataloger</span>
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
