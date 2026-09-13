"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  Truck, CheckCircle2, Clock, Package, MapPin,
  Calendar, ShieldCheck, CreditCard, ChevronRight, AlertCircle, ShoppingBag
} from "lucide-react";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  artisanId?: {
    name: string;
    region: string;
    state: string;
    craftType: string;
  };
}

interface Order {
  _id: string;
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
  paymentStatus: "pending" | "completed" | "failed";
  paymentMethod: string;
  orderStatus: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
  tracking: {
    courier?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    updates: Array<{ status: string; note: string; timestamp: string }>;
  };
  createdAt: string;
}



const STEPS = [
  { key: "placed", label: "Order Placed", desc: "Verified & Paid" },
  { key: "confirmed", label: "Artisan Confirmed", desc: "Handcrafted & Packed" },
  { key: "shipped", label: "Dispatched / Shipped", desc: "On the way" },
  { key: "delivered", label: "Delivered", desc: "Handed over" },
];

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
      const res = await axios.get("http://localhost:5000/api/orders/my-orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedOrder(res.data.data[0]);
        }
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    switch (status) {
      case "placed": return 0;
      case "confirmed": return 1;
      case "shipped": return 2;
      case "delivered": return 3;
      default: return 0;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
            📦 My Orders & Live Tracking
          </h1>
          <p style={{ color: "#c4a882" }}>
            Track your handcrafted heritage products straight from the artisan&#39;s loom to your doorstep.
          </p>
        </div>
        <Link href="/marketplace">
          <button className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
            <ShoppingBag size={14} /> Browse More Crafts
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card h-40 shimmer" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package size={48} className="mx-auto text-blue-400/40 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Orders Placed Yet</h3>
          <p className="text-sm text-stone-400 mb-4">
            Discover authentic GI-tagged and handwoven crafts from master artisans across India.
          </p>
          <Link href="/marketplace">
            <button className="btn-primary text-xs px-4 py-2">
              Explore Marketplace 🛍️
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Cards List (Left Column) */}
          <div className="space-y-4 lg:col-span-1">
            <h3 className="text-xs uppercase tracking-wider font-bold text-stone-400 px-1">
              Your Purchases ({orders.length})
            </h3>
            {orders.map((order) => {
              const isSelected = selectedOrder?._id === order._id;
              return (
                <div
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                  className={`glass-card p-4 cursor-pointer transition-all border ${
                    isSelected
                      ? "border-blue-500/60 bg-blue-500/10 shadow-lg shadow-blue-500/10"
                      : "border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-blue-400">
                      {order._id}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${
                      order.orderStatus === "delivered"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : order.orderStatus === "shipped"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}>
                      {order.orderStatus}
                    </span>
                  </div>

                  <p className="font-bold text-white text-sm line-clamp-1 mb-1">
                    {order.items[0]?.name}
                  </p>

                  <div className="flex items-center justify-between text-xs text-stone-400 mt-2">
                    <span>₹{order.totalAmount.toLocaleString("en-IN")}</span>
                    <span>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Order Tracker & Details (Right 2 Columns) */}
          {selectedOrder && (
            <div className="lg:col-span-2 space-y-6">
              {/* Tracker Card */}
              <div className="glass-card p-6 border border-white/10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <div>
                    <span className="text-xs text-stone-400">Tracking Package</span>
                    <h2 className="text-xl font-bold text-white font-mono" style={{ fontFamily: "Outfit" }}>
                      {selectedOrder._id}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-stone-400 block">Courier & AWB</span>
                    <span className="text-xs font-semibold text-amber-400">
                      {selectedOrder.tracking?.courier || "India Post"} • {selectedOrder.tracking?.trackingNumber || "Assigned"}
                    </span>
                  </div>
                </div>

                {/* Stepper Bar */}
                <div className="relative pt-4 pb-2">
                  <div className="grid grid-cols-4 gap-2 relative z-10">
                    {STEPS.map((step, idx) => {
                      const activeIndex = getStepIndex(selectedOrder.orderStatus);
                      const isCompleted = idx <= activeIndex;
                      const isCurrent = idx === activeIndex;

                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-all ${
                              isCompleted
                                ? "gradient-saffron text-white shadow-md shadow-amber-500/30"
                                : "bg-stone-800 text-stone-500 border border-white/5"
                            }`}
                          >
                            {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                          </div>
                          <span
                            className={`text-xs font-bold leading-tight ${
                              isCurrent ? "text-amber-400" : isCompleted ? "text-white" : "text-stone-500"
                            }`}
                          >
                            {step.label}
                          </span>
                          <span className="text-[10px] text-stone-400 hidden sm:block mt-0.5">
                            {step.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Status Updates Timeline */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <p className="text-xs uppercase tracking-wider font-bold text-stone-300">
                    Activity & Journey Log
                  </p>
                  <div className="space-y-2.5">
                    {selectedOrder.tracking?.updates?.map((upd, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <div className="flex-1">
                          <p className="text-white font-medium">{upd.note}</p>
                          <p className="text-[11px] text-stone-400">
                            {new Date(upd.timestamp).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Items & Shipping Details */}
              <div className="glass-card p-6 border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Items */}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider font-bold text-stone-300">
                    Item Details
                  </p>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white text-sm">{item.name}</p>
                        <p className="text-xs text-amber-400/90 mt-0.5">
                          Artisan: {item.artisanId?.name || "Verified Karigar"} ({item.artisanId?.region || "India"})
                        </p>
                        <p className="text-xs text-stone-400 mt-0.5">
                          Qty: {item.quantity} × ₹{item.price.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-white" style={{ fontFamily: "Outfit" }}>
                          ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 px-1 text-sm font-bold border-t border-white/10">
                    <span className="text-stone-300">Total Paid:</span>
                    <span className="text-amber-400 text-lg" style={{ fontFamily: "Outfit" }}>
                      ₹{selectedOrder.totalAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wider font-bold text-stone-300">
                    Delivery Address
                  </p>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs">
                    <p className="font-bold text-white text-sm">{selectedOrder.shippingAddress?.name}</p>
                    <p className="text-stone-300 flex items-start gap-1.5">
                      <MapPin size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      {selectedOrder.shippingAddress?.address}, {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                    </p>
                    <p className="text-stone-400 pt-1">
                      Phone: {selectedOrder.shippingAddress?.phone}
                    </p>
                    <p className="text-stone-400">
                      Payment Mode: <span className="uppercase text-amber-400 font-semibold">{selectedOrder.paymentMethod}</span> (Status: <span className="text-emerald-400 uppercase font-semibold">{selectedOrder.paymentStatus}</span>)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
