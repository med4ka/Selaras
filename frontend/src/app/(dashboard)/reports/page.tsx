"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { BarChart3, TrendingUp, Receipt, Package, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { getSalesReport } from "@/services/data";
import type { SalesReport } from "@/services/data";
import { Skeleton } from "@/components/skeleton";
import { formatCurrency, formatNumber } from "@/utils/format";

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const activeOutletId = useAuthStore((s) => s.activeOutletId);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [from, setFrom] = useState(toDateInput(firstOfMonth));
  const [to, setTo] = useState(toDateInput(now));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSalesReport(
        from,
        to,
        activeOutletId ?? undefined
      );
      setReport(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat laporan";
      toast.error(msg);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, activeOutletId]);

  const fetching = useRef(false);

  useEffect(() => {
    if (fetching.current) return;
    fetching.current = true;
    fetchReport().finally(() => { fetching.current = false; });
  }, [fetchReport]);

  const outletName = outlets.find((o) => o.id === activeOutletId)?.name ?? "Semua Outlet";
  const todayStr = new Date().toISOString().slice(0, 10);
  const fileNameOutlet = outlets.find((o) => o.id === activeOutletId)?.name ?? "semua";

  function handleDownloadExcel() {
    if (!report) return;

    const wb = XLSX.utils.book_new();
    const headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "E5E7EB" } } };
    const numberFmt = '#,##0';

    // ── Sheet 1: Ringkasan ──
    const ringkasanRows = [
      ["Metrik", "Nilai"],
      ["Total Penjualan", report.total_penjualan],
      ["Jumlah Transaksi", report.jumlah_transaksi],
      ["Rentang Tanggal", `${from} — ${to}`],
      ["Outlet", outletName],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(ringkasanRows);
    for (let c = 0; c < 2; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws1[addr]) ws1[addr].s = headerStyle;
    }
    for (let r = 1; r <= 2; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: 1 });
      if (ws1[addr]) ws1[addr].s = { numFmt: numberFmt };
    }
    const ringkasanWidths = ringkasanRows[0].map((_, ci) =>
      Math.max(...ringkasanRows.map((row) => String(row[ci] ?? "").length), 10)
    );
    ws1["!cols"] = ringkasanWidths.map((w) => ({ wch: w + 3 }));
    XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");

    // ── Sheet 2: Produk Terlaris ──
    const produkRows = [
      ["Nama Produk", "SKU", "Jumlah Terjual", "Total Revenue"],
      ...report.produk_terlaris.map((p) => [p.name, p.sku, p.total_quantity, p.total_revenue]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(produkRows);
    for (let c = 0; c < 4; c++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c });
      if (ws2[addr]) ws2[addr].s = headerStyle;
    }
    for (let r = 1; r < produkRows.length; r++) {
      for (let c = 2; c <= 3; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (ws2[addr]) ws2[addr].s = { numFmt: numberFmt };
      }
    }
    const produkWidths = produkRows[0].map((_, ci) =>
      Math.max(...produkRows.map((row) => String(row[ci] ?? "").length), 10)
    );
    ws2["!cols"] = produkWidths.map((w) => ({ wch: w + 3 }));
    XLSX.utils.book_append_sheet(wb, ws2, "Produk Terlaris");

    const fileName = `laporan-selaras-${fileNameOutlet}-${todayStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  return (
    <section>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">Laporan Penjualan</h1>
        </div>
        {report && (
          <button
            aria-label="Download Excel"
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download Excel
          </button>
        )}
      </div>

      {/* Outlet info + Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border/50 bg-surface p-4 shadow-sm">
        <div className="mr-4">
          <p className="mb-1 text-xs font-medium text-ink-muted">Menampilkan</p>
          <p className="text-sm font-medium text-ink">{outletName}</p>
        </div>
        <div>
          <label htmlFor="report-from" className="mb-1 block text-xs font-medium text-ink-muted">
            Dari
          </label>
          <input
            id="report-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-border/50 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
          />
        </div>
        <div>
          <label htmlFor="report-to" className="mb-1 block text-xs font-medium text-ink-muted">
            Sampai
          </label>
          <input
            id="report-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-border/50 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
          />
        </div>
        <button
          aria-label="Terapkan filter"
          onClick={fetchReport}
          disabled={loading}
          className="rounded-lg bg-ledger-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Memuat..." : "Terapkan"}
        </button>
      </div>

      {/* Summary cards */}
      {loading && !report ? (
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        </div>
      ) : report ? (
        <div className="mb-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 text-ink-muted mb-1.5">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Total Penjualan</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ledger-navy">
              {formatCurrency(report.total_penjualan)}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-surface p-5 shadow-sm">
            <div className="flex items-center gap-2 text-ink-muted mb-1.5">
              <Receipt className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">Jumlah Transaksi</span>
            </div>
            <p className="font-mono text-2xl font-semibold text-ledger-navy">
              {formatNumber(report.jumlah_transaksi)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Top products table */}
      {loading && !report ? (
        <div className="rounded-xl border border-border/50 bg-surface shadow-sm">
          <div className="border-b border-border/50 px-5 py-3">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ) : report && report.produk_terlaris.length > 0 ? (
        <div className="rounded-xl border border-border/50 bg-surface shadow-sm overflow-hidden">
          <div className="border-b border-border/50 bg-canvas/50 px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-ink">
              <Package className="h-4 w-4 text-ink-muted" aria-hidden="true" />
              Produk Terlaris
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-5 py-3 text-left font-medium text-ink-muted w-8">#</th>
                <th className="px-5 py-3 text-left font-medium text-ink-muted">Produk</th>
                <th className="px-5 py-3 text-left font-medium text-ink-muted">SKU</th>
                <th className="px-5 py-3 text-right font-medium text-ink-muted">Terjual</th>
                <th className="px-5 py-3 text-right font-medium text-ink-muted">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {report.produk_terlaris.map((p, i) => (
                <tr key={p.product_id} className="hover:bg-canvas/30 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-ink-muted text-xs">{i + 1}</td>
                  <td className="px-5 py-3.5 font-medium text-ink">{p.name}</td>
                  <td className="px-5 py-3.5 font-mono text-ink-muted">{p.sku}</td>
                  <td className="px-5 py-3.5 font-mono text-right text-ink">{formatNumber(p.total_quantity)}</td>
                  <td className="px-5 py-3.5 font-mono text-right font-medium text-ledger-navy">
                    {formatCurrency(p.total_revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : report ? (
        <div className="rounded-xl border border-border/50 bg-surface p-8 text-center shadow-sm">
          <Package className="mx-auto mb-3 h-8 w-8 text-ink-muted/40" aria-hidden="true" />
          <p className="text-sm text-ink-muted">Belum ada transaksi di periode ini</p>
        </div>
      ) : null}
    </section>
  );
}
