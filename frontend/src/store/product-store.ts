import { create } from "zustand";
import { getProducts } from "@/services/data";
import { toast } from "@/lib/toast";
import { cacheProductsFromResponse } from "@/db/schema";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  price: number;
  low_stock_threshold: number;
  category_id: string;
  is_active: boolean;
}

interface ProductState {
  items: ProductItem[];
  loading: boolean;
  fetched: boolean;
  fetchProducts: () => Promise<void>;
  refetchProducts: () => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  items: [],
  loading: false,
  fetched: false,
  fetchProducts: async () => {
    if (get().fetched) return;
    set({ loading: true });
    try {
      const data = await getProducts(true);
      set({ items: data, loading: false, fetched: true });
      cacheProductsFromResponse(
        data
          .filter((p) => p.is_active)
          .map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            price: p.price,
            low_stock_threshold: p.low_stock_threshold,
            category_id: p.category_id,
            category_name: p.category?.name,
          }))
      ).catch((e) => {
        console.warn("Gagal caching produk ke Dexie:", e);
      });
    } catch {
      set({ loading: false });
      toast.error("Gagal memuat produk");
    }
  },
  refetchProducts: async () => {
    set({ loading: true, fetched: false });
    await get().fetchProducts();
  },
}));
