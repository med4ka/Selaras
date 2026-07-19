"use client";

import { useState } from "react";
import type { OutletInput } from "@/services/data";

interface OutletData {
  id: string;
  name: string;
  address: string;
}

interface OutletFormProps {
  outlet?: OutletData;
  onSubmit: (data: OutletInput) => Promise<void>;
  onCancel: () => void;
}

export function OutletForm({ outlet, onSubmit, onCancel }: OutletFormProps) {
  const [name, setName] = useState(outlet?.name ?? "");
  const [address, setAddress] = useState(outlet?.address ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;

    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), address: address.trim() });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="outlet-name" className="mb-1.5 block text-xs font-medium text-ink-muted">
          Nama Outlet
        </label>
        <input
          id="outlet-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Misal: Selaras Cabang Bandung"
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
        />
      </div>

      <div>
        <label htmlFor="outlet-address" className="mb-1.5 block text-xs font-medium text-ink-muted">
          Alamat
        </label>
        <textarea
          id="outlet-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          placeholder="Jl. Contoh No. 123, Kota"
          className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20 resize-none"
        />
      </div>

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
          disabled={submitting || !name}
          className="flex-1 rounded-lg bg-ledger-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Menyimpan..." : outlet ? "Simpan" : "Tambah"}
        </button>
      </div>
    </form>
  );
}
