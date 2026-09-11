"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Boxes, AlertTriangle, Plus, Minus, RefreshCw, Package, Loader2,
  TrendingUp, TrendingDown, Check, X
} from "lucide-react";

interface InventoryItem {
  _id: string;
  currentStock: number;
  lowStockThreshold: number;
  totalProduced: number;
  totalSold: number;
  lastRestockedAt?: string;
  productId: {
    _id: string;
    name: string;
    category: string;
    unit: string;
    price: number;
    images: Array<{ url: string }>;
  };
}

const MOCK_INVENTORY: InventoryItem[] = [
  { _id: "1", currentStock: 12, lowStockThreshold: 5, totalProduced: 50, totalSold: 38, productId: { _id: "p1", name: "Banarasi Silk Saree", category: "textiles", unit: "piece", price: 3500, images: [] } },
  { _id: "2", currentStock: 3, lowStockThreshold: 5, totalProduced: 20, totalSold: 17, productId: { _id: "p2", name: "Blue Pottery Vase", category: "pottery", unit: "piece", price: 850, images: [] } },
  { _id: "3", currentStock: 25, lowStockThreshold: 10, totalProduced: 100, totalSold: 75, productId: { _id: "p3", name: "Phulkari Dupatta", category: "textiles", unit: "piece", price: 1200, images: [] } },
  { _id: "4", currentStock: 2, lowStockThreshold: 5, totalProduced: 15, totalSold: 13, productId: { _id: "p4", name: "Dhokra Figurine", category: "metalwork", unit: "piece", price: 2400, images: [] } },
];

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateModal, setUpdateModal] = useState<{ item: InventoryItem; type: "in" | "out" | "adjust" } | null>(null);
  const [updateQty, setUpdateQty] = useState("");
  const [updateNote, setUpdateNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem("ks_token");
      const res = await axios.get("http://localhost:5000/api/inventory", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setInventory(res.data.data);
      else setInventory(MOCK_INVENTORY);
    } catch {
      setInventory(MOCK_INVENTORY);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!updateModal || !updateQty) return;
    setUpdating(true);
    try {
      const token = localStorage.getItem("ks_token");
      await axios.post("http://localhost:5000/api/inventory/update", {
        productId: updateModal.item.productId._id,
        type: updateModal.type === "in" ? "stock_in" : updateModal.type === "out" ? "stock_out" : "adjustment",
        quantity: Number(updateQty),
        note: updateNote,
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchInventory();
      setUpdateModal(null);
      setUpdateQty("");
      setUpdateNote("");
    } catch {
      // Demo: update locally
      setInventory((prev) => prev.map((item) => {
        if (item._id !== updateModal.item._id) return item;
        const qty = Number(updateQty);
        if (updateModal.type === "in") return { ...item, currentStock: item.currentStock + qty, totalProduced: item.totalProduced + qty };
        if (updateModal.type === "out") return { ...item, currentStock: Math.max(0, item.currentStock - qty), totalSold: item.totalSold + qty };
        return { ...item, currentStock: qty };
      }));
      setUpdateModal(null);
      setUpdateQty("");
    } finally {
      setUpdating(false);
    }
  };

  const lowStockItems = inventory.filter((i) => i.currentStock <= i.lowStockThreshold);
  const totalStock = inventory.reduce((sum, i) => sum + i.currentStock, 0);
  const totalSold = inventory.reduce((sum, i) => sum + i.totalSold, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
          📦 Inventory Management
        </h1>
        <p style={{ color: "#c4a882" }}>Track your stock levels and get low-stock alerts.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: inventory.length, icon: Boxes, color: "#f97316" },
          { label: "Total Stock", value: totalStock, icon: Package, color: "#818cf8" },
          { label: "Total Sold", value: totalSold, icon: TrendingUp, color: "#34d399" },
          { label: "Low Stock Alerts", value: lowStockItems.length, icon: AlertTriangle, color: lowStockItems.length > 0 ? "#f59e0b" : "#34d399" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${s.color}20` }}>
              <s.icon size={20} style={{ color: s.color }} />
            </div>
            <div className="text-3xl font-black" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>{s.value}</div>
            <div className="text-sm mt-1" style={{ color: "#7d6548" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Low stock alerts */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertTriangle size={20} style={{ color: "#f59e0b" }} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold" style={{ fontFamily: "Outfit", color: "#f59e0b" }}>
              {lowStockItems.length} Product{lowStockItems.length > 1 ? "s" : ""} Running Low!
            </div>
            <div className="text-sm mt-1" style={{ color: "#c4a882" }}>
              {lowStockItems.map((i) => i.productId.name).join(", ")} — restock soon to avoid missing orders.
            </div>
          </div>
        </div>
      )}

      {/* Inventory table */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-3" style={{ color: "#f97316" }} />
          <p style={{ color: "#c4a882" }}>Loading inventory...</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Product", "Category", "In Stock", "Sold", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold"
                      style={{ fontFamily: "Outfit", color: "#7d6548" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const isLow = item.currentStock <= item.lowStockThreshold;
                  const isOut = item.currentStock === 0;
                  return (
                    <tr key={item._id} className="transition-colors"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(249,115,22,0.03)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                          {item.productId.name}
                        </div>
                        <div className="text-xs" style={{ color: "#7d6548" }}>₹{item.productId.price} / {item.productId.unit}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-indigo text-xs capitalize">{item.productId.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold" style={{ fontFamily: "Outfit", color: isOut ? "#f87171" : isLow ? "#f59e0b" : "#f5efe6" }}>
                            {item.currentStock}
                          </span>
                          <span className="text-xs" style={{ color: "#7d6548" }}>/ {item.lowStockThreshold} min</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold" style={{ color: "#34d399" }}>{item.totalSold}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <span className="badge badge-red text-xs">Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge text-xs" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                            ⚠️ Low Stock
                          </span>
                        ) : (
                          <span className="badge badge-green text-xs">✓ In Stock</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setUpdateModal({ item, type: "in" })}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}
                            title="Add stock">
                            <Plus size={13} />
                          </button>
                          <button onClick={() => setUpdateModal({ item, type: "out" })}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}
                            title="Remove stock">
                            <Minus size={13} />
                          </button>
                          <button onClick={() => setUpdateModal({ item, type: "adjust" })}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                            style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}
                            title="Adjust stock">
                            <RefreshCw size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Update stock modal */}
      {updateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="glass-card p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                {updateModal.type === "in" ? "➕ Add Stock" : updateModal.type === "out" ? "➖ Remove Stock" : "🔄 Adjust Stock"}
              </h3>
              <button onClick={() => setUpdateModal(null)} style={{ color: "#7d6548" }}><X size={18} /></button>
            </div>
            <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--bg-dark-3)" }}>
              <div className="font-semibold text-sm" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>{updateModal.item.productId.name}</div>
              <div className="text-xs mt-1" style={{ color: "#c4a882" }}>Current stock: {updateModal.item.currentStock} {updateModal.item.productId.unit}s</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>
                  {updateModal.type === "adjust" ? "Set stock to" : "Quantity"}
                </label>
                <input type="number" className="input-dark" placeholder="0" value={updateQty}
                  onChange={(e) => setUpdateQty(e.target.value)} min="0" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#c4a882", fontFamily: "Outfit" }}>Note (optional)</label>
                <input type="text" className="input-dark" placeholder="e.g. New batch, Festival order" value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setUpdateModal(null)} className="btn-ghost flex-1 py-2.5">Cancel</button>
                <button onClick={handleUpdateStock} disabled={!updateQty || updating}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                  <span className="relative z-10 flex items-center gap-2">
                    {updating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Update
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
