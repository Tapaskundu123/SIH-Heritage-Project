"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Mic, Image as ImageIcon, Package, BarChart3,
  ShoppingBag, Boxes, LogOut, Menu, X, Bell, ChevronRight,
  ClipboardList, IndianRupee, ShieldCheck, Users, Truck, TrendingUp
} from "lucide-react";
import axios from "axios";

interface UserProfile {
  _id?: string;
  name?: string;
  email?: string;
  role?: "artisan" | "buyer" | "admin";
  craftType?: string;
  region?: string;
  state?: string;
  isVerified?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  section?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("ks_token");
    const isPublic = pathname === "/marketplace" || pathname === "/pricing";

    if (!token && !isPublic) {
      router.push("/auth/login");
      return;
    }

    const saved = localStorage.getItem("ks_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        // ignore JSON error
      }
    }

    if (token) {
      // Validate token with real backend profile endpoint
      axios
        .get("http://localhost:5000/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          if (res.data.success && res.data.data) {
            const profile = res.data.data;
            const finalRole = profile.role || user?.role || "artisan";
            const updated = { ...profile, role: finalRole };
            setUser(updated);
            localStorage.setItem("ks_user", JSON.stringify(updated));
          }
        })
        .catch(() => {
          if (!isPublic) {
            localStorage.removeItem("ks_token");
            localStorage.removeItem("ks_user");
            router.push("/auth/login");
          }
        })
        .finally(() => {
          setLoadingProfile(false);
        });
    } else {
      setLoadingProfile(false);
    }
  }, [router, pathname]);

  const userRole = user?.role || "artisan";

  // Build role-specific navigation strictly based on authenticated role
  const getNavItems = () => {
    if (userRole === "buyer") {
      return [
        { href: "/marketplace", label: "Browse Crafts", icon: ShoppingBag, badge: "Catalog" },
        { href: "/buyer/orders", label: "My Orders & Tracking", icon: Truck },
        { href: "/buyer/checkout", label: "Cart & Checkout", icon: ClipboardList },
      ];
    }

    if (userRole === "admin") {
      return [
        { href: "/admin", label: "Admin Analytics", icon: LayoutDashboard, badge: "Portal" },
        { href: "/marketplace", label: "Marketplace View", icon: ShoppingBag },
      ];
    }

    // Default: Artisan / Karigar — exact sequential order of the creation pipeline
    return [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { section: "AI Listing Pipeline", href: "/ai-studio", label: "AI Photo Studio", icon: ImageIcon, badge: "Step 1" },
      { href: "/voice-cataloger", label: "Voice Cataloger", icon: Mic, badge: "Step 2" },
      { href: "/onboarding/price-prediction", label: "AI Price Prediction", icon: TrendingUp, badge: "Step 3" },
      { href: "/products", label: "Product Catalog", icon: Package, badge: "Step 4" },
      { section: "Store & Operations", href: "/pricing", label: "Pricing Calculator", icon: BarChart3 },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/artisan/orders", label: "Manage Orders", icon: ClipboardList, badge: "Orders" },
      { href: "/artisan/earnings", label: "Earnings & Sales", icon: IndianRupee },
      { href: "/marketplace", label: "B2B Marketplace", icon: ShoppingBag },
    ];
  };

  const navItems = getNavItems();
  const currentLabel =
    navItems.find((n) => pathname === n.href || (pathname.startsWith(n.href + "/") && n.href !== "/"))?.label ||
    "KarigarSetu Portal";

  const logout = () => {
    localStorage.removeItem("ks_token");
    localStorage.removeItem("ks_user");
    router.push("/auth/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-dark-2)" }}>
      {/* Logo */}
      <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--border-subtle)" }}>
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-saffron flex items-center justify-center">
            <span className="text-white font-bold text-sm" style={{ fontFamily: "Outfit" }}>KS</span>
          </div>
          <div>
            <span className="text-lg font-bold block leading-tight" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
              Karigar<span style={{ color: "#f97316" }}>Setu</span>
            </span>
            <span className="text-[10px] text-amber-500/80 font-medium tracking-wide">HERITAGE COMMERCE</span>
          </div>
        </Link>
      </div>

      {/* Authenticated User Profile Card */}
      {!mounted ? (
        <div className="m-3 p-3.5 rounded-xl border border-white/5 bg-white/[0.02] h-[66px] animate-pulse" />
      ) : user ? (
        <div
          className="m-3 p-3.5 rounded-xl border"
          style={{
            background:
              userRole === "admin"
                ? "rgba(168,85,247,0.08)"
                : userRole === "buyer"
                ? "rgba(59,130,246,0.08)"
                : "rgba(249,115,22,0.08)",
            borderColor:
              userRole === "admin"
                ? "rgba(168,85,247,0.2)"
                : userRole === "buyer"
                ? "rgba(59,130,246,0.2)"
                : "rgba(249,115,22,0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                userRole === "admin" ? "bg-purple-600" : userRole === "buyer" ? "bg-blue-600" : "gradient-saffron"
              }`}
            >
              {user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate text-white" style={{ fontFamily: "Outfit" }}>
                {user.name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                    userRole === "admin"
                      ? "bg-purple-500/20 text-purple-300"
                      : userRole === "buyer"
                      ? "bg-blue-500/20 text-blue-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {userRole}
                </span>
                {userRole === "artisan" && user.isVerified && (
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <ShieldCheck size={11} /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="m-3 p-3.5 rounded-xl border border-white/10 bg-white/5 text-center">
          <p className="text-xs text-stone-300 mb-2">You are viewing as Guest</p>
          <Link href="/auth/login">
            <button className="btn-primary w-full py-2 text-xs font-bold">
              Sign In
            </button>
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 px-3 py-1">
          {userRole === "admin" ? "Administration" : userRole === "buyer" ? "Customer Portal" : "Artisan Studio"}
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/");
          return (
            <div key={item.href}>
              {item.section && (
                <div className="text-[10px] uppercase tracking-wider font-semibold text-stone-500 px-3 pt-3 pb-1 mt-1 border-t border-white/5">
                  {item.section}
                </div>
              )}
              <Link href={item.href} onClick={() => setSidebarOpen(false)}>
                <div className={`sidebar-item ${isActive ? "active" : ""}`}>
                  <item.icon size={18} />
                  <span className="flex-1 text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight size={14} style={{ color: "#f97316" }} />}
                </div>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      {user && (
        <div className="p-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <button
            className="sidebar-item w-full text-left text-xs font-medium"
            onClick={logout}
            style={{ color: "#f87171" }}
          >
            <LogOut size={16} />
            Sign Out ({user.name?.split(" ")[0]})
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen" style={{ background: "var(--bg-dark)" }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0" style={{ borderRight: "1px solid var(--border-subtle)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-72 flex flex-col shadow-2xl">
            <button className="absolute top-4 right-4 z-10" onClick={() => setSidebarOpen(false)} style={{ color: "#c4a882" }}>
              <X size={20} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="flex items-center justify-between px-6 py-3.5"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-dark-2)" }}
        >
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)} style={{ color: "#c4a882" }}>
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-base font-semibold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
                {currentLabel}
              </h1>
              {user && (
                <p className="text-[11px] capitalize text-amber-500/80">
                  Authorized Role: {userRole}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!user ? (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <button className="btn-ghost text-xs px-3.5 py-1.5">Sign In</button>
                </Link>
                <Link href="/auth/register">
                  <button className="btn-primary text-xs px-3.5 py-1.5">Register</button>
                </Link>
              </div>
            ) : (
              <>
                {userRole === "artisan" && (
                  <Link href="/products/new">
                    <button className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5">
                      <span className="relative z-10">+ Upload Product</span>
                    </button>
                  </Link>
                )}

                {userRole === "buyer" && (
                  <Link href="/buyer/orders">
                    <button className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5">
                      <Truck size={14} className="relative z-10" />
                      <span className="relative z-10">Track Orders</span>
                    </button>
                  </Link>
                )}

                {userRole === "admin" && (
                  <div className="px-2.5 py-1 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1">
                    <ShieldCheck size={14} /> Admin Mode
                  </div>
                )}
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
