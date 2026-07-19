"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "@/lib/toast";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { useNetworkStore } from "@/store/network-store";
import { formatCurrency, generateIdempotencyKey } from "@/utils/format";
import { syncSingleTransaction } from "@/lib/sync";
import db from "@/db/schema";
import { ReceiptModal, type ReceiptData } from "./receipt";

type PaymentMethod = "cash" | "qris" | "card";

export function CartPanel() {
  const { items, totalAmount, updateQuantity, removeItem, clearCart } = useCartStore();
  const activeOutletId = useAuthStore((s) => s.activeOutletId);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  async function handlePay() {
    if (items.length === 0) return;
    if (!activeOutletId) {
      toast.error("Pilih outlet spesifik untuk transaksi");
      return;
    }

    const user = useAuthStore.getState().user;
    if (!user) {
      toast.error("Sesi tidak valid");
      return;
    }

    setPaying(true);

    const idempotencyKey = generateIdempotencyKey();
    const now = Date.now();
    const snapItems = [...items];
    const snapTotal = totalAmount;
    const snapMethod = method;

    try {
      const localId = await db.pending_transactions.add({
        idempotency_key: idempotencyKey,
        outlet_id: activeOutletId,
        cashier_id: user.id,
        items: snapItems.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
        payments: [{ method: snapMethod, amount: snapTotal }],
        total_amount: snapTotal,
        status: "pending",
        created_at_client: now,
        synced_at: null,
        error_message: null,
        retry_count: 0,
      });

      toast.success("Transaksi berhasil");
      clearCart();
      setPaying(false);

      const state = useAuthStore.getState();
      const activeOutlet = state.outlets.find((o) => o.id === activeOutletId);
      setReceipt({
        outletName: activeOutlet?.name ?? "Outlet",
        outletAddress: activeOutlet?.address,
        cashierName: user.username,
        date: new Date(now),
        refNo: idempotencyKey.slice(0, 8).toUpperCase(),
        items: snapItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          subtotal: i.subtotal,
        })),
        total: snapTotal,
        method: snapMethod,
      });

      if (useNetworkStore.getState().isOnline && localId !== undefined) {
        syncSingleTransaction(localId, {
          outlet_id: activeOutletId,
          idempotency_key: idempotencyKey,
          client_created_at: new Date(now).toISOString(),
          items: snapItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
          payments: [{ method: snapMethod, amount: snapTotal }],
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan transaksi";
      toast.error(msg);
      setPaying(false);
    }
  }

  if (items.length === 0) {
    return (
      <>
        <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border/50 bg-surface p-6 text-center shadow-sm">
          <ShoppingCart className="mb-3 h-8 w-8 text-ink-muted/40" aria-hidden="true" />
          <p className="text-sm text-ink-muted">Keranjang kosong</p>
          <p className="text-xs text-ink-muted/60 mt-1">Pilih produk untuk memulai transaksi</p>
        </div>
        <ReceiptModal
          data={receipt!}
          open={receipt !== null}
          onClose={() => setReceipt(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col rounded-xl border border-border/50 bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-medium text-ink">Keranjang</h2>
        <button
          aria-label="Kosongkan keranjang"
          onClick={clearCart}
          className="text-xs text-ink-muted hover:text-conflict-red transition-colors"
        >
          Hapus semua
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {items.map((item) => (
          <div
            key={item.product_id}
            className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink truncate">{item.name}</p>
              <p className="font-mono text-xs text-ink-muted mt-0.5">
                {formatCurrency(item.price)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                aria-label={`Kurangi jumlah ${item.name}`}
                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                className="flex h-6 w-6 items-center justify-center rounded border border-border/50 text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
              >
                <Minus className="h-3 w-3" aria-hidden="true" />
              </button>
              <span className="w-7 text-center font-mono text-sm text-ink">
                {item.quantity}
              </span>
              <button
                aria-label={`Tambah jumlah ${item.name}`}
                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                className="flex h-6 w-6 items-center justify-center rounded border border-border/50 text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>

            <div className="text-right min-w-[70px]">
              <p className="font-mono text-sm font-medium text-ink">
                {formatCurrency(item.subtotal)}
              </p>
            </div>

            <button
              aria-label={`Hapus ${item.name} dari keranjang`}
              onClick={() => removeItem(item.product_id)}
              className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-conflict-red/10 hover:text-conflict-red transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-border/50 p-4 space-y-3">
        {/* Payment method */}
        <div className="flex gap-2">
          {(["cash", "qris", "card"] as PaymentMethod[]).map((m) => {
            const labels: Record<PaymentMethod, string> = {
              cash: "Tunai",
              qris: "QRIS",
              card: "Kartu",
            };
            return (
              <button
                key={m}
                aria-label={`Metode pembayaran ${labels[m]}`}
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  method === m
                    ? "border-ledger-navy bg-ledger-navy/10 text-ledger-navy"
                    : "border-border/50 text-ink-muted hover:border-border hover:text-ink"
                }`}
              >
                {labels[m]}
              </button>
            );
          })}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-muted">Total</span>
          <span className="font-mono text-lg font-semibold text-ink">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        {/* Pay button */}
        <button
          aria-label="Bayar"
          disabled={paying || !activeOutletId}
          onClick={handlePay}
          className="w-full rounded-lg bg-sync-emerald px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sync-emerald/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying
            ? "Memproses..."
            : !activeOutletId
              ? "Pilih outlet spesifik"
              : `Bayar ${formatCurrency(totalAmount)}`}
        </button>
      </div>
    </div>
    <ReceiptModal
      data={receipt!}
      open={receipt !== null}
      onClose={() => setReceipt(null)}
    />
  </>
  );
}
