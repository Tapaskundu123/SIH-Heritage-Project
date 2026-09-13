"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import {
  ArrowLeft,
  Sparkles,
  Wand2,
  Share2,
  Edit,
  Trash2,
  CheckCircle2,
  Tag,
  Package,
  MapPin,
  Clock,
  ShieldCheck,
  Maximize2,
  Layers,
  ShoppingBag,
  Mic,
  Sliders,
  ChevronRight,
  ExternalLink,
  Info,
  BadgeAlert,
  Loader2,
  ImageIcon,
  Eye,
  Check,
  Copy,
} from "lucide-react";

interface ProductImage {
  url: string;
  isOriginal?: boolean;
  isEnhanced?: boolean;
  isBgRemoved?: boolean;
}

interface ProductDetails {
  _id: string;
  name: string;
  nameHindi?: string;
  nameRegional?: string;
  description: string;
  descriptionHindi?: string;
  category: string;
  subCategory?: string;
  price: number;
  suggestedPrice?: number;
  stock: number;
  unit?: string;
  minOrderQuantity?: number;
  isPublished: boolean;
  isB2BListed?: boolean;
  isAIGenerated?: boolean;
  aiConfidenceScore?: number;
  voiceTranscript?: string;
  detectedLanguage?: string;
  images: ProductImage[];
  tags: string[];
  materials?: string[];
  craftTechnique?: string;
  region?: string;
  dimensions?: string;
  weight?: string;
  careInstructions?: string[];
  views?: number;
  createdAt: string;
  artisanId?: {
    _id?: string;
    name?: string;
    region?: string;
    craftType?: string;
  };
}

const FALLBACK_PRODUCTS: Record<string, ProductDetails> = {
  "1": {
    _id: "1",
    name: "Banarasi Pure Katan Silk Handloom Saree",
    nameHindi: "बनारसी शुद्ध कातान सिल्क हथकरघा साड़ी",
    description:
      "Masterpiece Banarasi handloom saree woven with gold and silver Zari (Kadhwa weave) depicting traditional floral jaal and paisley motifs. Woven on traditional pit-looms by 5th-generation weavers of Varanasi.",
    descriptionHindi:
      "पारंपरिक पुष्प जाल और पैस्ले रूपांकनों को दर्शाते हुए सोने और चांदी की ज़री (कढ़वा बुनाई) के साथ बुनी गई उत्कृष्ट बनारसी हथकरघा साड़ी।",
    category: "textiles",
    subCategory: "Kadhwa Handloom Silk",
    price: 3500,
    suggestedPrice: 4200,
    stock: 12,
    unit: "saree (6.5m with blouse)",
    minOrderQuantity: 1,
    isPublished: true,
    isB2BListed: true,
    isAIGenerated: true,
    aiConfidenceScore: 0.98,
    voiceTranscript:
      "यह शुद्ध कातान बनारसी साड़ी है जौन हाथ से बनल बा। सोना चांदी जरी कढ़वा काम बा। बनाने में बीस दिन लगल बा। दाम पैंतीस सौ रुपया है।",
    detectedLanguage: "hi",
    images: [
      {
        url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80",
        isEnhanced: true,
      },
      {
        url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80",
        isOriginal: true,
      },
      {
        url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=80",
        isBgRemoved: true,
      },
    ],
    tags: ["banarasi", "silk", "handloom", "zari", "wedding", "varanasi"],
    materials: ["Pure Mulberry Katan Silk", "Pure Tested Silver-Gold Zari", "Natural Vegetable Dye"],
    craftTechnique: "Kadhwa Handloom Weave with Jacquard Needle Punch",
    region: "Varanasi, Uttar Pradesh (GI Tagged)",
    dimensions: "5.5 meters length + 0.8 meter matching blouse piece, 45 inches width",
    weight: "780 grams",
    careInstructions: [
      "Strictly dry clean only to protect delicate Zari threads",
      "Store wrapped in unbleached pure cotton muslin cloth",
      "Change folds every 3 months to prevent crease marks",
      "Keep away from direct perfumes and moisture",
    ],
    views: 142,
    createdAt: "2024-09-01",
  },
  "2": {
    _id: "2",
    name: "Jaipur Traditional Blue Pottery Floral Vase",
    nameHindi: "जयपुर पारंपरिक ब्लू पॉटरी फ्लोरल फूलदान",
    description:
      "Authentic GI-certified Jaipur Blue Pottery vase crafted from quartz stone powder, fullers earth, and natural gum without clay. Hand-painted with Persian-origin cobalt blue and turquoise floral arabesques.",
    descriptionHindi:
      "क्वार्ट्ज पाउडर और प्राकृतिक गोंद से निर्मित पारंपरिक जयपुर ब्लू पॉटरी फूलदान। कोबाल्ट नीले और फिरोज़ी रंगों से हस्त-चित्रित।",
    category: "pottery",
    subCategory: "GI Blue Pottery",
    price: 850,
    suggestedPrice: 1100,
    stock: 4,
    unit: "piece",
    minOrderQuantity: 2,
    isPublished: false,
    isB2BListed: false,
    isAIGenerated: false,
    images: [
      {
        url: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80",
        isEnhanced: true,
      },
      {
        url: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=1200&q=80",
        isOriginal: true,
      },
    ],
    tags: ["bluepottery", "jaipur", "handcrafted", "ceramic", "vase", "rajasthan"],
    materials: ["Quartz Stone Powder", "Glass Powder", "Multani Mitti (Fullers Earth)", "Copper Oxide / Cobalt Blue Dyes"],
    craftTechnique: "Clay-free Dough Mold & Low Firing at 800°C with Hand Brush Glazing",
    region: "Kot Jewar, Jaipur, Rajasthan",
    dimensions: "10 inches height × 4.5 inches base diameter",
    weight: "620 grams",
    careInstructions: [
      "Wipe gently with soft damp cotton cloth",
      "Do not submerge in boiling water or dishwashers",
      "Handle with care; decorative art piece",
    ],
    views: 89,
    createdAt: "2024-09-02",
  },
  "3": {
    _id: "3",
    name: "Handmade Mithila Madhubani Kohbar Painting",
    nameHindi: "हस्तनिर्मित मिथिला मधुबनी कोहबर चित्रकला",
    description:
      "Traditional Mithila painting executed with bamboo nibs and natural organic vegetable dyes on handmade cow-dung primed paper. Depicts sacred Kohbar auspicious motifs celebrating prosperity, fertility, and nature.",
    descriptionHindi:
      "बांस की निब और प्राकृतिक रंगों से हस्तनिर्मित मधुबनी चित्रकला। देवी-देवताओं, पक्षी और जीवन के पारंपरिक प्रतीक।",
    category: "paintings",
    subCategory: "Mithila Folk Painting",
    price: 1800,
    suggestedPrice: 2400,
    stock: 6,
    unit: "framed canvas sheet",
    minOrderQuantity: 1,
    isPublished: true,
    isB2BListed: true,
    isAIGenerated: true,
    aiConfidenceScore: 0.96,
    voiceTranscript:
      "य मधुबनी पेन्टिंग बिहार के मशहूर लोकला है जैमा प्राकृतिक रंग से देवी देवता पशु पक्षी फूल पत्ता और गाँव के जीवन के सुंदर चित्र पारंपरिक तरीका से बनावल जाला अउर एकर दाम अठारह सौ है।",
    detectedLanguage: "hi",
    images: [
      {
        url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
        isEnhanced: true,
      },
      {
        url: "https://images.unsplash.com/photo-1582561424760-0321d75e81fa?auto=format&fit=crop&w=1200&q=80",
        isOriginal: true,
      },
    ],
    tags: ["madhubani", "mithila", "folkart", "painting", "bihar", "handmade"],
    materials: ["Handmade Cotton Pulp Paper", "Lampblack (Kajal)", "Aparajita Flower Extract", "Turmeric Pigment"],
    craftTechnique: "Kachni (fine line hatching) and Bharni (solid color filling) via bamboo twigs",
    region: "Madhubani, North Bihar",
    dimensions: "22 inches × 15 inches (unframed sheet)",
    weight: "180 grams",
    careInstructions: [
      "Mount under UV-reflective protective glass",
      "Avoid direct exposure to moisture or intense sunlight",
    ],
    views: 215,
    createdAt: "2024-09-03",
  },
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = (params?.id as string) || "1";

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isComparing, setIsComparing] = useState(false);
  const [activeTab, setActiveTab] = useState<"specs" | "heritage" | "provenance" | "commercial">("specs");
  const [copiedLink, setCopiedLink] = useState(false);
  const [canvasBg, setCanvasBg] = useState<"checker" | "white" | "dark" | "cream">("dark");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("ks_token") : null;
        const res = await axios.get(`http://localhost:5000/api/products/${productId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.data.success && res.data.data) {
          const apiData = res.data.data;
          // Ensure images array is present
          if (!apiData.images || apiData.images.length === 0) {
            apiData.images = FALLBACK_PRODUCTS[productId]?.images || [
              {
                url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80",
                isOriginal: true,
              },
            ];
          }
          setProduct(apiData);
        } else {
          setProduct(FALLBACK_PRODUCTS[productId] || FALLBACK_PRODUCTS["1"]);
        }
      } catch {
        setProduct(FALLBACK_PRODUCTS[productId] || FALLBACK_PRODUCTS["1"]);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const togglePublish = async () => {
    if (!product) return;
    const newStatus = !product.isPublished;
    setProduct((prev) => (prev ? { ...prev, isPublished: newStatus } : null));
    try {
      const token = localStorage.getItem("ks_token");
      await axios.put(
        `http://localhost:5000/api/products/${product._id}`,
        { isPublished: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // Keep optimistic update
    }
  };

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center space-y-4">
        <Loader2 size={40} className="animate-spin mx-auto text-[#f97316]" />
        <p className="text-[#c4a882] font-semibold text-lg" style={{ fontFamily: "Outfit" }}>
          Loading craft specialization & studio visuals...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4 glass-card p-10">
        <Package size={56} className="mx-auto text-[#7d6548]" />
        <h2 className="text-2xl font-bold text-[#f5efe6]">Product Not Found</h2>
        <p className="text-[#c4a882]">The requested artisan product could not be located in your catalog.</p>
        <Link href="/products">
          <button className="btn-primary mt-4">Return to Catalog</button>
        </Link>
      </div>
    );
  }

  const currentImage = product.images?.[selectedImageIdx]?.url || product.images?.[0]?.url;
  const originalImage = product.images?.find((img) => img.isOriginal)?.url || product.images?.[0]?.url;
  const enhancedImage =
    product.images?.find((img) => img.isEnhanced)?.url ||
    product.images?.[1]?.url ||
    product.images?.[0]?.url;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 page-enter">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex items-center gap-3">
          <Link href="/products">
            <button className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors glass-card hover:bg-[#261d17]">
              <ArrowLeft size={18} className="text-[#c4a882]" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#7d6548] uppercase tracking-wider">
              <span>Catalog</span>
              <ChevronRight size={12} />
              <span className="text-[#f97316] capitalize">{product.category}</span>
              <ChevronRight size={12} />
              <span className="text-[#c4a882]">{product._id.slice(-6)}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f5efe6]" style={{ fontFamily: "Outfit" }}>
              {product.name}
            </h1>
            {product.nameHindi && (
              <p className="text-sm font-medium text-[#fb923c] font-devanagari mt-0.5">
                {product.nameHindi}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Prominent AI Studio Action Button */}
          <Link href={`/ai-studio?productId=${product._id}&productName=${encodeURIComponent(product.name)}`}>
            <button
              id="product-open-studio-btn"
              className="btn-primary flex items-center gap-2 py-2.5 px-4 text-sm font-semibold shadow-lg shadow-orange-950/40 hover:scale-[1.02] transition-transform"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-300 animate-spin" style={{ animationDuration: "6s" }} />
                <span>AI Image Studio</span>
                <span className="badge badge-saffron text-[10px] ml-1 bg-white/20 border-0 py-0.5 px-1.5 text-white">Add Images</span>
              </span>
            </button>
          </Link>

          <button
            onClick={togglePublish}
            className={`badge text-xs py-2 px-3 cursor-pointer font-medium transition-all ${
              product.isPublished ? "badge-green" : "badge-saffron"
            }`}
          >
            {product.isPublished ? "✓ Published in Store" : "Draft (Unpublished)"}
          </button>

          <button
            onClick={copyShareLink}
            className="btn-ghost flex items-center gap-1.5 py-2 px-3 text-xs"
            title="Copy product link"
          >
            {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            {copiedLink ? "Copied!" : "Share"}
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery & Visuals (Left) + Specialization & Specs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ================= LEFT COLUMN: IMAGES & AI STUDIO VIEWER (7 cols) ================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Visual Showcase Viewport */}
          <div className="glass-card overflow-hidden p-4 border border-[#f97316]/20">
            {/* Viewport Top Bar with Studio Badges and Canvas Controls */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <span className="badge badge-indigo text-xs flex items-center gap-1">
                  <ShieldCheck size={12} /> GI Heritage Certified
                </span>
                {product.images?.[selectedImageIdx]?.isEnhanced && (
                  <span className="badge badge-saffron text-xs flex items-center gap-1">
                    <Sparkles size={12} /> Image Enhancer
                  </span>
                )}
                {product.images?.[selectedImageIdx]?.isBgRemoved && (
                  <span className="badge badge-green text-xs flex items-center gap-1">
                    <Layers size={12} /> Background Removed
                  </span>
                )}
              </div>

              {/* Compare Button & Canvas backdrop picker */}
              <div className="flex items-center gap-2">
                {product.images && product.images.length > 1 && (
                  <button
                    onClick={() => setIsComparing(!isComparing)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                      isComparing
                        ? "bg-[#f97316]/20 border-[#f97316] text-[#f97316]"
                        : "border-[var(--border-subtle)] text-[#c4a882] hover:text-white"
                    }`}
                  >
                    <Sliders size={12} />
                    {isComparing ? "Exit Split View" : "Before / After"}
                  </button>
                )}

                <div className="flex items-center gap-1 bg-[#14100e] p-1 rounded-lg border border-[var(--border-subtle)]">
                  {[
                    { id: "dark", bg: "#1e1712", label: "Dark" },
                    { id: "white", bg: "#ffffff", label: "White" },
                    { id: "cream", bg: "#fdf8ee", label: "Cream" },
                    { id: "checker", bg: "repeating-conic-gradient(#555 0% 25%, #222 0% 50%) 0 0 / 8px 8px", label: "Transparent" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      title={c.label}
                      onClick={() => setCanvasBg(c.id as any)}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: c.bg,
                        border: canvasBg === c.id ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.2)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Visual Viewport Area */}
            <div
              className="relative w-full rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300 select-none"
              style={{
                minHeight: 440,
                maxHeight: 560,
                background:
                  canvasBg === "white"
                    ? "#ffffff"
                    : canvasBg === "cream"
                    ? "#fdf8ee"
                    : canvasBg === "checker"
                    ? "repeating-conic-gradient(#3a332d 0% 25%, #241e18 0% 50%) 0 0 / 16px 16px"
                    : "#14100e",
              }}
            >
              {isComparing && originalImage && enhancedImage ? (
                /* Interactive Split Slider Comparison */
                <div
                  className="relative w-full h-[460px] overflow-hidden cursor-ew-resize"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                    setSliderPosition((x / rect.width) * 100);
                  }}
                  onTouchMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const touch = e.touches[0];
                    const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
                    setSliderPosition((x / rect.width) * 100);
                  }}
                >
                  {/* Enhanced Image (Base) */}
                  <img
                    src={enhancedImage}
                    alt="AI Studio Enhanced"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />

                  {/* Original Image (Clipped Overlay) */}
                  <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img
                      src={originalImage}
                      alt="Original Capture"
                      className="absolute inset-0 w-full h-full object-contain max-w-none"
                      style={{ width: "100%", height: "100%" }}
                    />
                  </div>

                  {/* Vertical Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#f97316] pointer-events-none shadow-[0_0_12px_#f97316]"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#f97316] text-white flex items-center justify-center shadow-lg border-2 border-[#14100e]">
                      <Sliders size={14} />
                    </div>
                  </div>

                  {/* Labels */}
                  <span className="absolute bottom-3 left-3 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-black/70 text-white backdrop-blur-md">
                    Original Phone Photo
                  </span>
                  <span className="absolute bottom-3 right-3 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#f97316] text-white backdrop-blur-md">
                    AI Studio Enhanced
                  </span>
                </div>
              ) : currentImage ? (
                /* Normal High-Res Image View */
                <img
                  src={currentImage}
                  alt={product.name}
                  className="max-h-[460px] w-full object-contain p-2 rounded-lg transition-transform hover:scale-[1.02] duration-300"
                />
              ) : (
                <div className="text-center py-24 space-y-3">
                  <ImageIcon size={48} className="mx-auto text-[#7d6548]" />
                  <p className="text-[#c4a882] text-sm">No images attached to this product yet.</p>
                </div>
              )}
            </div>

            {/* Thumbnail Carousel Bar */}
            <div className="flex items-center gap-3 mt-4 overflow-x-auto pb-1">
              {product.images?.map((img, idx) => {
                const isSelected = selectedImageIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedImageIdx(idx);
                      setIsComparing(false);
                    }}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all border-2 ${
                      isSelected ? "border-[#f97316] scale-105 shadow-md shadow-orange-950/40" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    style={{ background: "#14100e" }}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.isEnhanced && (
                      <span className="absolute bottom-1 right-1 p-0.5 rounded bg-[#f97316] text-white">
                        <Sparkles size={10} />
                      </span>
                    )}
                    {img.isBgRemoved && (
                      <span className="absolute bottom-1 left-1 p-0.5 rounded bg-emerald-600 text-white">
                        <Layers size={10} />
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Add More Images in AI Studio Card Tile */}
              <Link
                href={`/ai-studio?productId=${product._id}&productName=${encodeURIComponent(product.name)}`}
                className="flex-shrink-0"
              >
                <div className="w-20 h-20 rounded-xl border border-dashed border-[#f97316]/50 flex flex-col items-center justify-center gap-1 text-[#f97316] hover:bg-[#f97316]/10 transition-colors p-2 text-center">
                  <Wand2 size={16} />
                  <span className="text-[10px] font-bold leading-tight">AI Studio Add</span>
                </div>
              </Link>
            </div>
          </div>

          {/* AI Image Studio Action Banner Tile */}
          <div className="glass-card p-5 border-l-4 border-l-[#f97316] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#f97316]" />
                <h4 className="font-bold text-sm text-[#f5efe6]" style={{ fontFamily: "Outfit" }}>
                  AI Product Studio Integration
                </h4>
              </div>
              <p className="text-xs text-[#c4a882]">
                Need more studio angles or lifestyle backdrops? Generate clean transparent PNGs and studio-quality enhanced images.
              </p>
            </div>
            <Link
              href={`/ai-studio?productId=${product._id}&productName=${encodeURIComponent(product.name)}`}
              className="flex-shrink-0"
            >
              <button className="btn-primary py-2 px-4 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
                <span className="relative z-10 flex items-center gap-1.5">
                  <Wand2 size={13} /> Launch Studio for this Product
                </span>
              </button>
            </Link>
          </div>

          {/* Voice Provenance Card */}
          {product.voiceTranscript && (
            <div className="glass-card p-5 border border-indigo-500/20 bg-indigo-950/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                  <Mic size={16} />
                  <span>Artisan&#39;s Voice Cataloging Story</span>
                </div>
                {product.aiConfidenceScore && (
                  <span className="badge badge-indigo text-[10px]">
                    Confidence {(product.aiConfidenceScore * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-[#f5efe6]/90 italic font-devanagari bg-[#14100e]/70 p-3 rounded-lg border border-[var(--border-subtle)]">
                “{product.voiceTranscript}”
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#7d6548]">
                <span>Language: <strong className="text-[#c4a882] uppercase">{product.detectedLanguage || "hi"}</strong></span>
                <span>•</span>
                <span>Verified Product Catalog</span>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: SPECIALIZATION & COMMERCIAL SPECS (5 cols) ================= */}
        <div className="lg:col-span-5 space-y-5">
          {/* Price, Stock & Commercialization Card */}
          <div className="glass-card p-6 border border-[#f97316]/30 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-[#7d6548] uppercase tracking-wider">Selling Price</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-[#f97316]" style={{ fontFamily: "Outfit" }}>
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                  {product.suggestedPrice && product.suggestedPrice > product.price && (
                    <span className="text-sm line-through text-[#7d6548]">
                      ₹{product.suggestedPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-medium text-[#7d6548] uppercase tracking-wider">Inventory</span>
                <div className="flex items-center gap-1.5 mt-1 justify-end">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      product.stock > 5 ? "bg-emerald-400" : product.stock > 0 ? "bg-amber-400" : "bg-red-400"
                    }`}
                  />
                  <span className="text-sm font-bold text-[#f5efe6]">
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="p-2.5 rounded-xl bg-[#14100e] border border-[var(--border-subtle)]">
                <div className="text-[11px] text-[#7d6548] font-medium">Unit Format</div>
                <div className="text-xs font-semibold text-[#f5efe6] capitalize mt-0.5">
                  {product.unit || "per piece"}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#14100e] border border-[var(--border-subtle)]">
                <div className="text-[11px] text-[#7d6548] font-medium">B2B Wholesale MOQ</div>
                <div className="text-xs font-semibold text-[#f5efe6] mt-0.5">
                  {product.minOrderQuantity || 1} units minimum
                </div>
              </div>
            </div>

            {/* Quick Add Images in AI Studio Button (Direct CTA) */}
            <Link
              href={`/ai-studio?productId=${product._id}&productName=${encodeURIComponent(product.name)}`}
              className="block"
            >
              <button className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold">
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles size={16} /> Enhance / Add Photos in AI Studio
                </span>
              </button>
            </Link>
          </div>

          {/* Craft Specialization Tabs */}
          <div className="glass-card overflow-hidden">
            <div className="flex border-b border-[var(--border-subtle)] bg-[#14100e]/50">
              {[
                { id: "specs", label: "Specialization", icon: <Sliders size={13} /> },
                { id: "heritage", label: "Artisan & Origin", icon: <MapPin size={13} /> },
                { id: "commercial", label: "Commercial", icon: <Tag size={13} /> },
              ].map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex-1 py-3 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                      isActive
                        ? "border-[#f97316] text-[#f97316] bg-[#f97316]/05"
                        : "border-transparent text-[#7d6548] hover:text-[#c4a882]"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="p-5 space-y-4">
              {/* TAB 1: TECHNICAL SPECIALIZATION */}
              {activeTab === "specs" && (
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#7d6548] mb-1.5">Description</h5>
                    <p className="text-sm text-[#f5efe6]/90 leading-relaxed">{product.description}</p>
                    {product.descriptionHindi && (
                      <p className="text-xs text-[#fb923c] font-devanagari mt-2 border-l-2 border-[#fb923c] pl-2">
                        {product.descriptionHindi}
                      </p>
                    )}
                  </div>

                  {/* Materials */}
                  {product.materials && product.materials.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#7d6548] mb-2">Authentic Materials</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {product.materials.map((m, i) => (
                          <span key={i} className="badge badge-saffron text-xs py-1 px-2.5">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dimensions & Weight Matrix */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {product.dimensions && (
                      <div className="p-3 rounded-lg bg-[#14100e] border border-[var(--border-subtle)]">
                        <div className="text-[10px] uppercase font-bold text-[#7d6548]">Dimensions</div>
                        <div className="text-xs font-semibold text-[#f5efe6] mt-0.5">{product.dimensions}</div>
                      </div>
                    )}
                    {product.weight && (
                      <div className="p-3 rounded-lg bg-[#14100e] border border-[var(--border-subtle)]">
                        <div className="text-[10px] uppercase font-bold text-[#7d6548]">Craft Weight</div>
                        <div className="text-xs font-semibold text-[#f5efe6] mt-0.5">{product.weight}</div>
                      </div>
                    )}
                  </div>

                  {/* Care Instructions */}
                  {product.careInstructions && product.careInstructions.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-[#7d6548] mb-2">Preservation & Care</h5>
                      <ul className="space-y-1.5">
                        {product.careInstructions.map((c, i) => (
                          <li key={i} className="text-xs text-[#c4a882] flex items-start gap-2">
                            <CheckCircle2 size={14} className="text-[#f97316] flex-shrink-0 mt-0.5" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: HERITAGE & ARTISAN ORIGIN */}
              {activeTab === "heritage" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#14100e] border border-[var(--border-subtle)] flex items-start gap-3">
                    <MapPin className="text-[#f97316] flex-shrink-0 mt-0.5" size={18} />
                    <div>
                      <div className="text-xs font-bold text-[#f5efe6]">Regional Geographic Provenance</div>
                      <div className="text-sm font-semibold text-[#c4a882] mt-0.5">
                        {product.region || "Heritage Craft Cluster, India"}
                      </div>
                      <span className="badge badge-saffron text-[10px] mt-1.5">GI Geographical Indication</span>
                    </div>
                  </div>

                  {product.craftTechnique && (
                    <div className="p-3.5 rounded-xl bg-[#14100e] border border-[var(--border-subtle)] space-y-1">
                      <div className="text-xs font-bold text-[#f5efe6]">Craft Technique & Lineage</div>
                      <p className="text-xs text-[#c4a882] leading-relaxed">{product.craftTechnique}</p>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-[#14100e] border border-[var(--border-subtle)] space-y-1">
                    <div className="text-xs font-bold text-[#f5efe6]">Artisan Guarantee</div>
                    <p className="text-xs text-[#c4a882] leading-relaxed">
                      100% handcrafted by certified master craftspersons. Every purchase directly empowers traditional weaver & artisan lineages with fair wages.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: COMMERCIAL METRICS & DISCOVERY */}
              {activeTab === "commercial" && (
                <div className="space-y-4">
                  {/* Tags */}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[#7d6548] mb-2">Marketplace Tags</h5>
                    <div className="flex flex-wrap gap-1.5">
                      {product.tags?.map((tag) => (
                        <span key={tag} className="badge badge-indigo text-xs py-1 px-2.5">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* B2B Listing Status */}
                  <div className="p-3 rounded-lg bg-[#14100e] border border-[var(--border-subtle)] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#f5efe6]">B2B Wholesale Catalog</div>
                      <div className="text-[11px] text-[#7d6548]">Available for bulk boutique buyers</div>
                    </div>
                    <span className={`badge text-xs ${product.isB2BListed ? "badge-green" : "badge-saffron"}`}>
                      {product.isB2BListed ? "Active" : "Retail Only"}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-[#14100e] border border-[var(--border-subtle)] text-center">
                      <div className="text-2xl font-black text-[#f5efe6]" style={{ fontFamily: "Outfit" }}>
                        {product.views || 48}
                      </div>
                      <div className="text-[10px] text-[#7d6548] uppercase tracking-wider">Catalog Views</div>
                    </div>
                    <div className="p-3 rounded-lg bg-[#14100e] border border-[var(--border-subtle)] text-center">
                      <div className="text-2xl font-black text-[#10b981]" style={{ fontFamily: "Outfit" }}>
                        100%
                      </div>
                      <div className="text-[10px] text-[#7d6548] uppercase tracking-wider">Authenticity Score</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
