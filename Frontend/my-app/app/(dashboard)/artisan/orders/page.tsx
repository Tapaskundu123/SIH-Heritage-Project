"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  ClipboardList, CheckCircle2, Truck, Package, Clock,
  Search, AlertCircle, Phone, MapPin, ExternalLink, Filter
} from "lucide-react";

type OrderStatus = "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Order {
  _id: string;
  buyerId?: {
    name: string;
    email: string;
    phone: string;
  };
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentStatus: string;
  paymentMethod: string;
  orderStatus: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
  tracking: {
    courier?: string;
    trackingNumber?: string;
    updates: Array<{ status: string; note: string; timestamp: string }>;
  };
  createdAt: string;
}

export default function ArtisanOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dispatchModalOrder, setDispatchModalOrder] = useState<Order | null>(null);
  const [courierName, setCourierName] = useState("India Post Speed Post");
  const [trackingNo, setTrackingNo] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ks_token");
      if (!token) {
        setOrders([]);
        return;
      }
      const res = await axios.get("http://localhost:5000/api/orders/artisan", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus, extra?: any) => {
    setStatusUpdating(true);
    try {
      const token = localStorage.getItem("ks_token");
      await axios.patch(
        `http://localhost:5000/api/orders/${orderId}/status`,
        { status, ...extra },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update local state
      setOrders((prev) =>
        prev.map((o) => {
          if (o._id === orderId) {
            return {
              ...o,
              orderStatus: status,
              tracking: {
                ...o.tracking,
                courier: extra?.courier || o.tracking.courier,
                trackingNumber: extra?.trackingNumber || o.tracking.trackingNumber,
                updates: [
                  ...o.tracking.updates,
                  { status, note: `Status updated to ${status}`, timestamp: new Date().toISOString() },
                ],
              },
            };
          }
          return o;
        })
      );
      setDispatchModalOrder(null);
    } catch {
      // Local optimistic update
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, orderStatus: status } : o))
      );
      setDispatchModalOrder(null);
    } finally {
      setStatusUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = filter === "all" || o.orderStatus === filter;
    const matchesSearch =
      !search ||
      o._id.toLowerCase().includes(search.toLowerCase()) ||
      o.shippingAddress?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "placed":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">New Order</span>;
      case "confirmed":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">Confirmed</span>;
      case "shipped":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">Dispatched</span>;
      case "delivered":
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Delivered</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-semibold bg-stone-500/20 text-stone-400">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
            🧵 Artisan Order Management
          </h1>
          <p style={{ color: "#c4a882" }}>
            Manage incoming craft orders from buyers, dispatch packages, and update delivery tracking.
          </p>
        </div>
        <button onClick={fetchOrders} className="btn-ghost text-xs px-3 py-2">
          🔄 Refresh Orders
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by Order ID, Buyer name, or craft product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {["all", "placed", "confirmed", "shipped", "delivered"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                filter === st ? "gradient-saffron text-white shadow-md shadow-amber-500/20" : "btn-ghost"
              }`}
            >
              {st === "all" ? "All Orders" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card h-32 shimmer" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList size={48} className="mx-auto text-amber-500/40 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Orders Found</h3>
          <p className="text-sm text-stone-400">
            {filter !== "all" ? `There are currently no orders with '${filter}' status.` : "Your craft products have not received any orders yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="glass-card p-5 border border-white/5 hover:border-amber-500/30 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-saffron flex items-center justify-center text-white font-bold text-sm">
                    🧵
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base" style={{ fontFamily: "Outfit" }}>
                        {order._id}
                      </span>
                      {getStatusBadge(order.orderStatus)}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-stone-400 block">Payout Value</span>
                    <span className="text-lg font-black text-amber-400" style={{ fontFamily: "Outfit" }}>
                      ₹{order.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex items-center gap-2">
                    {order.orderStatus === "placed" && (
                      <button
                        onClick={() => handleUpdateStatus(order._id, "confirmed")}
                        disabled={statusUpdating}
                        className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Accept & Confirm
                      </button>
                    )}

                    {order.orderStatus === "confirmed" && (
                      <button
                        onClick={() => {
                          setDispatchModalOrder(order);
                          setTrackingNo(`KS-TRK-${Math.floor(100000 + Math.random() * 900000)}`);
                        }}
                        disabled={statusUpdating}
                        className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
                      >
                        <Truck size={14} /> Dispatch / Ship
                      </button>
                    )}

                    {order.orderStatus === "shipped" && (
                      <button
                        onClick={() => handleUpdateStatus(order._id, "delivered")}
                        disabled={statusUpdating}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Mark as Delivered
                      </button>
                    )}

                    {order.orderStatus === "delivered" && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={14} /> Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Items & Shipping Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 text-xs">
                {/* Items */}
                <div className="space-y-2">
                  <p className="font-bold text-stone-300 uppercase tracking-wider text-[11px]">Items Ordered</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-stone-800 flex items-center justify-center text-amber-500">
                          📦
                        </div>
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-stone-400">Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                      <span className="font-bold text-amber-400">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Delivery Address */}
                <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <p className="font-bold text-stone-300 uppercase tracking-wider text-[11px]">Buyer & Delivery Address</p>
                  <p className="font-semibold text-white">{order.shippingAddress?.name || order.buyerId?.name}</p>
                  <p className="text-stone-400 flex items-center gap-1">
                    <MapPin size={12} className="text-amber-500 shrink-0" />
                    {order.shippingAddress?.address}, {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
                  </p>
                  <p className="text-stone-400 flex items-center gap-1">
                    <Phone size={12} className="text-amber-500 shrink-0" />
                    {order.shippingAddress?.phone || order.buyerId?.phone}
                  </p>
                  {order.tracking?.trackingNumber && (
                    <p className="text-amber-300 font-mono text-[11px] pt-1">
                      Courier: {order.tracking.courier} | Tracking No: {order.tracking.trackingNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Modal */}
      {dispatchModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "Outfit" }}>
              🚚 Dispatch Package
            </h3>
            <p className="text-xs text-stone-400">
              Provide courier and tracking details for order <strong>{dispatchModalOrder._id}</strong>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Courier Partner</label>
              <select
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                className="input-dark"
              >
                <option value="India Post Speed Post">India Post Speed Post (Govt Handloom Partner)</option>
                <option value="Blue Dart Express">Blue Dart Express</option>
                <option value="DTDC Courier">DTDC Courier</option>
                <option value="Delhivery Surface">Delhivery Surface</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Tracking Number / AWB</label>
              <input
                type="text"
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="e.g. KS-TRK-784920"
                className="input-dark"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDispatchModalOrder(null)}
                className="btn-ghost flex-1 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateStatus(dispatchModalOrder._id, "shipped", {
                    courier: courierName,
                    trackingNumber: trackingNo,
                  })
                }
                disabled={statusUpdating || !trackingNo}
                className="btn-primary flex-1 py-2 text-xs"
              >
                {statusUpdating ? "Dispatching..." : "Confirm Dispatch 🚀"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
