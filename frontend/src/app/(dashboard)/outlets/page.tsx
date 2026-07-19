"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Plus, Pencil, Trash2, RotateCcw, EyeOff, Eye } from "lucide-react";
import { toast } from "@/lib/toast";
import { getOutlets, createOutlet, updateOutlet, deleteOutlet, restoreOutlet } from "@/services/data";
import type { Outlet } from "@/services/data";
import { Modal } from "@/components/modal";
import { OutletForm } from "@/components/outlets/outlet-form";
import type { OutletInput } from "@/services/data";
import { Skeleton } from "@/components/skeleton";
import { useAuthStore } from "@/store/auth-store";

export default function OutletsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (user && !isOwner) {
      router.replace("/");
    }
  }, [user, isOwner, router]);

  if (!user || !isOwner) return null;

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<Outlet | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await getOutlets(true);
      setOutlets(data);
    } catch {
      toast.error("Gagal memuat data outlet");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeOutlets = outlets.filter((o) => o.is_active !== false);
  const inactiveOutlets = outlets.filter((o) => o.is_active === false);
  const displayOutlets = showInactive ? outlets : activeOutlets;

  function openEdit(o: Outlet) {
    setSelected(o);
    setModal("edit");
  }

  function openDelete(o: Outlet) {
    setSelected(o);
    setModal("delete");
  }

  async function handleCreate(data: OutletInput) {
    try {
      await createOutlet(data);
      toast.success("Outlet berhasil ditambahkan");
      setModal(null);
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan outlet";
      toast.error(msg);
    }
  }

  async function handleUpdate(data: OutletInput) {
    if (!selected) return;
    try {
      await updateOutlet(selected.id, data);
      toast.success("Outlet berhasil diperbarui");
      setModal(null);
      setSelected(null);
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui outlet";
      toast.error(msg);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteOutlet(selected.id);
      toast.success("Outlet berhasil dinonaktifkan");
      setModal(null);
      setSelected(null);
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menonaktifkan outlet";
      toast.error(msg);
    }
  }

  async function handleRestore(id: string) {
    try {
      await restoreOutlet(id);
      toast.success("Outlet berhasil diaktifkan kembali");
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengaktifkan outlet";
      toast.error(msg);
    }
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">Outlet</h1>
        </div>
        <div className="flex items-center gap-2">
          {inactiveOutlets.length > 0 && (
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-2 text-sm font-medium text-ink-muted hover:bg-canvas transition-colors"
              aria-label={showInactive ? "Sembunyikan nonaktif" : "Tampilkan nonaktif"}
            >
              {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showInactive ? "Sembunyikan nonaktif" : `Nonaktif (${inactiveOutlets.length})`}
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => {
                setSelected(null);
                setModal("create");
              }}
              className="flex items-center gap-1.5 rounded-lg bg-ledger-navy px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah Outlet
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-surface p-4 shadow-sm">
              <Skeleton className="mb-2 h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : displayOutlets.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-surface p-8 text-center shadow-sm">
          <Store className="mx-auto mb-3 h-8 w-8 text-ink-muted/40" aria-hidden="true" />
          <p className="text-sm text-ink-muted">
            {showInactive ? "Tidak ada outlet nonaktif" : "Belum ada outlet"}
          </p>
          {isOwner && !showInactive && (
            <button
              onClick={() => setModal("create")}
              className="mt-3 rounded-lg bg-ledger-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90"
            >
              Tambah Outlet
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayOutlets.map((o) => (
            <div
              key={o.id}
              className={`flex items-center justify-between rounded-xl border bg-surface p-4 shadow-sm ${
                o.is_active === false ? "border-sync-amber/20 opacity-60" : "border-border/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-ink">{o.name}</p>
                  {o.address && (
                    <p className="mt-0.5 text-xs text-ink-muted">{o.address}</p>
                  )}
                </div>
                {o.is_active === false && (
                  <span className="rounded-md bg-sync-amber/10 px-1.5 py-0.5 text-[10px] font-medium text-sync-amber">
                    Nonaktif
                  </span>
                )}
              </div>
              {isOwner && (
                <div className="flex items-center gap-1">
                  {o.is_active === false ? (
                    <button
                      aria-label={`Aktifkan ${o.name}`}
                      onClick={() => handleRestore(o.id)}
                      className="flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-medium text-sync-emerald hover:bg-sync-emerald/5 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Aktifkan
                    </button>
                  ) : (
                    <>
                      <button
                        aria-label={`Edit ${o.name}`}
                        onClick={() => openEdit(o)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        aria-label={`Nonaktifkan ${o.name}`}
                        onClick={() => openDelete(o)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-conflict-red/10 hover:text-conflict-red transition-colors"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Tambah Outlet"
      >
        <OutletForm onSubmit={handleCreate} onCancel={() => setModal(null)} />
      </Modal>

      <Modal
        open={modal === "edit"}
        onClose={() => { setModal(null); setSelected(null); }}
        title="Edit Outlet"
      >
        {selected && (
          <OutletForm
            outlet={selected}
            onSubmit={handleUpdate}
            onCancel={() => { setModal(null); setSelected(null); }}
          />
        )}
      </Modal>

      <Modal
        open={modal === "delete"}
        onClose={() => { setModal(null); setSelected(null); }}
        title="Nonaktifkan Outlet"
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Yakin ingin menonaktifkan outlet <strong className="text-ink">{selected.name}</strong>?
              Outlet ini tidak akan muncul di daftar aktif, tapi data transaksi dan stok tetap tersimpan.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setModal(null); setSelected(null); }}
                className="flex-1 rounded-lg border border-border/50 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-canvas transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-lg bg-conflict-red px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-conflict-red/90"
              >
                Nonaktifkan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
