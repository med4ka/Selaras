"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { Modal } from "@/components/modal";
import { toast } from "@/lib/toast";
import { generateIdempotencyKey } from "@/utils/format";
import { useAuthStore } from "@/store/auth-store";
import { getOutlets, getProducts, createStockAdjustment } from "@/services/data";
import type { Outlet, Product, StockAdjustInput } from "@/services/data";

interface StockAdjustModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Row {
  id: string;
  product: Product;
  type: "add" | "remove";
  quantity: number;
}

let rowId = 0;
function nextRowId() {
  return `row-${++rowId}-${Date.now().toString(36)}`;
}

export function StockAdjustModal({ open, onClose, onSuccess }: StockAdjustModalProps) {
  const user = useAuthStore((s) => s.user);
  const activeOutletId = useAuthStore((s) => s.activeOutletId);
  const isOwner = user?.role === "owner";

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(generateIdempotencyKey);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    getOutlets().then(setOutlets).catch(() => {});
    getProducts().then(setProducts).catch(() => {});
    setOutletId(isOwner ? "" : activeOutletId ?? "");
    setRows([]);
    setSearch("");
  }, [open, isOwner, activeOutletId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      !rows.some((r) => r.product.id === p.id)
  );

  function addRow(product: Product) {
    setRows((prev) => [
      ...prev,
      { id: nextRowId(), product, type: "add", quantity: 1 },
    ]);
    setSearch("");
    setShowDropdown(false);
    searchRef.current?.focus();
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function handleSubmit() {
    if (!outletId) {
      toast.error("Pilih outlet terlebih dahulu");
      return;
    }
    if (rows.length === 0) {
      toast.error("Tambahkan minimal satu produk");
      return;
    }
    for (const r of rows) {
      if (!r.quantity || r.quantity <= 0) {
        toast.error(`Jumlah untuk ${r.product.name} harus lebih dari 0`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const input: StockAdjustInput = {
        outlet_id: outletId,
        items: rows.map((r) => ({
          product_id: r.product.id,
          delta: r.type === "add" ? r.quantity : -r.quantity,
        })),
        idempotency_key: idempotencyKey,
      };
      await createStockAdjustment(input);
      toast.success("Stok berhasil disesuaikan");
      onSuccess();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyesuaikan stok");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Sesuaikan Stok" className="max-w-xl">
      <div className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Outlet</label>
          {isOwner ? (
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
            >
              <option value="">Pilih outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-lg border border-border/50 bg-canvas/50 px-3 py-2 text-sm text-ink-muted">
              {outlets.find((o) => o.id === outletId)?.name ?? "—"}
            </div>
          )}
        </div>

        <div ref={dropdownRef} className="relative">
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Tambah Produk</label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted/50"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Cari produk..."
              className="w-full rounded-lg border border-border/50 pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
            />
          </div>
          {showDropdown && filtered.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-border/50 bg-surface py-1 shadow-lg max-h-48 overflow-y-auto">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addRow(p)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-ink hover:bg-canvas/50 transition-colors"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="font-mono text-xs text-ink-muted">{p.sku}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-ink-muted">
              Daftar Penyesuaian ({rows.length})
            </p>
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-canvas/30 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{r.product.name}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => updateRow(r.id, { type: "add" })}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      r.type === "add"
                        ? "bg-sync-emerald/10 text-sync-emerald"
                        : "text-ink-muted hover:bg-canvas"
                    }`}
                    aria-label="Tambah stok"
                  >
                    + Tambah
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRow(r.id, { type: "remove" })}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      r.type === "remove"
                        ? "bg-conflict-red/10 text-conflict-red"
                        : "text-ink-muted hover:bg-canvas"
                    }`}
                    aria-label="Kurangi stok"
                  >
                    − Kurang
                  </button>
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    min="1"
                    value={r.quantity}
                    onChange={(e) =>
                      updateRow(r.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                    }
                    className="w-full rounded-lg border border-border/50 px-2.5 py-1.5 text-sm font-mono text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20 text-center"
                    aria-label="Jumlah"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas hover:text-conflict-red transition-colors"
                  aria-label="Hapus produk"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border/50 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-canvas transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !outletId || rows.length === 0}
            className="flex-1 rounded-lg bg-ledger-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
