"use client";

import { useCallback, useEffect, useState } from "react";
import { Warehouse, Plus, ArrowLeftRight } from "lucide-react";
import { toast } from "@/lib/toast";
import { getStocks } from "@/services/data";
import type { Stock } from "@/services/data";
import { useAuthStore } from "@/store/auth-store";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";
import { StockAdjustModal } from "@/components/stocks/stock-adjust-modal";
import { StockTransferModal } from "@/components/stocks/stock-transfer-modal";
import { formatNumber } from "@/utils/format";

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjust, setShowAdjust] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useAuthStore((s) => s.activeOutletId);
  const canAdjust = user?.role === "owner" || user?.role === "manager";
  const isOwner = user?.role === "owner";
  const showOutletColumn = user?.role === "owner" && !activeOutletId;

  const fetchStocks = useCallback(() => {
    setLoading(true);
    getStocks(activeOutletId ?? undefined)
      .then(setStocks)
      .catch(() => toast.error("Gagal memuat data stok"))
      .finally(() => setLoading(false));
  }, [activeOutletId]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  if (loading) {
    return (
      <section>
        <div className="mb-6 flex items-center gap-3">
          <Warehouse className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">Stok</h1>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface shadow-sm">
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24 ml-auto" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Warehouse className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">Stok</h1>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setShowTransfer(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas"
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              Transfer Stok
            </button>
          )}
          {canAdjust && (
            <button
              onClick={() => setShowAdjust(true)}
              className="flex items-center gap-1.5 rounded-lg bg-ledger-navy px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Sesuaikan Stok
            </button>
          )}
        </div>
      </div>

      {stocks.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="Belum ada data stok"
          description="Pantau ketersediaan stok per outlet dan riwayat pergerakan stok di sini."
        />
      ) : (
        <div className="rounded-xl border border-border/50 bg-surface shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-canvas/50">
                <th className="px-5 py-3 text-left font-medium text-ink-muted">
                  Produk
                </th>
                <th className="px-5 py-3 text-left font-medium text-ink-muted">
                  SKU
                </th>
                {showOutletColumn && (
                  <th className="px-5 py-3 text-left font-medium text-ink-muted">
                    Outlet
                  </th>
                )}
                <th className="px-5 py-3 text-right font-medium text-ink-muted">
                  Jumlah
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stocks.map((s) => {
                const threshold = s.product?.low_stock_threshold ?? 10;
                const isLow = s.quantity < threshold;
                return (
                  <tr
                    key={s.id}
                    className={
                      "transition-colors " +
                      (isLow
                        ? "bg-sync-amber/[0.04] border-l-4 border-l-sync-amber"
                        : "hover:bg-canvas/30")
                    }
                  >
                    <td className="px-5 py-3.5 font-medium text-ink">
                      {s.product?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-ink-muted">
                      {s.product?.sku ?? "—"}
                    </td>
                    {showOutletColumn && (
                      <td className="px-5 py-3.5 text-ink-muted">
                        {s.outlet?.name ?? "—"}
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-ink">
                      {formatNumber(s.quantity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <StockAdjustModal
        open={showAdjust}
        onClose={() => setShowAdjust(false)}
        onSuccess={fetchStocks}
      />
      <StockTransferModal
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        onSuccess={fetchStocks}
      />
    </section>
  );
}
