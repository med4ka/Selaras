import { Receipt } from "lucide-react";
import { ProductGrid } from "@/components/kasir/product-grid";
import { CartPanel } from "@/components/kasir/cart-panel";

export default function TransactionsPage() {
  return (
    <section className="flex h-full flex-col">
      <div className="mb-6 flex items-center gap-3">
        <Receipt className="h-5 w-5 text-ink-muted" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-ink">Kasir</h1>
      </div>

      <div className="flex flex-1 gap-4">
        {/* Product grid — left */}
        <div className="flex flex-1 flex-col">
          <ProductGrid />
        </div>

        {/* Cart panel — right, sticky */}
        <div className="w-96 shrink-0">
          <div className="sticky top-6 h-[calc(100vh-9rem)]">
            <CartPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
