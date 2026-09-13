"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  Plus,
  Package,
  Search,
  Filter,
  Mic,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ImageIcon,
  Sparkles,
  Wand2,
  Layers,
  LayoutGrid,
  List,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Tag,
  ExternalLink,
} from "lucide-react";

interface ProductImage {
  url: string;
  isOriginal?: boolean;
  isEnhanced?: boolean;
  isBgRemoved?: boolean;
}

interface Product {
  _id: string;
  name: string;
  nameHindi?: string;
  category: string;
  price: number;
  stock: number;
  isPublished: boolean;
  isAIGenerated: boolean;
  images: ProductImage[];
  tags: string[];
  region?: string;
  craftTechnique?: string;
  createdAt: string;
}

const CATEGORIES = ["all", "textiles", "pottery", "paintings", "woodwork", "jewelry", "metalwork"];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("ks_token");
        if (!token) {
          setProducts([]);
          setLoading(false);
          return;
        }
        const res = await axios.get("http://localhost:5000/api/products", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success && Array.isArray(res.data.data)) {
          setProducts(res.data.data);
        } else {
          setProducts([]);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags && p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));
    const matchesCategory = selectedCategory === "all" || p.category.toLowerCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const togglePublish = async (id: string, current: boolean) => {
    try {
      const token = localStorage.getItem("ks_token");
      await axios.put(
        `http://localhost:5000/api/products/${id}`,
        { isPublished: !current },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, isPublished: !current } : p)));
    } catch {
      setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, isPublished: !current } : p)));
    }
  };

  const totalPublished = products.filter((p) => p.isPublished).length;
  const totalVoice = products.filter((p) => p.isAIGenerated).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 page-enter">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge badge-saffron text-xs">Catalog Manager</span>
            <span className="badge badge-indigo text-xs">AI Studio Integrated</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#f5efe6]" style={{ fontFamily: "Outfit" }}>
            📦 My Artisan Catalog
          </h1>
          <p style={{ color: "#c4a882", fontSize: 14 }}>
            Manage {products.length} products, inspect craft specializations, and enhance images using AI Image Studio.
          </p>
        </div>

        {/* Global Action CTAs */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Link href="/voice-cataloger">
            <button className="btn-ghost flex items-center gap-2 py-2.5 px-4 text-sm font-semibold">
              <Mic size={16} className="text-[#f97316]" /> Voice Catalog
            </button>
          </Link>
          <Link href="/ai-studio">
            <button className="btn-ghost flex items-center gap-2 py-2.5 px-4 text-sm font-semibold border-amber-500/30 text-amber-400 hover:border-amber-500">
              <Sparkles size={16} /> Open AI Studio
            </button>
          </Link>
          <Link href="/products/new">
            <button className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm font-semibold">
              <span className="relative z-10 flex items-center gap-2">
                <Plus size={16} /> Add Product
              </span>
            </button>
          </Link>
        </div>
      </div>

      {/* Quick Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-card p-4">
          <div className="text-[11px] text-[#7d6548] font-bold uppercase tracking-wider">Total Products</div>
          <div className="text-2xl font-black text-[#f5efe6] mt-0.5" style={{ fontFamily: "Outfit" }}>
            {products.length}
          </div>
          <div className="text-[11px] text-[#c4a882] mt-1">Full artisan inventory</div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[11px] text-[#7d6548] font-bold uppercase tracking-wider">Store Published</div>
          <div className="text-2xl font-black text-[#10b981] mt-0.5" style={{ fontFamily: "Outfit" }}>
            {totalPublished}
          </div>
          <div className="text-[11px] text-[#c4a882] mt-1">Live in marketplace</div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[11px] text-[#7d6548] font-bold uppercase tracking-wider">AI Voice Cataloged</div>
          <div className="text-2xl font-black text-[#818cf8] mt-0.5" style={{ fontFamily: "Outfit" }}>
            {totalVoice}
          </div>
          <div className="text-[11px] text-[#c4a882] mt-1">Artisan Voice Story</div>
        </div>

        <div className="glass-card p-4">
          <div className="text-[11px] text-[#7d6548] font-bold uppercase tracking-wider">AI Studio Ready</div>
          <div className="text-2xl font-black text-[#f97316] mt-0.5" style={{ fontFamily: "Outfit" }}>
            {products.length}
          </div>
          <div className="text-[11px] text-[#c4a882] mt-1">Enhanced Studio Images</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d6548]" />
          <input
            id="products-search"
            type="text"
            placeholder="Search by title, tag, craft..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9 py-2 text-sm w-full"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold capitalize transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-[#f97316] text-white shadow-md shadow-orange-950/40"
                  : "bg-[#14100e] text-[#c4a882] border border-[var(--border-subtle)] hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#14100e] p-1 rounded-lg border border-[var(--border-subtle)] self-end sm:self-center">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "grid" ? "bg-[#f97316] text-white" : "text-[#7d6548] hover:text-[#c4a882]"
            }`}
            title="Grid Cards View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === "table" ? "bg-[#f97316] text-white" : "text-[#7d6548] hover:text-[#c4a882]"
            }`}
            title="Table View"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-card p-16 text-center space-y-3">
          <Loader2 size={36} className="animate-spin mx-auto text-[#f97316]" />
          <p className="text-[#c4a882]">Loading products and AI Studio connections...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <Package size={36} />
          </div>
          <h3 className="text-xl font-bold text-white" style={{ fontFamily: "Outfit" }}>
            No Handcrafted Products Uploaded Yet
          </h3>
          <p className="text-xs text-[#c4a882] max-w-md mx-auto">
            You have not added or published any craft products to your artisan store. Create your first product listing using the AI Voice Cataloger or add details manually.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/voice-cataloger">
              <button className="btn-primary px-5 py-2.5 flex items-center gap-2 text-sm font-semibold">
                <span className="relative z-10 flex items-center gap-2">
                  <Mic size={16} /> Catalog with Voice 🎙️
                </span>
              </button>
            </Link>
            <Link href="/products/new">
              <button className="btn-ghost px-5 py-2.5 text-sm font-semibold text-[#c4a882] hover:text-white border border-white/10">
                <Plus size={16} className="inline mr-1" /> Add Manually
              </button>
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center space-y-4">
          <Package size={52} className="mx-auto text-[#7d6548]" />
          <h3 className="text-xl font-bold text-[#c4a882]" style={{ fontFamily: "Outfit" }}>
            No products match your search or filter
          </h3>
          <p className="text-xs text-[#7d6548] max-w-sm mx-auto">
            Try adjusting your search query or selecting a different craft category.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ================= GRID / CARDS VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((product) => {
            const hasImage = product.images?.[0]?.url;
            return (
              <div
                key={product._id}
                className="glass-card overflow-hidden flex flex-col justify-between group hover:border-[#f97316]/50 transition-all duration-300"
              >
                <div>
                  {/* Card Image Area */}
                  <div className="relative aspect-[4/3] bg-[#14100e] overflow-hidden">
                    {hasImage ? (
                      <img
                        src={product.images[0].url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#7d6548]">
                        <ImageIcon size={32} />
                        <span className="text-xs">No image yet</span>
                      </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <span className="badge badge-indigo text-[10px] capitalize shadow-md backdrop-blur-md">
                        {product.category}
                      </span>
                      {product.isAIGenerated && (
                        <span className="badge badge-saffron text-[10px] shadow-md backdrop-blur-md">
                          🤖 Voice AI
                        </span>
                      )}
                    </div>

                    {/* Stock Status Pill */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`badge text-[10px] shadow-md backdrop-blur-md ${
                          product.stock > 0 ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30" : "bg-red-950/80 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                      </span>
                    </div>

                    {/* Hover Quick Overlay to View Specs */}
                    <Link
                      href={`/products/${product._id}`}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold backdrop-blur-xs"
                    >
                      <Eye size={16} /> View Details & Specialization
                    </Link>
                  </div>

                  {/* Card Content Area */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <Link href={`/products/${product._id}`}>
                        <h3
                          className="font-bold text-base text-[#f5efe6] group-hover:text-[#f97316] transition-colors line-clamp-1"
                          style={{ fontFamily: "Outfit" }}
                        >
                          {product.name}
                        </h3>
                      </Link>
                      {product.nameHindi && (
                        <p className="text-xs text-[#fb923c] font-devanagari line-clamp-1 mt-0.5">
                          {product.nameHindi}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-[#14100e] text-[#c4a882] border border-[var(--border-subtle)]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price & Status */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-[var(--border-subtle)]">
                      <div>
                        <span className="text-[10px] text-[#7d6548] uppercase font-bold">Price</span>
                        <div className="text-lg font-black text-[#f97316]" style={{ fontFamily: "Outfit" }}>
                          ₹{product.price.toLocaleString("en-IN")}
                        </div>
                      </div>

                      <button
                        onClick={() => togglePublish(product._id, product.isPublished)}
                        className={`badge text-[10px] cursor-pointer py-1 px-2.5 transition-all ${
                          product.isPublished ? "badge-green" : "badge-saffron"
                        }`}
                      >
                        {product.isPublished ? "✓ Published" : "Draft"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons Bar: PROMINENT AI STUDIO BUTTON */}
                <div className="p-3 bg-[#14100e]/60 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-2">
                  {/* Button 1: Dedicated AI Studio Button */}
                  <Link
                    href={`/ai-studio?productId=${product._id}&productName=${encodeURIComponent(product.name)}`}
                    className="w-full"
                  >
                    <button
                      id={`card-studio-btn-${product._id}`}
                      className="w-full btn-primary py-2 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/20"
                      title="Add & enhance images using Image Studio (Background Removal + Image Enhancer)"
                    >
                      <span className="relative z-10 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-300" />
                        <span>AI Studio</span>
                      </span>
                    </button>
                  </Link>

                  {/* Button 2: Dedicated View Specs Route Button */}
                  <Link href={`/products/${product._id}`} className="w-full">
                    <button
                      id={`card-view-btn-${product._id}`}
                      className="w-full btn-ghost py-2 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-[#f97316]"
                      title="View product specialization, dimensions, materials and images"
                    >
                      <Eye size={13} className="text-[#818cf8]" />
                      <span>View Specs</span>
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= TABLE VIEW ================= */
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[#14100e]/50">
                  {["Product", "Category", "Price", "Stock", "Status", "AI Studio Action", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3.5 text-xs font-bold text-[#7d6548] uppercase tracking-wider"
                      style={{ fontFamily: "Outfit" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr
                    key={product._id}
                    className="border-b border-[var(--border-subtle)] hover:bg-[#f97316]/[0.02] transition-colors"
                  >
                    {/* Product Name & Thumbnail */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative border border-[var(--border-subtle)]"
                          style={{ background: "#14100e" }}
                        >
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={16} className="text-[#7d6548]" />
                            </div>
                          )}
                          {product.isAIGenerated && (
                            <span className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-indigo-600 text-white">
                              <Mic size={9} />
                            </span>
                          )}
                        </div>
                        <div>
                          <Link href={`/products/${product._id}`}>
                            <div
                              className="font-bold text-sm text-[#f5efe6] hover:text-[#f97316] transition-colors"
                              style={{ fontFamily: "Outfit" }}
                            >
                              {product.name}
                            </div>
                          </Link>
                          {product.nameHindi && (
                            <div className="text-xs text-[#fb923c] font-devanagari mt-0.5">
                              {product.nameHindi}
                            </div>
                          )}
                          <div className="flex gap-1 mt-1">
                            {product.tags?.slice(0, 2).map((t) => (
                              <span key={t} className="badge badge-saffron text-[10px] py-0 px-1.5">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5">
                      <span className="badge badge-indigo text-xs capitalize">{product.category}</span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-sm text-[#f97316]" style={{ fontFamily: "Outfit" }}>
                        ₹{product.price.toLocaleString("en-IN")}
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold ${product.stock < 5 ? "text-amber-400" : "text-[#f5efe6]"}`}>
                        {product.stock} units
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => togglePublish(product._id, product.isPublished)}
                        className={`badge text-xs cursor-pointer transition-all ${
                          product.isPublished ? "badge-green" : "badge-saffron"
                        }`}
                      >
                        {product.isPublished ? "✓ Published" : "Draft"}
                      </button>
                    </td>

                    {/* DEDICATED AI STUDIO BUTTON COLUMN */}
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/ai-studio?productId=${product._id}&productName=${encodeURIComponent(product.name)}`}
                      >
                        <button
                          id={`table-studio-btn-${product._id}`}
                          className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shadow-sm shadow-orange-950/20"
                          title="Open in AI Product Studio to remove background & enhance images"
                        >
                          <span className="relative z-10 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-amber-300" />
                            <span>AI Studio</span>
                          </span>
                        </button>
                      </Link>
                    </td>

                    {/* VIEW SPECS AND OTHER ACTIONS */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {/* Dedicated View Product Route Button */}
                        <Link href={`/products/${product._id}`}>
                          <button
                            id={`table-view-btn-${product._id}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
                            title="View product specifications and images"
                          >
                            <Eye size={14} />
                          </button>
                        </Link>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}
                          title="Edit product"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
                          title="Delete product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
