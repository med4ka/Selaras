"use client";

import { useEffect, useState, useCallback } from "react";
import { Package, Plus, Pencil, Trash2, RotateCcw, EyeOff, Eye } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { useProductStore } from "@/store/product-store";
import { getCategories, createProduct, updateProduct, deleteProduct, restoreProduct } from "@/services/data";
import type { Product, Category, ProductInput } from "@/services/data";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/skeleton";
import { Modal } from "@/components/modal";
import { ProductForm } from "@/components/products/product-form";
import { formatCurrency } from "@/utils/format";

type ModalMode = "create" | "edit" | "delete" | null;

export default function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const { items, loading, fetchProducts, refetchProducts } = useProductStore();

  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoaded, setCatsLoaded] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const canManage = user?.role === "owner" || user?.role === "manager";

  const activeItems = items.filter((p) => p.is_active !== false);
  const inactiveItems = items.filter((p) => p.is_active === false);
  const displayItems = showInactive ? items : activeItems;

  useEffect(() => {
    fetchProducts();
    getCategories()
      .then(setCategories)
      .catch(() => toast.error("Gagal memuat kategori"))
      .finally(() => setCatsLoaded(true));
  }, [fetchProducts]);

  const openCreate = useCallback(() => {
    setSelected(null);
    setModalMode("create");
  }, []);

  const openEdit = useCallback((p: Product) => {
    setSelected(p);
    setModalMode("edit");
  }, []);

  const openDelete = useCallback((p: Product) => {
    setSelected(p);
    setModalMode("delete");
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setSelected(null);
  }, []);

  async function handleCreate(data: ProductInput) {
    try {
      await createProduct(data);
      toast.success("Produk berhasil ditambahkan");
      closeModal();
      refetchProducts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambah produk";
      toast.error(msg);
    }
  }

  async function handleEdit(data: ProductInput) {
    if (!selected) return;
    try {
      await updateProduct(selected.id, data);
      toast.success("Produk berhasil diperbarui");
      closeModal();
      refetchProducts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui produk";
      toast.error(msg);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteProduct(selected.id);
      toast.success("Produk berhasil dihapus");
      closeModal();
      refetchProducts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus produk";
      toast.error(msg);
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreProduct(id);
      toast.success("Produk berhasil diaktifkan kembali");
      refetchProducts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengaktifkan produk";
      toast.error(msg);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">Produk</h1>
        </div>
        <div className="flex items-center gap-2">
          {inactiveItems.length > 0 && (
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-2 text-sm font-medium text-ink-muted hover:bg-canvas transition-colors"
              aria-label={showInactive ? "Sembunyikan nonaktif" : "Tampilkan nonaktif"}
            >
              {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showInactive ? "Sembunyikan nonaktif" : `Nonaktif (${inactiveItems.length})`}
            </button>
          )}
          {canManage && (
            <button
              aria-label="Tambah produk"
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-ledger-navy px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Produk
            </button>
          )}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-surface p-4 shadow-sm">
              <Skeleton className="mb-2 h-3 w-16" />
              <Skeleton className="mb-4 h-4 w-3/4" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title={showInactive ? "Tidak ada produk nonaktif" : "Belum ada produk"}
          description={
            showInactive
              ? "Semua produk masih aktif."
              : "Kelola daftar produk, SKU, kategori, dan harga di sini."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {displayItems.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border bg-surface p-4 shadow-sm ${
                p.is_active === false ? "border-sync-amber/20 opacity-60" : "border-border/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[11px] text-ink-muted">{p.sku}</span>
                {p.is_active === false && (
                  <span className="rounded-md bg-sync-amber/10 px-1.5 py-0.5 text-[10px] font-medium text-sync-amber">
                    Nonaktif
                  </span>
                )}
              </div>
              <h3 className="mt-0.5 text-sm font-medium text-ink line-clamp-2">{p.name}</h3>
              <p className="mt-2 font-mono text-sm font-medium text-ledger-navy">
                {formatCurrency(p.price)}
              </p>
              {canManage && (
                <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-3">
                  {p.is_active === false ? (
                    <button
                      aria-label={`Aktifkan ${p.name}`}
                      onClick={() => handleRestore(p.id)}
                      className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-sync-emerald hover:bg-sync-emerald/5 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Aktifkan
                    </button>
                  ) : (
                    <>
                      <button
                        aria-label={`Edit ${p.name}`}
                        onClick={() => openEdit(p)}
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        aria-label={`Hapus ${p.name}`}
                        onClick={() => openDelete(p)}
                        className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-ink-muted hover:bg-conflict-red/10 hover:text-conflict-red transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Hapus
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(modalMode === "create" || modalMode === "edit") && (
        <Modal
          open
          onClose={closeModal}
          title={modalMode === "create" ? "Tambah Produk" : "Edit Produk"}
        >
          <ProductForm
            product={modalMode === "edit" ? selected ?? undefined : undefined}
            categories={categories}
            onSubmit={modalMode === "create" ? handleCreate : handleEdit}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {modalMode === "delete" && selected && (
        <Modal open onClose={closeModal} title="Hapus Produk">
          <p className="mb-5 text-sm text-ink-muted">
            Yakin ingin menghapus <span className="font-medium text-ink">{selected.name}</span>?
            Tindakan ini tidak bisa dibatalkan.
          </p>
          <div className="flex items-center gap-2">
            <button
              aria-label="Batal hapus"
              onClick={closeModal}
              className="flex-1 rounded-lg border border-border/50 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-canvas transition-colors"
            >
              Batal
            </button>
            <button
              aria-label="Konfirmasi hapus"
              onClick={handleDelete}
              className="flex-1 rounded-lg bg-conflict-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-conflict-red/90"
            >
              Hapus
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
