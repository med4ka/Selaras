import Dexie, { type EntityTable } from "dexie";

interface ProductCacheItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  low_stock_threshold: number;
  category_id: string;
  category_name: string;
  cached_at: number;
}

interface PendingTransaction {
  local_id?: number;
  idempotency_key: string;
  outlet_id: string;
  cashier_id: string;
  items: { product_id: string; quantity: number }[];
  payments: { method: string; amount: number }[];
  total_amount: number;
  status: "pending" | "syncing" | "synced" | "conflict" | "failed";
  created_at_client: number;
  synced_at: number | null;
  error_message: string | null;
  retry_count: number;
}

const db = new Dexie("selaras_offline") as Dexie & {
  products_cache: EntityTable<ProductCacheItem, "id">;
  pending_transactions: EntityTable<PendingTransaction, "local_id">;
};

db.version(1).stores({
  products_cache: "id, sku",
  pending_transactions:
    "++local_id, &idempotency_key, status, created_at_client",
});

export async function cacheProductsFromResponse(
  products: {
    id: string;
    sku: string;
    name: string;
    price: number;
    low_stock_threshold: number;
    category_id: string;
    category_name?: string;
  }[]
): Promise<void> {
  const items: ProductCacheItem[] = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    price: p.price,
    low_stock_threshold: p.low_stock_threshold,
    category_id: p.category_id,
    category_name: p.category_name ?? "",
    cached_at: Date.now(),
  }));

  await db.transaction("rw", db.products_cache, async () => {
    await db.products_cache.clear();
    await db.products_cache.bulkAdd(items);
  });
}

export type { ProductCacheItem, PendingTransaction };
export default db;
