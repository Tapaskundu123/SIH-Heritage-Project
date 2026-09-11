"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Plus, Package, Search, Filter, Mic, Eye, Edit, Trash2, Loader2, ImageIcon } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isPublished: boolean;
  isAIGenerated: boolean;
  images: Array<{ url: string }>;
  tags: string[];
  createdAt: string;
}

const MOCK: Product[] = [
  { _id: "1", name: "Banarasi Silk Saree", category: "textiles", price: 3500, stock: 12, isPublished: true, isAIGenerated: true, images: [], tags: ["silk", "banarasi"], createdAt: "2024-09-01" },
  { _id: "2", name: "Blue Pottery Vase", category: "pottery", price: 850, stock: 3, isPublished: false, isAIGenerated: false, images: [], tags: ["pottery", "blue"], createdAt: "2024-09-02" },
  { _id: "3", name: "Phulkari Dupatta", category: "textiles", price: 1200, stock: 25, isPublished: true, isAIGenerated: true, images: [], tags: ["embroidery"], createdAt: "2024-09-03" },
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("ks_token");
        const res = await axios.get("http://localhost:5000/api/products", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) setProducts(res.data.data);
        else setProducts(MOCK);
      } catch {
        setProducts(MOCK);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const togglePublish = async (id: string, current: boolean) => {
    try {
      const token = localStorage.getItem("ks_token");
      await axios.put(`http://localhost:5000/api/products/${id}`, { isPublished: !current }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts((prev) => prev.map((p) => p._id === id ? { ...p, isPublished: !current } : p));
    } catch {
      setProducts((prev) => prev.map((p) => p._id === id ? { ...p, isPublished: !current } : p));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>📦 My Products</h1>
          <p style={{ color: "#c4a882" }}>{products.length} products in your catalog</p>
        </div>
        <div className="flex gap-3">
          <Link href="/voice-cataloger">
            <button className="btn-ghost flex items-center gap-2 py-2.5 px-4 text-sm">
              <Mic size={16} style={{ color: "#f97316" }} /> Voice Add
            </button>
          </Link>
          <Link href="/products/new">
            <button className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm">
              <span className="relative z-10 flex items-center gap-2"><Plus size={16} /> Add Product</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#7d6548" }} />
        <input id="products-search" type="text" placeholder="Search products..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="input-dark pl-10" />
      </div>

      {/* Products table */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-3" style={{ color: "#f97316" }} />
          <p style={{ color: "#c4a882" }}>Loading products...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package size={48} className="mx-auto mb-4" style={{ color: "#7d6548" }} />
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: "Outfit", color: "#c4a882" }}>No products found</h3>
          <Link href="/voice-cataloger">
            <button className="btn-primary px-6 py-2.5 mt-4 flex items-center gap-2 mx-auto">
              <span className="relative z-10 flex items-center gap-2"><Mic size={16} /> Add with Voice</span>
            </button>
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Product", "Category", "Price", "Stock", "Status", "Source", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ fontFamily: "Outfit", color: "#7d6548" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product._id} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(249,115,22,0.03)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ background: "var(--bg-dark-3)" }}>
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={16} style={{ color: "#7d6548" }} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>{product.name}</div>
                          <div className="flex gap-1 mt-0.5">
                            {product.tags.slice(0, 2).map((t) => (
                              <span key={t} className="badge badge-saffron" style={{ fontSize: 10, padding: "2px 6px" }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-indigo text-xs capitalize">{product.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold" style={{ fontFamily: "Outfit", color: "#f97316" }}>₹{product.price.toLocaleString("en-IN")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: product.stock < 5 ? "#f59e0b" : "#f5efe6" }}>{product.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish(product._id, product.isPublished)}
                        className={`badge text-xs cursor-pointer transition-all ${product.isPublished ? "badge-green" : "badge-saffron"}`}>
                        {product.isPublished ? "✓ Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {product.isAIGenerated ? (
                        <span className="badge badge-indigo text-xs">🤖 AI Voice</span>
                      ) : (
                        <span className="badge text-xs" style={{ background: "rgba(255,255,255,0.05)", color: "#7d6548", border: "1px solid var(--border-subtle)" }}>Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/products/${product._id}`}>
                          <button className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>
                            <Eye size={13} />
                          </button>
                        </Link>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
                          <Edit size={13} />
                        </button>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                          <Trash2 size={13} />
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
