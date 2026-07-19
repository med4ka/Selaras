"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Warehouse,
  BarChart3,
  ShoppingCart,
  Store,
  User,
  LogOut,
  Users,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuthStore } from "@/store/auth-store";
import { useLiveQuery } from "dexie-react-hooks";
import db from "@/db/schema";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transaksi", href: "/transactions", icon: Receipt },
  { label: "Produk", href: "/products", icon: Package },
  { label: "Stok", href: "/stocks", icon: Warehouse },
  { label: "Staff", href: "/users", icon: Users, restrictedRoles: ["kasir"] },
  { label: "Outlet", href: "/outlets", icon: Store, restrictedRoles: ["kasir", "manager"] },
  { label: "Laporan", href: "/reports", icon: BarChart3, restrictedRoles: ["kasir"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const conflictCount = useLiveQuery(
    () => db.pending_transactions.where("status").equals("conflict").count()
  ) ?? 0;

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    router.push("/login");
  };

  const roleLabel: Record<string, string> = {
    owner: "Owner",
    manager: "Manager",
    kasir: "Kasir",
  };

  return (
    <aside className="flex w-60 flex-col border-r border-border/50 bg-surface shadow-sm z-10">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border/50 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ledger-navy">
          <Store className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="font-semibold tracking-tight text-ink">Selaras</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Sidebar navigation">
        {navItems
          .filter((item) => !item.restrictedRoles || !item.restrictedRoles.includes(user?.role ?? ""))
          .map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-ledger-navy/10 text-ledger-navy"
                  : "text-ink-muted hover:bg-canvas hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {conflictCount > 0 && item.href === "/transactions" && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-conflict-red px-1.5 text-[11px] font-semibold text-white">
                  {conflictCount > 99 ? "99+" : conflictCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile section — separated from Kasir CTA */}
      <div className="border-t border-border/50 px-3 py-3">
        {user && (
          <div className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ledger-navy/10 text-xs font-semibold text-ledger-navy font-mono">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">
                {user.username}
              </p>
              <p className="text-xs text-ink-muted font-mono">
                {roleLabel[user.role] || user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-conflict-red/10 hover:text-conflict-red"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <Link
          href="/transactions"
          aria-label="Buka halaman kasir"
          className="flex items-center justify-center gap-2 rounded-lg bg-sync-emerald px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sync-emerald/90"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Kasir
        </Link>
      </div>
    </aside>
  );
}
