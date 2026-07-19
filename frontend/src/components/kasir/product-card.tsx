"use client";

import { Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

interface ProductCardProps {
  id: string;
  sku: string;
  name: string;
  price: number;
  onAdd: (product: { id: string; sku: string; name: string; price: number }) => void;
}

export function ProductCard({ id, sku, name, price, onAdd }: ProductCardProps) {
  return (
    <div className="group rounded-xl border border-border/50 bg-surface p-4 shadow-sm transition-all hover:border-ledger-navy/20 hover:shadow-md">
      <div className="mb-3">
        <span className="font-mono text-[11px] text-ink-muted">{sku}</span>
        <h3 className="mt-0.5 text-sm font-medium text-ink line-clamp-2">
          {name}
        </h3>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-medium text-ledger-navy">
          {formatCurrency(price)}
        </span>
        <button
          aria-label={`Tambah ${name} ke keranjang`}
          onClick={() => onAdd({ id, sku, name, price })}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            "bg-ledger-navy/10 text-ledger-navy hover:bg-ledger-navy hover:text-white"
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
