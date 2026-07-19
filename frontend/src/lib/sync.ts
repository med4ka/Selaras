import { createTransaction } from "@/services/data";
import { toast } from "@/lib/toast";
import { useNetworkStore } from "@/store/network-store";
import db from "@/db/schema";
import type { TransactionInput } from "@/services/data";

export async function syncSingleTransaction(
  localId: number,
  body: TransactionInput
): Promise<"synced" | "conflict" | "pending" | "failed"> {
  try {
    await createTransaction(body);
    await db.pending_transactions.update(localId, {
      status: "synced",
      synced_at: Date.now(),
    });
    return "synced";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("sudah ada")) {
      await db.pending_transactions.update(localId, {
        status: "synced",
        synced_at: Date.now(),
      });
      return "synced";
    }

    if (msg.toLowerCase().includes("stok")) {
      await db.pending_transactions.update(localId, {
        status: "conflict",
        error_message: msg,
      });
      return "conflict";
    }

    if (msg.includes("fetch")) {
      return "pending";
    }

    const current = await db.pending_transactions.get(localId);
    const nextRetry = (current?.retry_count ?? 0) + 1;

    if (nextRetry >= 3) {
      await db.pending_transactions.update(localId, {
        status: "failed",
        error_message: msg,
        retry_count: nextRetry,
      });
      return "failed";
    }

    await db.pending_transactions.update(localId, {
      retry_count: nextRetry,
    });
    return "pending";
  }
}

export async function syncPendingTransactions(): Promise<void> {
  const pending = await db.pending_transactions
    .where("status")
    .equals("pending")
    .sortBy("created_at_client");

  if (pending.length === 0) return;

  let syncedCount = 0;
  let conflictCount = 0;

  for (const tx of pending) {
    if (!useNetworkStore.getState().isOnline) break;

    const localId = tx.local_id!;
    await db.pending_transactions.update(localId, { status: "syncing" });

    const result = await syncSingleTransaction(localId, {
      outlet_id: tx.outlet_id,
      idempotency_key: tx.idempotency_key,
      client_created_at: new Date(tx.created_at_client).toISOString(),
      items: tx.items,
      payments: tx.payments as { method: "cash" | "qris" | "card"; amount: number }[],
    });

    if (result === "synced") syncedCount++;
    else if (result === "conflict") conflictCount++;
  }

  if (syncedCount === 0 && conflictCount === 0) return;

  if (conflictCount === 0) {
    toast.success(`${syncedCount} transaksi berhasil disinkronkan`);
  } else {
    toast.warning(
      `${syncedCount} berhasil, ${conflictCount} transaksi perlu ditinjau`
    );
  }
}
