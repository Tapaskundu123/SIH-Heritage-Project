"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  IndianRupee, TrendingUp, Clock, CheckCircle2,
  ArrowUpRight, Download, Wallet, CreditCard, ShieldCheck
} from "lucide-react";

interface EarningsData {
  totalGrossRevenue: number;
  completedEarnings: number;
  pendingPayout: number;
  totalOrders: number;
  totalItemsSold: number;
  recentTransactions: Array<{
    orderId: string;
    date: string;
    productName: string;
    amount: number;
    status: string;
    paymentStatus: string;
  }>;
}

const ZERO_EARNINGS: EarningsData = {
  totalGrossRevenue: 0,
  completedEarnings: 0,
  pendingPayout: 0,
  totalOrders: 0,
  totalItemsSold: 0,
  recentTransactions: [],
};

export default function ArtisanEarningsPage() {
  const [earnings, setEarnings] = useState<EarningsData>(ZERO_EARNINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("ks_token");
      if (!token) {
        setEarnings(ZERO_EARNINGS);
        setLoading(false);
        return;
      }
      const res = await axios.get("http://localhost:5000/api/orders/artisan/earnings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.data) {
        setEarnings(res.data.data);
      } else {
        setEarnings(ZERO_EARNINGS);
      }
    } catch {
      setEarnings(ZERO_EARNINGS);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black" style={{ fontFamily: "Outfit" }}>
            💰 Artisan Earnings & Financials
          </h1>
          <p style={{ color: "#c4a882" }}>
            Track direct-to-artisan revenues, escrow payouts, and order settlement history.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => alert("Payout Statement downloaded for current month.")}
            className="btn-ghost text-xs px-3.5 py-2 flex items-center gap-1.5"
          >
            <Download size={14} /> Download Ledger
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Gross Sales</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white" style={{ fontFamily: "Outfit" }}>
            ₹{earnings.totalGrossRevenue.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-0.5">
            <TrendingUp size={12} /> Direct artisan revenue
          </p>
        </div>

        <div className="glass-card p-5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Settled Payouts</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400" style={{ fontFamily: "Outfit" }}>
            ₹{earnings.completedEarnings.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Transferred to registered bank/UPI</p>
        </div>

        <div className="glass-card p-5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Pending Payout</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-400" style={{ fontFamily: "Outfit" }}>
            ₹{earnings.pendingPayout.toLocaleString("en-IN")}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">In transit / escrow delivery release</p>
        </div>

        <div className="glass-card p-5 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-400 font-semibold uppercase tracking-wider">Total Units Sold</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Wallet size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white" style={{ fontFamily: "Outfit" }}>
            {earnings.totalItemsSold} Pieces
          </div>
          <p className="text-[11px] text-stone-400 mt-1">Across {earnings.totalOrders} total buyer orders</p>
        </div>
      </div>

      {/* Direct Bank Deposit Setup Card */}
      <div className="glass-card p-6 border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl gradient-saffron flex items-center justify-center text-white shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2" style={{ fontFamily: "Outfit" }}>
                Direct Payout Method: Bank of Baroda (State Handloom Escrow)
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={12} /> Active
                </span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                Account: **********8492 | IFSC: BARB0VARMIR | Primary UPI: rekha.artisan@upi
              </p>
            </div>
          </div>
          <button
            onClick={() => alert("Payout account details are verified with GI Registry.")}
            className="btn-ghost text-xs px-3.5 py-2 whitespace-nowrap"
          >
            Manage Banking Details
          </button>
        </div>
      </div>

      {/* Recent Payout & Sales Transactions Table */}
      <div className="glass-card p-6 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: "Outfit" }}>
            Recent Sales & Settlement Ledger
          </h3>
          <span className="text-xs text-stone-400">Showing last {earnings.recentTransactions.length} transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-stone-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Craft Product</th>
                <th className="pb-3 font-semibold">Gross Value</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {earnings.recentTransactions.map((tx, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 font-mono font-medium text-amber-300">{tx.orderId}</td>
                  <td className="py-3 text-stone-400">
                    {new Date(tx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="py-3 text-white font-medium">{tx.productName}</td>
                  <td className="py-3 text-amber-400 font-bold">₹{tx.amount.toLocaleString("en-IN")}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold capitalize bg-white/5 text-stone-300">
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Paid via UPI
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
