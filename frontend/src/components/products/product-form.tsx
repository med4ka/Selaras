"use client";

import { useState } from "react";
import type { Category, ProductInput } from "@/services/data";

interface ProductData {
  id: string;
  sku: string;
  name: string;
  price: number;
  category_id: string;
  low_stock_threshold?: number;
}

interface ProductFormProps {
  product?: ProductData;
  categories: Category[];
  onSubmit: (data: ProductInput) => Promise<void>;
  onCancel: () => void;
}

export function ProductForm({ product, categories, onSubmit, onCancel }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [threshold, setThreshold] = useState(product?.low_stock_threshold?.toString() ?? "10");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !sku || !categoryId || !price) return;

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        sku: sku.trim(),
        category_id: categoryId,
        price: parseInt(price, 10),
        low_stock_threshold: parseInt(threshold, 10) || 10,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="product-name" className="mb-1.5 block text-xs font-medium text-ink-muted">
          Nama Produk
        </label>
        <input
          id="product-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
        />
      </div>

      <div>
        <label htmlFor="product-sku" className="mb-1.5 block text-xs font-medium text-ink-muted">
          SKU
        </label>
        <input
          id="product-sku"
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          required
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20 font-mono"
        />
      </div>

      <div>
        <label htmlFor="product-category" className="mb-1.5 block text-xs font-medium text-ink-muted">
          Kategori
        </label>
        <select
          id="product-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
        >
          <option value="">Pilih kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="product-price" className="mb-1.5 block text-xs font-medium text-ink-muted">
          Harga (Rp)
        </label>
        <input
          id="product-price"
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20 font-mono"
        />
      </div>

      <div>
        <label htmlFor="product-threshold" className="mb-1.5 block text-xs font-medium text-ink-muted">
          Batas Stok Menipis
        </label>
        <input
          id="product-threshold"
          type="number"
          min="1"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20 font-mono"
        />
        <p className="mt-1 text-[11px] text-ink-muted">
          Stok akan ditandai menipis jika jumlahnya di bawah batas ini (default: 10)
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border/50 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-canvas transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting || !name || !sku || !categoryId || !price}
          className="flex-1 rounded-lg bg-ledger-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : product ? "Simpan" : "Tambah"}
        </button>
      </div>
    </form>
  );
}
