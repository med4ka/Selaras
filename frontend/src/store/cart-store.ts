import { create } from "zustand";

interface CartItem {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface CartState {
  items: CartItem[];
  totalAmount: number;
  addItem: (product: { id: string; sku: string; name: string; price: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  totalAmount: 0,

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((i) => i.product_id === product.id);
      if (existing) {
        const updated = state.items.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
            : i
        );
        return {
          items: updated,
          totalAmount: updated.reduce((sum, i) => sum + i.subtotal, 0),
        };
      }
      const newItem: CartItem = {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        quantity: 1,
        subtotal: product.price,
      };
      return {
        items: [...state.items, newItem],
        totalAmount: state.totalAmount + product.price,
      };
    }),

  removeItem: (productId) =>
    set((state) => {
      const filtered = state.items.filter((i) => i.product_id !== productId);
      return {
        items: filtered,
        totalAmount: filtered.reduce((sum, i) => sum + i.subtotal, 0),
      };
    }),

  updateQuantity: (productId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        const filtered = state.items.filter((i) => i.product_id !== productId);
        return {
          items: filtered,
          totalAmount: filtered.reduce((sum, i) => sum + i.subtotal, 0),
        };
      }
      const updated = state.items.map((i) =>
        i.product_id === productId
          ? { ...i, quantity, subtotal: quantity * i.price }
          : i
      );
      return {
        items: updated,
        totalAmount: updated.reduce((sum, i) => sum + i.subtotal, 0),
      };
    }),

  clearCart: () => set({ items: [], totalAmount: 0 }),
}));
