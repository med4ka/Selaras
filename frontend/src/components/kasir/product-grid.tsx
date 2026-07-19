"use client";

import { useEffect, useState } from "react";
import { Search, Package } from "lucide-react";
import { useProductStore } from "@/store/product-store";
import { ProductCard } from "./product-card";
import { Skeleton } from "@/components/skeleton";
import { useCartStore } from "@/store/cart-store";

export function ProductGrid() {
  const { items, loading, fetchProducts } = useProductStore();
  const [search, setSearch] = useState("");
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = items.filter(
    (p) =>
      p.is_active &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-surface p-4 shadow-sm"
          >
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="mb-4 h-4 w-3/4" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative mb-4">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk atau SKU..."
          aria-label="Cari produk"
          className="w-full rounded-xl border border-border/50 bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border/50 bg-surface p-8 text-center shadow-sm">
          <div>
            <Package
              className="mx-auto mb-3 h-8 w-8 text-ink-muted/40"
              aria-hidden="true"
            />
            <p className="text-sm text-ink-muted">
              {search ? "Produk tidak ditemukan" : "Belum ada produk"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              sku={p.sku}
              name={p.name}
              price={p.price}
              onAdd={addItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
