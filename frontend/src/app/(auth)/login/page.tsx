"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import { login } from "@/services/auth";

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Username dan password wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const res = await login({ username, password });
      loginStore(res.user);
      toast.success(`Selamat datang, ${res.user.username}`);
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      toast.error(msg);
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-ledger-navy">
          <Store className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-ink">Selaras</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Masuk ke akun Anda
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border/50 bg-surface p-6 shadow-sm"
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-medium text-ink-muted"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="owner"
              autoComplete="username"
              autoFocus
              className="w-full rounded-lg border border-border/50 px-3 py-2 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-ink-muted"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                autoComplete="current-password"
                className="w-full rounded-lg border border-border/50 px-3 py-2 pr-9 text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-colors focus:border-ledger-navy focus:ring-1 focus:ring-ledger-navy/20"
              />
              <button
                type="button"
                aria-label={showPw ? "Sembunyikan password" : "Tampilkan password"}
                onClick={() => setShowPw(!showPw)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-ledger-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ledger-navy/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
