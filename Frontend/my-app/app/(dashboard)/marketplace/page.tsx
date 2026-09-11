"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Search, Filter, ShoppingBag, MapPin, Star, Package, ExternalLink, MessageCircle } from "lucide-react";

const CATEGORIES = ["All", "textiles", "pottery", "jewelry", "woodwork", "metalwork", "paintings", "leather", "bamboo", "stone"];

const MOCK_PRODUCTS = [
  { _id: "1", name: "Banarasi Silk Saree", category: "textiles", price: 3500, description: "Hand-woven Banarasi silk with intricate gold zari work. Traditional motifs, 6 metres.", images: [], artisanId: { name: "Rekha Devi", region: "Varanasi", state: "Uttar Pradesh", craftType: "weaving", rating: 4.9 }, tags: ["silk", "banarasi", "handwoven", "GI-tagged"], stock: 12 },
  { _id: "2", name: "Blue Pottery Vase", category: "pottery", price: 850, description: "Jaipur Blue Pottery vase with traditional floral patterns. Turquoise and white glaze.", images: [], artisanId: { name: "Ravi Sharma", region: "Jaipur", state: "Rajasthan", craftType: "pottery", rating: 4.7 }, tags: ["blue pottery", "jaipur", "handmade"], stock: 8 },
  { _id: "3", name: "Kanjivaram Silk Saree", category: "textiles", price: 8500, description: "Authentic Kanjivaram silk saree with temple border and zari work. GI-tagged product.", images: [], artisanId: { name: "Muthu Selvam", region: "Kanchipuram", state: "Tamil Nadu", craftType: "weaving", rating: 5.0 }, tags: ["kanjivaram", "silk", "GI-tagged", "temple-border"], stock: 4 },
  { _id: "4", name: "Meenakari Jewelry Set", category: "jewelry", price: 4200, description: "Sterling silver Meenakari jewelry set — necklace, earrings, maangtika. Enamel work in traditional Rajasthani style.", images: [], artisanId: { name: "Rajkumar Soni", region: "Jaipur", state: "Rajasthan", craftType: "jewelry", rating: 4.8 }, tags: ["meenakari", "silver", "enamel", "traditional"], stock: 6 },
  { _id: "5", name: "Phulkari Dupatta", category: "textiles", price: 1200, description: "Hand-embroidered Phulkari dupatta in vivid colors. Traditional Punjabi folk art.", images: [], artisanId: { name: "Gurpreet Kaur", region: "Patiala", state: "Punjab", craftType: "embroidery", rating: 4.6 }, tags: ["phulkari", "embroidery", "punjab"], stock: 25 },
  { _id: "6", name: "Madhubani Painting", category: "paintings", price: 2800, description: "Authentic Madhubani painting on handmade paper. Traditional motifs — fish, lotus, elephant. Signed by artist.", images: [], artisanId: { name: "Sita Devi", region: "Madhubani", state: "Bihar", craftType: "painting", rating: 4.9 }, tags: ["madhubani", "painting", "folk-art", "GI-tagged"], stock: 3 },
];

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  images: Array<{ url: string }>;
  artisanId: { name: string; region: string; state: string; craftType: string; rating: number };
  tags: string[];
  stock: number;
}

export default function MarketplacePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [category, search]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category !== "All") params.append("category", category);
      params.append("limit", "12");

      const res = await axios.get(`http://localhost:5000/api/marketplace?${params}`);
      if (res.data.success && res.data.data.length > 0) {
        setProducts(res.data.data);
      } else {
        setProducts(MOCK_PRODUCTS.filter((p) =>
          (category === "All" || p.category === category) &&
          (!search || p.name.toLowerCase().includes(search.toLowerCase()))
        ));
      }
    } catch {
      setProducts(MOCK_PRODUCTS.filter((p) =>
        (category === "All" || p.category === category) &&
        (!search || p.name.toLowerCase().includes(search.toLowerCase()))
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
          🛍️ B2B Artisan Marketplace
        </h1>
        <p style={{ color: "#c4a882" }}>
          Browse authentic Indian handicrafts directly from artisans. Bulk orders welcome.
        </p>
      </div>

      {/* Search & filter bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#7d6548" }} />
          <input
            id="marketplace-search"
            type="text"
            placeholder="Search products, artisans, regions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                category === cat ? "gradient-saffron text-white" : "btn-ghost"
              }`}
              style={{ fontFamily: "Outfit" }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="glass-card h-64 shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <div key={product._id}
              className="glass-card glass-card-hover cursor-pointer overflow-hidden"
              onClick={() => setSelectedProduct(product)}>
              {/* Image */}
              <div className="h-44 overflow-hidden" style={{ background: "var(--bg-dark-3)" }}>
                {product.images?.[0]?.url ? (
                  <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Package size={32} style={{ color: "#7d6548" }} />
                    <span className="text-xs capitalize" style={{ color: "#7d6548" }}>{product.category}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="font-semibold text-sm mb-1 line-clamp-2" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                  {product.name}
                </div>
                <div className="flex items-center gap-1 mb-2 text-xs" style={{ color: "#c4a882" }}>
                  <MapPin size={11} />
                  {product.artisanId.region}, {product.artisanId.state}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black" style={{ fontFamily: "Outfit", color: "#f97316" }}>
                    ₹{product.price.toLocaleString("en-IN")}
                  </span>
                  <div className="flex items-center gap-1 text-xs" style={{ color: "#c4a882" }}>
                    <Star size={11} fill="#f97316" style={{ color: "#f97316" }} />
                    {product.artisanId.rating}
                  </div>
                </div>
                {product.tags?.slice(0, 2).map((tag) => (
                  <span key={tag} className="badge badge-saffron text-xs mr-1 mt-2">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
          onClick={() => setSelectedProduct(null)}>
          <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                  {selectedProduct.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: "#c4a882" }}>
                  <MapPin size={13} />
                  {selectedProduct.artisanId.region}, {selectedProduct.artisanId.state}
                  <Star size={13} fill="#f97316" style={{ color: "#f97316" }} />
                  {selectedProduct.artisanId.rating}
                </div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-2xl leading-none" style={{ color: "#7d6548" }}>✕</button>
            </div>

            <div className="h-52 rounded-xl mb-5 flex items-center justify-center"
              style={{ background: "var(--bg-dark-3)" }}>
              <Package size={60} style={{ color: "#7d6548" }} />
            </div>

            <p className="text-sm leading-relaxed mb-5" style={{ color: "#c4a882" }}>
              {selectedProduct.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              {selectedProduct.tags.map((tag) => (
                <span key={tag} className="badge badge-saffron">{tag}</span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg-dark-3)" }}>
                <div className="text-2xl font-black" style={{ fontFamily: "Outfit", color: "#f97316" }}>
                  ₹{selectedProduct.price.toLocaleString("en-IN")}
                </div>
                <div className="text-xs" style={{ color: "#7d6548" }}>per piece</div>
              </div>
              <div className="p-3 rounded-xl text-center" style={{ background: "var(--bg-dark-3)" }}>
                <div className="text-2xl font-black capitalize" style={{ fontFamily: "Outfit", color: "#818cf8" }}>
                  {selectedProduct.artisanId.craftType}
                </div>
                <div className="text-xs" style={{ color: "#7d6548" }}>craft type</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                <span className="relative z-10 flex items-center gap-2">
                  <MessageCircle size={16} /> Contact Artisan
                </span>
              </button>
              <button className="btn-ghost py-3 px-4 flex items-center gap-2">
                <ShoppingBag size={16} /> Request Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
