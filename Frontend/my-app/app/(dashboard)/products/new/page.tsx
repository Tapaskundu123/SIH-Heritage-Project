"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import { Upload, Mic, Save, ArrowLeft, Tag, Package, AlertCircle, Check, Loader2 } from "lucide-react";

const CATEGORIES = ["textiles", "pottery", "jewelry", "woodwork", "metalwork", "paintings", "leather", "bamboo", "stone", "other"];

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", category: "textiles", description: "", price: "",
    stock: "10", unit: "piece", materials: "", tags: "",
    craftTechnique: "", isPublished: false, isB2BListed: false,
  });
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 5,
    onDrop: (files) => {
      setImages(files);
      setPreviews(files.map((f) => URL.createObjectURL(f)));
    },
  });

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("ks_token");
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
      images.forEach((img) => formData.append("images", img));
      formData.set("materials", form.materials.split(",").map(s => s.trim()).join(","));
      formData.set("tags", form.tags.split(",").map(s => s.trim()).join(","));

      await axios.post("http://localhost:5000/api/products", {
        ...form,
        price: Number(form.price) || 0,
        stock: Number(form.stock) > 0 ? Number(form.stock) : 10,
        materials: form.materials.split(",").map(s => s.trim()).filter(Boolean),
        tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSuccess(true);
      setTimeout(() => router.push("/products"), 1500);
    } catch {
      setError("Failed to save product. Please check all required fields.");
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
        <Check size={40} style={{ color: "#34d399" }} />
      </div>
      <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Outfit", color: "#34d399" }}>Product Saved!</h2>
      <p style={{ color: "#c4a882" }}>Redirecting to your products...</p>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/products">
          <button className="btn-ghost py-2 px-3 flex items-center gap-1 text-sm">
            <ArrowLeft size={15} /> Back
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-black" style={{ fontFamily: "Outfit" }}>Add New Product</h1>
          <p className="text-sm" style={{ color: "#c4a882" }}>Or use <Link href="/voice-cataloger" style={{ color: "#f97316" }}>Voice Cataloger</Link> to add automatically</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="glass-card p-6 space-y-5">
        <h2 className="font-bold" style={{ fontFamily: "Outfit" }}>Product Details</h2>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
            Product Images (max 5)
          </label>
          <div {...getRootProps()} className={`upload-zone p-5 text-center ${isDragActive ? "drag-active" : ""}`}>
            <input {...getInputProps()} id="new-product-images" />
            {previews.length > 0 ? (
              <div className="flex gap-2 flex-wrap justify-center">
                {previews.map((p, i) => (
                  <img key={i} src={p} alt="" className="w-20 h-20 object-cover rounded-lg" />
                ))}
              </div>
            ) : (
              <div>
                <Upload size={28} className="mx-auto mb-2" style={{ color: "#7d6548" }} />
                <p className="text-sm" style={{ color: "#c4a882" }}>Drop images here or click to browse</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
              <Package size={13} className="inline mr-1" /> Product Name *
            </label>
            <input className="input-dark" placeholder="e.g. Banarasi Silk Saree" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Category *</label>
            <select className="input-dark" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Description *</label>
            <textarea className="input-dark resize-none" rows={4} placeholder="Describe your product — materials, technique, dimensions, unique features..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Price (₹) *</label>
            <input type="number" className="input-dark" placeholder="0" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Stock Quantity</label>
            <input type="number" className="input-dark" placeholder="0" value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Materials (comma separated)</label>
            <input className="input-dark" placeholder="silk, gold thread, cotton" value={form.materials}
              onChange={(e) => setForm({ ...form, materials: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
              <Tag size={13} className="inline mr-1" /> Tags
            </label>
            <input className="input-dark" placeholder="handmade, banarasi, traditional" value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Craft Technique</label>
            <input className="input-dark" placeholder="e.g. Zari weaving, Hand embroidery" value={form.craftTechnique}
              onChange={(e) => setForm({ ...form, craftTechnique: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Unit</label>
            <select className="input-dark" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {["piece", "pair", "set", "metre", "kg", "dozen"].map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
            <input type="checkbox" checked={form.isPublished} className="w-4 h-4 accent-orange-500"
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Publish to marketplace
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
            <input type="checkbox" checked={form.isB2BListed} className="w-4 h-4 accent-orange-500"
              onChange={(e) => setForm({ ...form, isB2BListed: e.target.checked })} />
            List on B2B marketplace
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/products" className="btn-ghost py-3 px-5">Cancel</Link>
          <button id="new-product-save" onClick={handleSubmit} disabled={loading || !form.name || !form.price}
            className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
            <span className="relative z-10 flex items-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Product</>}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
