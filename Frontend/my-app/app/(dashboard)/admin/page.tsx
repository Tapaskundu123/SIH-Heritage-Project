"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Shield, Users, Package, ShoppingBag, IndianRupee,
  CheckCircle2, XCircle, AlertTriangle, Search, Filter,
  Trash2, ShieldCheck, Eye, RefreshCw, BarChart3, Clock
} from "lucide-react";

interface AdminAnalytics {
  totalUsers: number;
  totalArtisans: number;
  verifiedArtisans: number;
  totalBuyers: number;
  totalProducts: number;
  publishedProducts: number;
  totalOrders: number;
  completedOrders: number;
  totalGMV: number;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "artisan" | "buyer" | "admin";
  craftType?: string;
  region?: string;
  state?: string;
  isVerified?: boolean;
  createdAt: string;
}

interface ProductItem {
  _id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isPublished: boolean;
  isAIGenerated?: boolean;
  artisanId?: {
    name?: string;
    state?: string;
    region?: string;
  };
}

interface OrderItem {
  _id: string;
  buyerId?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{ name: string; price: number; quantity: number }>;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  tracking?: {
    courier?: string;
    trackingNumber?: string;
  };
  createdAt: string;
}

const INITIAL_ANALYTICS: AdminAnalytics = {
  totalUsers: 0,
  totalArtisans: 0,
  verifiedArtisans: 0,
  totalBuyers: 0,
  totalProducts: 0,
  publishedProducts: 0,
  totalOrders: 0,
  completedOrders: 0,
  totalGMV: 0,
};

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<"analytics" | "users" | "products" | "orders">("analytics");
  const [analytics, setAnalytics] = useState<AdminAnalytics>(INITIAL_ANALYTICS);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // User filters
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");

  // Product filters
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    const token = localStorage.getItem("ks_token");
    if (!token) {
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [analyticsRes, usersRes, productsRes, ordersRes] = await Promise.allSettled([
        axios.get("http://localhost:5000/api/admin/analytics", { headers }),
        axios.get("http://localhost:5000/api/admin/users", { headers }),
        axios.get("http://localhost:5000/api/admin/products", { headers }),
        axios.get("http://localhost:5000/api/orders/admin/all", { headers }),
      ]);

      if (analyticsRes.status === "fulfilled" && analyticsRes.value.data.success) {
        setAnalytics(analyticsRes.value.data.data);
      }
      if (usersRes.status === "fulfilled" && usersRes.value.data.success && Array.isArray(usersRes.value.data.data)) {
        setUsers(usersRes.value.data.data);
      }
      if (productsRes.status === "fulfilled" && productsRes.value.data.success && Array.isArray(productsRes.value.data.data)) {
        setProducts(productsRes.value.data.data);
      }
      if (ordersRes.status === "fulfilled" && ordersRes.value.data.success && Array.isArray(ordersRes.value.data.data)) {
        setOrders(ordersRes.value.data.data);
      }
    } catch {
      // Keep real empty states
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerify = async (userId: string, currentStatus?: boolean) => {
    try {
      const token = localStorage.getItem("ks_token");
      const res = await axios.patch(
        `http://localhost:5000/api/admin/users/${userId}/verify`,
        { isVerified: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isVerified: !currentStatus } : u))
        );
      }
    } catch {
      // Local optimistic update
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isVerified: !currentStatus } : u))
      );
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this user from the platform?")) return;
    try {
      const token = localStorage.getItem("ks_token");
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch {
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Remove product from public marketplace?")) return;
    try {
      const token = localStorage.getItem("ks_token");
      await axios.delete(`http://localhost:5000/api/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch {
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
    const matchesSearch =
      !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.state && u.state.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const filteredProducts = products.filter(
    (p) =>
      !productSearch ||
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.artisanId?.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center gap-1">
              <Shield size={12} /> Platform Administrator
            </span>
          </div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
            Admin Console & Moderation
          </h1>
          <p style={{ color: "#c4a882" }}>
            Monitor platform metrics, manage registered users, verify artisan credentials, and supervise orders.
          </p>
        </div>
        <button onClick={fetchAdminData} className="btn-ghost text-xs px-3.5 py-2 flex items-center gap-1.5 self-start">
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Admin Tab Switcher */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {[
          { key: "analytics", label: "Overview & Analytics", icon: BarChart3 },
          { key: "users", label: `Manage Users (${users.length})`, icon: Users },
          { key: "products", label: `Product Moderation (${products.length})`, icon: Package },
          { key: "orders", label: `Platform Orders (${orders.length})`, icon: ShoppingBag },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "text-stone-400 hover:text-white bg-white/5"
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Analytics */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-400 font-semibold uppercase">Platform GMV</span>
                <IndianRupee size={16} className="text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white" style={{ fontFamily: "Outfit" }}>
                ₹{analytics.totalGMV.toLocaleString("en-IN")}
              </div>
              <p className="text-[11px] text-emerald-400 mt-1">Gross merchandise volume</p>
            </div>

            <div className="glass-card p-5 border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-400 font-semibold uppercase">Artisans / Karigars</span>
                <Users size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400" style={{ fontFamily: "Outfit" }}>
                {analytics.totalArtisans}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                <strong className="text-emerald-400">{analytics.verifiedArtisans} Verified</strong> by GI Registry
              </p>
            </div>

            <div className="glass-card p-5 border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-400 font-semibold uppercase">Buyers & Customers</span>
                <ShoppingBag size={16} className="text-blue-400" />
              </div>
              <div className="text-2xl font-black text-blue-400" style={{ fontFamily: "Outfit" }}>
                {analytics.totalBuyers}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Active retail & B2B buyers</p>
            </div>

            <div className="glass-card p-5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-stone-400 font-semibold uppercase">Orders Processed</span>
                <Package size={16} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400" style={{ fontFamily: "Outfit" }}>
                {analytics.totalOrders}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">{analytics.completedOrders} Delivered</p>
            </div>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6 border border-white/5 space-y-3">
              <h3 className="text-base font-bold text-white" style={{ fontFamily: "Outfit" }}>
                Artisan Verification Compliance Status
              </h3>
              <p className="text-xs text-stone-400">
                Out of {analytics.totalArtisans} onboarded artisans, {analytics.verifiedArtisans} have submitted verified GI / Aadhaar certificates.
              </p>
              <div className="w-full bg-stone-800 h-3 rounded-full overflow-hidden">
                <div
                  className="gradient-saffron h-full rounded-full"
                  style={{ width: `${Math.round((analytics.verifiedArtisans / (analytics.totalArtisans || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-stone-400 pt-1">
                <span>Verification Rate: {Math.round((analytics.verifiedArtisans / (analytics.totalArtisans || 1)) * 100)}%</span>
                <button onClick={() => setActiveTab("users")} className="text-amber-400 hover:underline">
                  Review Artisans →
                </button>
              </div>
            </div>

            <div className="glass-card p-6 border border-white/5 space-y-3">
              <h3 className="text-base font-bold text-white" style={{ fontFamily: "Outfit" }}>
                Catalog AI Generation & Quality Control
              </h3>
              <p className="text-xs text-stone-400">
                {analytics.publishedProducts} of {analytics.totalProducts} handcrafted listings are currently live and accessible to national buyers.
              </p>
              <div className="w-full bg-stone-800 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${Math.round((analytics.publishedProducts / (analytics.totalProducts || 1)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-stone-400 pt-1">
                <span>Published Rate: {Math.round((analytics.publishedProducts / (analytics.totalProducts || 1)) * 100)}%</span>
                <button onClick={() => setActiveTab("products")} className="text-emerald-400 hover:underline">
                  Moderate Products →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Manage Users & Artisan Verification */}
      {activeTab === "users" && (
        <div className="glass-card p-6 border border-white/5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search user name, email, or state..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input-dark pl-9"
              />
            </div>

            <div className="flex gap-1.5">
              {["all", "artisan", "buyer", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    userRoleFilter === r
                      ? "bg-purple-600 text-white"
                      : "btn-ghost"
                  }`}
                >
                  {r === "all" ? "All Users" : r}
                </button>
              ))}
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-stone-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Role</th>
                  <th className="pb-3 font-semibold">Region & State</th>
                  <th className="pb-3 font-semibold">Craft / Trade</th>
                  <th className="pb-3 font-semibold">Verification Status</th>
                  <th className="pb-3 font-semibold text-right">Moderator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3">
                      <p className="font-bold text-white text-sm">{u.name}</p>
                      <p className="text-stone-400 text-[11px]">{u.email}</p>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === "admin"
                          ? "bg-purple-500/20 text-purple-300"
                          : u.role === "buyer"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 text-stone-300">
                      {u.region ? `${u.region}, ${u.state}` : u.state || "India"}
                    </td>
                    <td className="py-3 text-stone-300 capitalize">
                      {u.craftType || "-"}
                    </td>
                    <td className="py-3">
                      {u.role === "artisan" ? (
                        u.isVerified ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <CheckCircle2 size={12} /> Verified Artisan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/20 flex items-center gap-1 w-fit">
                            <Clock size={12} /> Pending Verification
                          </span>
                        )
                      ) : (
                        <span className="text-stone-500">N/A (Buyer)</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.role === "artisan" && (
                          <button
                            onClick={() => handleToggleVerify(u._id, u.isVerified)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                              u.isVerified
                                ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            <ShieldCheck size={12} />
                            {u.isVerified ? "Revoke Verification" : "Verify Artisan ✓"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={15} />
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

      {/* Tab 3: Product Moderation */}
      {activeTab === "products" && (
        <div className="glass-card p-6 border border-white/5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search products by title, artisan, or craft category..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="input-dark pl-9"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-stone-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Product Name</th>
                  <th className="pb-3 font-semibold">Artisan / Weaver</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Price</th>
                  <th className="pb-3 font-semibold">Stock</th>
                  <th className="pb-3 font-semibold">Catalog Status</th>
                  <th className="pb-3 font-semibold text-right">Moderator Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProducts.map((p) => (
                  <tr key={p._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3">
                      <p className="font-bold text-white text-sm">{p.name}</p>
                      {p.isAIGenerated && (
                        <span className="text-[10px] text-amber-400">✨ AI Studio Enhanced</span>
                      )}
                    </td>
                    <td className="py-3 text-stone-300">
                      {p.artisanId?.name || "Artisan"} ({p.artisanId?.region || "India"})
                    </td>
                    <td className="py-3 capitalize text-stone-300">{p.category}</td>
                    <td className="py-3 font-bold text-amber-400">₹{p.price.toLocaleString("en-IN")}</td>
                    <td className="py-3 text-stone-300">{p.stock} in stock</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-400">
                        Live / Published
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDeleteProduct(p._id)}
                        className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold transition-all flex items-center gap-1 ml-auto"
                      >
                        <Trash2 size={12} /> Remove Listing
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Platform Orders */}
      {activeTab === "orders" && (
        <div className="glass-card p-6 border border-white/5 space-y-4">
          <h3 className="text-base font-bold text-white" style={{ fontFamily: "Outfit" }}>
            Real-Time Platform Order Feed
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-stone-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Order ID</th>
                  <th className="pb-3 font-semibold">Buyer</th>
                  <th className="pb-3 font-semibold">Items</th>
                  <th className="pb-3 font-semibold">Total Value</th>
                  <th className="pb-3 font-semibold">Payment</th>
                  <th className="pb-3 font-semibold">Order Status</th>
                  <th className="pb-3 font-semibold">Courier & AWB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((o) => (
                  <tr key={o._id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono font-bold text-purple-300">{o._id}</td>
                    <td className="py-3">
                      <p className="font-bold text-white">{o.buyerId?.name || "Customer"}</p>
                      <p className="text-stone-400 text-[11px]">{o.buyerId?.email || "-"}</p>
                    </td>
                    <td className="py-3 text-stone-300">{o.items[0]?.name}</td>
                    <td className="py-3 font-bold text-amber-400">₹{o.totalAmount.toLocaleString("en-IN")}</td>
                    <td className="py-3">
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-stone-300">
                        {o.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 capitalize">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        o.orderStatus === "delivered"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : o.orderStatus === "shipped"
                          ? "bg-purple-500/20 text-purple-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}>
                        {o.orderStatus}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-stone-400">
                      {o.tracking?.courier || "India Post"} • {o.tracking?.trackingNumber || "-"}
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
