"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Package,
  ShoppingCart,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { getSalesReport, getRecentTransactions, getStocks } from "@/services/data";
import type { SalesReport, TransactionListItem, Stock } from "@/services/data";
import { Skeleton } from "@/components/skeleton";
import { formatCurrency, formatNumber, formatDateTime } from "@/utils/format";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useAuthStore((s) => s.activeOutletId);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [recentTx, setRecentTx] = useState<TransactionListItem[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const to = now.toISOString().slice(0, 10);
      const [reportData, txData, stocksData] = await Promise.all([
        getSalesReport(from, to, activeOutletId ?? undefined),
        getRecentTransactions(8, activeOutletId ?? undefined),
        getStocks(activeOutletId ?? undefined),
      ]);
      setReport(reportData);
      setRecentTx(txData);
      setLowStockCount(stocksData.filter((s: Stock) => {
        const threshold = s.product?.low_stock_threshold ?? 10;
        return s.quantity < threshold;
      }).length);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data";
      toast.error(msg);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [activeOutletId]);

  const fetching = useRef(false);

  useEffect(() => {
    if (fetching.current) return;
    fetching.current = true;
    fetchReport();
  }, [fetchReport]);

  if (user && user.role === "kasir") {
    return (
      <section>
        <div className="mb-6 flex items-center gap-3">
          <LayoutDashboard className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">Dashboard</h1>
        </div>
        <div className="rounded-xl border border-border/50 bg-surface p-8 text-center shadow-sm">
          <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-ink-muted/40" aria-hidden="true" />
          <p className="text-sm text-ink-muted">
            Silakan buka halaman{" "}
            <Link href="/transactions" className="font-medium text-ledger-navy underline">
              Kasir
            </Link>{" "}
            untuk memulai transaksi.
          </p>
        </div>
      </section>
    );
  }

  const chartData =
    report?.produk_terlaris.map((p) => ({
      name: p.name,
      Terjual: p.total_quantity,
    })) ?? [];

  const chartHeight = Math.max(200, chartData.length * 48 + 40);

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <LayoutDashboard className="h-5 w-5 text-ink-muted" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-ink">Dashboard</h1>
      </div>

      {loading && !report ? (
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ) : report ? (
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2 text-ink-muted">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Total Penjualan</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ledger-navy">
              {formatCurrency(report.total_penjualan)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2 text-ink-muted">
              <Receipt className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Jumlah Transaksi</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ledger-navy">
              {formatNumber(report.jumlah_transaksi)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2 text-ink-muted">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Stok Menipis</span>
            </div>
            <p className={"font-mono text-2xl font-semibold " + (lowStockCount > 0 ? "text-sync-amber" : "text-ink-muted/50")}>
              {formatNumber(lowStockCount)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2 text-ink-muted">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Total Penjualan</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ink-muted/50">
              Rp0
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2 text-ink-muted">
              <Receipt className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Jumlah Transaksi</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ink-muted/50">
              0
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <div className="mb-1.5 flex items-center gap-2 text-ink-muted">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Stok Menipis</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ink-muted/50">
              0
            </p>
          </div>
        </div>
      )}

      {loading && !report ? (
        <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
          <Skeleton className="mb-4 h-4 w-28" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : report && report.produk_terlaris.length > 0 ? (
        <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
            <Package className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            Produk Terlaris
          </h2>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 12, fontFamily: "IBM Plex Mono", fill: "#78716C" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 12, fontFamily: "IBM Plex Sans", fill: "#292524" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "IBM Plex Sans",
                  color: "#292524",
                }}
                formatter={(value) => [formatNumber(Number(value)), "Terjual"]}
              />
              <Bar
                dataKey="Terjual"
                fill="#1E3A5F"
                radius={[0, 4, 4, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : report ? (
        <div className="rounded-xl border border-border/50 bg-surface p-8 text-center shadow-sm">
          <Package className="mx-auto mb-3 h-8 w-8 text-ink-muted/40" aria-hidden="true" />
          <p className="text-sm text-ink-muted">Belum ada transaksi bulan ini</p>
        </div>
      ) : null}

      {recentTx.length > 0 && (
        <div className="mt-5 rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
            <Clock className="h-4 w-4 text-ink-muted" aria-hidden="true" />
            Transaksi Terbaru
          </h2>
          <div className="space-y-2">
            {recentTx.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg border border-border/25 px-4 py-2.5 text-sm transition-colors hover:bg-canvas/50"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs text-ink-muted">
                    {formatDateTime(tx.created_at)}
                  </span>
                  <span className="text-xs text-ink-muted">{tx.outlet_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-ink-muted">{tx.cashier_name}</span>
                  <span className="font-mono text-sm font-medium text-ink">
                    {formatCurrency(tx.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
