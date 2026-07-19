"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown, Store } from "lucide-react";
import { toast } from "@/lib/toast";
import { getOutlets } from "@/services/data";
import { SyncIndicator } from "./sync-indicator";
import { useAuthStore } from "@/store/auth-store";

export function Topbar() {
  const { user, outlets, activeOutletId, setOutlets, setActiveOutlet } =
    useAuthStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.role === "owner";
  const shouldLoadOutlets = user?.role === "owner" || user?.role === "manager";

  useEffect(() => {
    if (!shouldLoadOutlets) return;
    if (outlets.length > 0) return;

    getOutlets()
      .then((data) => {
        setOutlets(data);
        const state = useAuthStore.getState();
        if (state.user?.role === "owner" && !state.activeOutletId && data.length > 0) {
          setActiveOutlet(data[0].id);
        }
      })
      .catch(() => toast.error("Gagal memuat daftar outlet"));
  }, [shouldLoadOutlets, outlets.length]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const activeOutlet = outlets.find((o) => o.id === activeOutletId);
  const displayName = activeOutlet?.name ?? "Semua Outlet";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 bg-surface px-6">
      <div className="flex items-center gap-3">
        {isOwner ? (
          <div ref={dropdownRef} className="relative">
            <button
              aria-label="Pilih outlet"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 text-sm font-medium text-ink hover:text-ink-muted transition-colors"
            >
              <Store className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              <span>{displayName}</span>
              <ChevronDown className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            </button>

            {open && (
              <div className="absolute left-0 top-full mt-1.5 w-56 rounded-xl border border-border/50 bg-surface p-1 shadow-md z-20">
                {outlets.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-ink-muted">
                    Tidak ada outlet
                  </p>
                ) : (
                  <>
                    <button
                      aria-label="Semua Outlet"
                      onClick={() => {
                        setActiveOutlet(null);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        activeOutletId === null
                          ? "bg-ledger-navy/10 text-ledger-navy font-medium"
                          : "text-ink hover:bg-canvas"
                      }`}
                    >
                      <Store className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                      <span className="flex-1 truncate">Semua Outlet</span>
                    </button>
                    <div className="my-1 border-t border-border/50" />
                    {outlets.map((o) => (
                      <button
                        key={o.id}
                        aria-label={`Pilih outlet ${o.name}`}
                        onClick={() => {
                          setActiveOutlet(o.id);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          o.id === activeOutletId
                            ? "bg-ledger-navy/10 text-ledger-navy font-medium"
                            : "text-ink hover:bg-canvas"
                        }`}
                      >
                        <span className="flex-1 truncate">{o.name}</span>
                        {!o.is_active && (
                          <span className="text-[11px] text-ink-muted">
                            nonaktif
                          </span>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Store className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            <span className="text-sm font-medium text-ink">
              {displayName}
            </span>
          </div>
        )}
      </div>

      <SyncIndicator />
    </header>
  );
}
