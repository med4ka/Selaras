"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Trash2, ArrowLeftRight } from "lucide-react";
import { Modal } from "@/components/modal";
import { toast } from "@/lib/toast";
import { generateIdempotencyKey } from "@/utils/format";
import { getOutlets, getProducts, getStocks, createStockTransfer } from "@/services/data";
import type { Outlet, Product, Stock } from "@/services/data";

interface StockTransferModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Row {
  id: string;
  product: Product;
  quantity: number;
}

let rowId = 0;
function nextRowId() {
  return `row-${++rowId}-${Date.now().toString(36)}`;
}

export function StockTransferModal({ open, onClose, onSuccess }: StockTransferModalProps) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sourceStocks, setSourceStocks] = useState<Stock[]>([]);
  const [fromOutletId, setFromOutletId] = useState("");
  const [toOutletId, setToOutletId] = useState("");
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
    setFromOutletId("");
    setToOutletId("");
    setRows([]);
    setSearch("");
    setSourceStocks([]);
  }, [open]);

  useEffect(() => {
    if (!fromOutletId) {
      setSourceStocks([]);
      return;
    }
    getStocks(fromOutletId).then(setSourceStocks).catch(() => {});
  }, [fromOutletId]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const destinationOutlets = outlets.filter((o) => o.id !== fromOutletId);
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      !rows.some((r) => r.product.id === p.id)
  );

  function getStockForProduct(productId: string): number {
    const stock = sourceStocks.find((s) => s.product_id === productId);
    return stock?.quantity ?? 0;
  }

  function addRow(product: Product) {
    const available = getStockForProduct(product.id);
    if (available <= 0) {
      toast.error(`Stok ${product.name} di outlet asal kosong`);
      return;
    }
    setRows((prev) => [
      ...prev,
      { id: nextRowId(), product, quantity: 1 },
    ]);
    setSearch("");
    setShowDropdown(false);
    searchRef.current?.focus();
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function updateQuantity(id: string, qty: number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, quantity: Math.max(1, qty) } : r)));
  }

  async function handleSubmit() {
    if (!fromOutletId) {
      toast.error("Pilih outlet asal");
      return;
    }
    if (!toOutletId) {
      toast.error("Pilih outlet tujuan");
      return;
    }
    if (rows.length === 0) {
      toast.error("Tambahkan minimal satu produk");
      return;
    }
    for (const r of rows) {
      const available = getStockForProduct(r.product.id);
      if (r.quantity > available) {
        toast.error(`Stok ${r.product.name} tidak mencukupi (tersedia: ${available}, diminta: ${r.quantity})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await createStockTransfer({
        from_outlet_id: fromOutletId,
        to_outlet_id: toOutletId,
        items: rows.map((r) => ({
          product_id: r.product.id,
          quantity: r.quantity,
        })),
        idempotency_key: idempotencyKey,
      });
      toast.success("Transfer stok berhasil");
      onSuccess();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal transfer stok";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Transfer Stok" className="max-w-xl">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Outlet Asal</label>
            <select
              value={fromOutletId}
              onChange={(e) => {
                setFromOutletId(e.target.value);
                if (e.target.value === toOutletId) setToOutletId("");
              }}
              className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
            >
              <option value="">Pilih outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted">Outlet Tujuan</label>
            <select
              value={toOutletId}
              onChange={(e) => setToOutletId(e.target.value)}
              className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
            >
              <option value="">Pilih outlet</option>
              {destinationOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {fromOutletId && (
          <>
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
                  {filtered.map((p) => {
                    const available = getStockForProduct(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addRow(p)}
                        disabled={available <= 0}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-ink hover:bg-canvas/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="font-mono text-xs text-ink-muted">{p.sku}</span>
                        <span className="ml-auto font-mono text-xs text-ink-muted">
                          {available > 0 ? `${available} tersedia` : "habis"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {rows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-ink-muted">
                  Daftar Transfer ({rows.length})
                </p>
                {rows.map((r) => {
                  const available = getStockForProduct(r.product.id);
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-canvas/30 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{r.product.name}</p>
                        <p className="font-mono text-xs text-ink-muted">
                          Tersedia: {available}
                        </p>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          max={available}
                          value={r.quantity}
                          onChange={(e) =>
                            updateQuantity(r.id, parseInt(e.target.value) || 1)
                          }
                          className="w-full rounded-lg border border-border/50 px-2.5 py-1.5 text-sm font-mono text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20 text-center"
                          aria-label="Jumlah transfer"
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
                  );
                })}
              </div>
            )}
          </>
        )}

        {fromOutletId && (
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
              disabled={submitting || !toOutletId || rows.length === 0}
              className="flex-1 rounded-lg bg-ledger-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Memproses..." : "Transfer Stok"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
