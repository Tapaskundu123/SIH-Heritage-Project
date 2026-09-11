"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Mic, Image as ImageIcon, Package, BarChart3,
  ShoppingBag, Boxes, LogOut, Menu, X, Bell, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/voice-cataloger", label: "Voice Cataloger", icon: Mic, badge: "⭐" },
  { href: "/ai-studio", label: "AI Photo Studio", icon: ImageIcon },
  { href: "/products", label: "My Products", icon: Package },
  { href: "/pricing", label: "Pricing Assistant", icon: BarChart3 },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/marketplace", label: "B2B Marketplace", icon: ShoppingBag },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; craftType?: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ks_token");
    const userData = localStorage.getItem("ks_user");
    if (!token) {
      router.push("/auth/login");
      return;
    }
    if (userData) setUser(JSON.parse(userData));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("ks_token");
    localStorage.removeItem("ks_user");
    router.push("/");
  };

  const currentLabel = NAV_ITEMS.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.label || "Dashboard";

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-dark-2)" }}>
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-saffron flex items-center justify-center">
            <span className="text-white font-bold text-sm" style={{ fontFamily: "Outfit" }}>KS</span>
          </div>
          <span className="text-lg font-bold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>
            Karigar<span style={{ color: "#f97316" }}>Setu</span>
          </span>
        </Link>
      </div>

      {/* User chip */}
      {user && (
        <div className="m-4 p-3 rounded-xl" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gradient-saffron flex items-center justify-center text-white font-bold text-sm">
              {user.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="text-sm font-semibold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>{user.name || "Artisan"}</div>
              <div className="text-xs capitalize" style={{ color: "#c4a882" }}>{user.craftType || "Craftsperson"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
              <div className={`sidebar-item ${isActive ? "active" : ""}`}>
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span style={{ color: "#f97316", fontSize: 14 }}>{item.badge}</span>}
                {isActive && <ChevronRight size={14} style={{ color: "#f97316" }} />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <button className="sidebar-item w-full text-left" onClick={logout} style={{ color: "#f87171" }}>
          <LogOut size={18} />
          Logout
        </button>
      </div>
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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-dark-2)" }}>
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)} style={{ color: "#c4a882" }}>
              <Menu size={22} />
            </button>
            <h1 className="text-base font-semibold" style={{ fontFamily: "Outfit", color: "#f5efe6" }}>{currentLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative" style={{ color: "#c4a882" }}>
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full gradient-saffron" />
            </button>
            <Link href="/products/new">
              <button className="btn-primary text-xs px-4 py-2">
                <span className="relative z-10">+ Add Product</span>
              </button>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 page-enter">{children}</main>
      </div>
    </div>
  );
}
