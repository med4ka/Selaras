"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Pencil, Trash2, ShieldCheck, RotateCcw, EyeOff, Eye } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import {
  getUsers, createUser, updateUser, deactivateUser, restoreUser,
  getOutlets,
} from "@/services/data";
import type { User, CreateUserInput, UpdateUserInput, Outlet } from "@/services/data";
import { Modal } from "@/components/modal";
import { Skeleton } from "@/components/skeleton";

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const activeOutletId = useAuthStore((s) => s.activeOutletId);
  const [users, setUsers] = useState<User[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const activeUsers = users.filter((u) => u.is_active !== false);
  const inactiveUsers = users.filter((u) => u.is_active === false);
  const displayUsers = showInactive ? users : activeUsers;

  async function load() {
    setLoading(true);
    try {
      const [u, o] = await Promise.all([getUsers(activeOutletId ?? undefined), getOutlets()]);
      setUsers(u);
      setOutlets(o);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [activeOutletId]);

  function openEdit(u: User) {
    setSelected(u);
    setModal("edit");
  }

  async function handleCreate(data: CreateUserInput | UpdateUserInput) {
    try {
      await createUser(data as CreateUserInput);
      toast.success("Staff berhasil ditambahkan");
      setModal(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah staff");
    }
  }

  async function handleUpdate(data: CreateUserInput | UpdateUserInput) {
    if (!selected) return;
    try {
      const body: Record<string, string> = { role: (data as UpdateUserInput).role };
      if ((data as UpdateUserInput).username) body.username = (data as UpdateUserInput).username!;
      if ((data as UpdateUserInput).password) body.password = (data as UpdateUserInput).password!;
      if ((data as UpdateUserInput).outlet_id) body.outlet_id = (data as UpdateUserInput).outlet_id!;
      await updateUser(selected.id, body as any);
      toast.success("Staff berhasil diperbarui");
      setModal(null);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui staff");
    }
  }

  async function handleDeactivate(u: User) {
    try {
      await deactivateUser(u.id);
      toast.success(`${u.username} berhasil dinonaktifkan`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menonaktifkan");
    }
  }

  async function handleRestore(u: User) {
    try {
      await restoreUser(u.id);
      toast.success(`${u.username} berhasil diaktifkan kembali`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengaktifkan staff");
    }
  }

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: "bg-ledger-navy/10 text-ledger-navy",
      manager: "bg-sync-amber/10 text-sync-amber",
      kasir: "bg-sync-emerald/10 text-sync-emerald",
    };
    return styles[role] ?? "bg-ink-muted/10 text-ink-muted";
  };

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: "Owner",
      manager: "Manager",
      kasir: "Kasir",
    };
    return labels[role] ?? role;
  };

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-ink-muted" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-ink">Staff</h1>
        </div>
        <div className="flex items-center gap-2">
          {inactiveUsers.length > 0 && (
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-2 text-sm font-medium text-ink-muted hover:bg-canvas transition-colors"
              aria-label={showInactive ? "Sembunyikan nonaktif" : "Tampilkan nonaktif"}
            >
              {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showInactive ? "Sembunyikan nonaktif" : `Nonaktif (${inactiveUsers.length})`}
            </button>
          )}
          <button
            onClick={() => {
              setSelected(null);
              setModal("create");
            }}
            className="flex items-center gap-1.5 rounded-lg bg-ledger-navy px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Staff
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-surface p-4 shadow-sm">
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      ) : displayUsers.length === 0 ? (
        <div className="rounded-xl border border-border/50 bg-surface p-8 text-center shadow-sm">
          <Users className="mx-auto mb-3 h-8 w-8 text-ink-muted/40" aria-hidden="true" />
          <p className="text-sm text-ink-muted">{showInactive ? "Tidak ada staff nonaktif" : "Belum ada staff"}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-canvas/50">
                <th className="px-5 py-3 text-left font-medium text-ink-muted">Username</th>
                <th className="px-5 py-3 text-left font-medium text-ink-muted">Role</th>
                <th className="px-5 py-3 text-left font-medium text-ink-muted">Outlet</th>
                <th className="px-5 py-3 text-center font-medium text-ink-muted">Status</th>
                <th className="px-5 py-3 text-right font-medium text-ink-muted">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {displayUsers.map((u) => (
                <tr
                  key={u.id}
                  className={`transition-colors hover:bg-canvas/30 ${
                    u.is_active === false ? "border-sync-amber/20 opacity-60" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-ink">{u.username}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${roleBadge(u.role)}`}>
                      <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted">{u.outlet || "—"}</td>
                  <td className="px-5 py-3.5 text-center">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sync-emerald/10 px-2 py-0.5 text-[11px] font-medium text-sync-emerald">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-sync-amber/10 px-2 py-0.5 text-[11px] font-medium text-sync-amber">
                        Nonaktif
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.role !== "owner" && (
                      <div className="flex items-center justify-end gap-1">
                        {u.is_active ? (
                          <>
                            <button
                              aria-label={`Edit ${u.username}`}
                              onClick={() => openEdit(u)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink transition-colors"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              aria-label={`Nonaktifkan ${u.username}`}
                              onClick={() => handleDeactivate(u)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-conflict-red/10 hover:text-conflict-red transition-colors"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </>
                        ) : (
                          <button
                            aria-label={`Aktifkan kembali ${u.username}`}
                            onClick={() => handleRestore(u)}
                            className="flex items-center gap-1.5 rounded-lg border border-sync-emerald/30 px-3 py-1.5 text-xs font-medium text-sync-emerald hover:bg-sync-emerald/5 transition-colors"
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            Aktifkan Kembali
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Tambah Staff"
      >
        <UserForm
          currentUserRole={currentUser?.role}
          outlets={outlets}
          onSubmit={handleCreate}
          onCancel={() => setModal(null)}
        />
      </Modal>

      <Modal
        open={modal === "edit"}
        onClose={() => { setModal(null); setSelected(null); }}
        title="Edit Staff"
      >
        {selected && (
          <UserForm
            user={selected}
            currentUserRole={currentUser?.role}
            outlets={outlets}
            onSubmit={handleUpdate}
            onCancel={() => { setModal(null); setSelected(null); }}
          />
        )}
      </Modal>
    </section>
  );
}

function UserForm({
  user, currentUserRole, outlets, onSubmit, onCancel,
}: {
  user?: User;
  currentUserRole?: string;
  outlets: Outlet[];
  onSubmit: (data: CreateUserInput | UpdateUserInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(user?.role ?? "kasir");
  const [outletId, setOutletId] = useState(user?.outlet_id ?? "");
  const [submitting, setSubmitting] = useState(false);

  const isCreate = !user;
  const isManager = currentUserRole === "manager";

  const availableRoles = isManager
    ? [{ value: "kasir", label: "Kasir" }]
    : [
        { value: "kasir", label: "Kasir" },
        { value: "manager", label: "Manager" },
        { value: "owner", label: "Owner" },
      ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isCreate && (!username || !password)) return;
    if (!role) return;

    setSubmitting(true);
    try {
      if (isCreate) {
        await onSubmit({
          username: username.trim(),
          password,
          role,
          outlet_id: outletId || undefined,
        } as CreateUserInput);
      } else {
        const body: UpdateUserInput = { role };
        if (username.trim() && username.trim() !== user?.username) body.username = username.trim();
        if (password) body.password = password;
        if (outletId) body.outlet_id = outletId;
        await onSubmit(body);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required={isCreate}
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">
          {isCreate ? "Password" : "Password Baru (kosongkan jika tidak diubah)"}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={isCreate}
          minLength={isCreate ? 6 : undefined}
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-muted">Role</label>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            if (e.target.value === "owner") setOutletId("");
          }}
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
        >
          {availableRoles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {role !== "owner" && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Outlet</label>
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            required={role !== "owner"}
            className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
          >
            <option value="">Pilih outlet</option>
            {outlets.filter((o) => o.is_active).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-border/50 px-4 py-2 text-sm font-medium text-ink-muted hover:bg-canvas transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={submitting || (isCreate && (!username || !password)) || (!isCreate && !username.trim())}
          className="flex-1 rounded-lg bg-ledger-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : isCreate ? "Tambah" : "Simpan"}
        </button>
      </div>
    </form>
  );
}
