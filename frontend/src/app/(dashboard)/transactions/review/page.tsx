"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, Trash2, RotateCcw, CheckCircle, Package } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import db from "@/db/schema";
import type { PendingTransaction } from "@/db/schema";
import { formatDateTime, formatCurrency } from "@/utils/format";
import { toast } from "@/lib/toast";

type Tab = "conflict" | "failed";

export default function ReviewPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("conflict");

  useEffect(() => {
    if (user && user.role !== "owner" && user.role !== "manager") {
      router.replace("/transactions");
    }
  }, [user, router]);

  if (!user || (user.role !== "owner" && user.role !== "manager")) {
    return null;
  }

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-conflict-red" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-ink">Review Transaksi</h1>
      </div>

      <div className="mb-5 flex gap-1 rounded-xl border border-border/50 bg-surface p-1 shadow-sm">
        <button
          onClick={() => setTab("conflict")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "conflict"
              ? "bg-sync-amber/10 text-sync-amber"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Perlu Ditinjau
        </button>
        <button
          onClick={() => setTab("failed")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "failed"
              ? "bg-conflict-red/10 text-conflict-red"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Gagal
        </button>
      </div>

      <ReviewList status={tab} />
    </section>
  );
}

function ReviewList({ status }: { status: "conflict" | "failed" }) {
  const items = useLiveQuery(
    () =>
      db.pending_transactions
        .where("status")
        .equals(status)
        .sortBy("created_at_client"),
    [status],
    []
  );

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-surface p-8 text-center shadow-sm">
        <CheckCircle className="mx-auto mb-3 h-8 w-8 text-sync-emerald/40" aria-hidden="true" />
        <p className="text-sm text-ink-muted">
          {status === "conflict"
            ? "Tidak ada transaksi yang perlu ditinjau"
            : "Tidak ada transaksi yang gagal"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((tx) => (
        <ReviewCard key={tx.local_id} tx={tx} />
      ))}
    </div>
  );
}

function ReviewCard({ tx }: { tx: PendingTransaction }) {
  const products = useLiveQuery(
    () => {
      const ids = tx.items.map((i) => i.product_id);
      return db.products_cache.bulkGet(ids);
    },
    [tx.local_id],
    []
  );

  const productMap = new Map(
    products.filter(Boolean).map((p) => [p!.id, p!])
  );

  async function handleRetry() {
    if (tx.local_id === undefined) return;
    try {
      await db.pending_transactions.update(tx.local_id, {
        status: "pending",
        error_message: null,
        retry_count: 0,
      });
      toast.success("Transaksi akan dicoba sinkronisasi ulang");
    } catch {
      toast.error("Gagal memperbarui status transaksi");
    }
  }

  async function handleDelete() {
    if (tx.local_id === undefined) return;
    try {
      await db.pending_transactions.delete(tx.local_id);
      toast.success("Transaksi berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus transaksi");
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-surface p-4 shadow-sm">
      <div className="mb-3">
        <p className="font-mono text-xs text-ink-muted">
          {formatDateTime(new Date(tx.created_at_client))}
        </p>
        {tx.error_message && (
          <p className="mt-1.5 text-sm text-conflict-red">{tx.error_message}</p>
        )}
      </div>

      <div className="mb-3 space-y-1.5">
        {tx.items.map((item, i) => {
          const product = productMap.get(item.product_id);
          return (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-ink truncate mr-2">
                {product?.name ?? item.product_id}
              </span>
              <span className="font-mono shrink-0 text-ink-muted">
                x{item.quantity}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between border-t border-border/50 pt-2">
        <span className="text-sm font-medium text-ink">Total</span>
        <span className="font-mono text-sm font-semibold text-ink">
          {formatCurrency(tx.total_amount)}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleRetry}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-sync-amber hover:text-sync-amber"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Coba Lagi
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-conflict-red hover:text-conflict-red"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Hapus
        </button>
      </div>
    </div>
  );
}
