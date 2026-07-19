# PROGRESS TRACKER — SELARAS

> File ini WAJIB dibaca AI di awal setiap sesi, dan WAJIB di-update di akhir setiap sesi (minta AI update sebelum sesi ditutup). Ini bukan dokumentasi final — ini "memori kerja" antar sesi vibe coding.

## Status Saat Ini
**Fase aktif:** Fase 1 — Core POS ✅ SELESAI
**Terakhir dikerjakan:** 17 Juli 2026 — Kustomisasi toast Sonner + tag v1.0.0-fase1
**Update terakhir:** 17 Juli 2026

## Sudah Selesai ✅
- **Langkah 1 (Inisialisasi Project):** Backend Go Fiber + GORM ter-setup dengan modul init, seluruh dependencies (Fiber, GORM, PostgreSQL driver, JWT, validator, UUID, bcrypt, godotenv). Frontend Next.js 16 + Tailwind CSS v4 + TypeScript ter-setup, dependencies tambahan (lucide-react, framer-motion, dexie, zustand, sonner, zod, clsx, tailwind-merge) terinstal.
- **Struktur direktori backend:** config/, database/, middleware/, models/, repository/, service/, handlers/, routes/, main.go
- **Struktur direktori frontend:** src/components/, src/hooks/, src/services/, src/store/, src/db/, src/utils/
- **Konfigurasi env:** .env backend (DB conn pool, JWT, server port), .env.local frontend (API_URL). Log startup: status load .env + peringatan JWT_SECRET default.
- **Font IBM Plex Sans & Mono** terintegrasi via next/font/google
- **Custom Tailwind theme** dengan warna fungsional dari design.md
- **Zustand stores:** auth-store (login/logout/token + persist localStorage + cookie), cart-store (add/remove/update quantity), product-store (fetch + refetch)
- **Dexie schema** untuk offline queue transaksi & stock delta
- **Backend GORM models** semua tabel — AutoMigrate siap
- **Auth middleware** JWT + role-based access control (middleware/auth.go)
- **Seeder:** data awal (outlet pusat, user owner & kasir1, 2 kategori, 2 produk, stok awal + stock ledger)
- **Auth Service Layer:** service/auth_service.go (validasi login, bcrypt compare, JWT generate, GetProfile)
- **User Repository Layer:** repository/user_repository.go (interface GetByUsername, GetByID, Create)
- **Auth Handler:** handlers/auth_handler.go (Login endpoint — parse request, validasi, panggil service)
- **User Handler:** handlers/user_handler.go (GetProfile — ambil user_id dari JWT, return profil lengkap)
- **Frontend API service:** src/services/api.ts (base fetch wrapper + auth token), auth.ts (login, getProfile), data.ts (products, categories, outlets, stocks, transactions, reports)
- **Langkah 3 — CRUD Produk & Kategori:**
  - `repository/category_repository.go` — interface List, GetByID, Create, Update, Delete
  - `repository/product_repository.go` — interface List (Preload Category, filter is_active), GetByID, GetBySKU, Create, Update, Delete (soft-delete — update is_active=false)
  - `service/category_service.go` — validasi payload (validator/v10), UUID parsing, CRUD logic
  - `service/product_service.go` — validasi, cek kategori exist, cek SKU unik (pesan error beda untuk produk aktif vs nonaktif), CRUD dengan Preload Category di response
  - `handlers/category_handler.go` — List, GetByID, Create, Update, Delete via Fiber
  - `handlers/product_handler.go` — List (support ?include_inactive=true), GetByID, Create, Update, Delete via Fiber
  - Route protection: `middleware.RequireRole("owner", "manager")` di POST/PUT/DELETE — Kasir read-only
- **Langkah 3 — POST /api/transactions (core transaction + stock_ledger):**
  - `repository/transaction_repository.go` — Create (dengan dbTx), ExistsByIdempotencyKey
  - `repository/stock_repository.go` — StockLedgerRepository (Create, ExistsByIdempotencyKey), StockRepository (GetByProductAndOutlet, UpsertQuantity)
  - `service/transaction_service.go` — validasi payload, idempotency check, DB transaction: insert transaction + items + payments + stock_ledger entries (append-only) + update stocks cache
  - `handlers/transaction_handler.go` — parse body, ambil cashier_id dari JWT, call service, return 409 untuk duplicate idempotency_key
- **Frontend CRUD + Transaction API:** services/data.ts diperbarui dengan createCategory/updateCategory/deleteCategory, createProduct/updateProduct/deleteProduct, createTransaction, getSalesReport
- **Langkah 4 — Core Layout (Sidebar + Topbar + Sync Indicator):**
  - `components/sidebar.tsx` — Navigasi (Dashboard, Transaksi, Produk, Stok, Laporan) dengan active state + Kasir CTA button. Menu Laporan disembunyikan untuk role kasir (via `restrictedRoles: ["kasir"]` menggantikan `requireAdmin`).
  - `components/topbar.tsx` — Header dengan outlet dropdown (Owner: pilih outlet via dropdown real, Manager/Kasir: read-only)
  - `components/sync-indicator.tsx` — Pill status real-time: hijau (synced), amber (pending/offline), a11y aria-live
  - Route groups: `(dashboard)` sidebar+topbar layout, `(auth)` centered minimal layout
  - Halaman placeholder: `/`, `/transactions`, `/products`, `/stocks`, `/reports`
- **Langkah 4 — Halaman Login:**
  - `app/(auth)/login/page.tsx` — Form login ke POST /api/auth/login, loading spinner, error toast Sonner, redirect ke `/`
- **Warm Paper palette redesign (Langkah 4.5):**
  - `globals.css` — palet baru: canvas #FAF8F5, ink #292524, ink-muted #78716C, ledger-navy #1E3A5F, surface #FFFFFF. Dark mode dihapus (prioritas Fase 1 light mode saja)
  - `sidebar.tsx` — light theme (bg-surface), ledger-navy active state, user profile section (avatar + role) dipisah dari tombol Kasir
  - `topbar.tsx` — bg-surface, avatar dihapus (pindah ke sidebar), focus pada outlet switcher + sync indicator
  - `login/page.tsx` — ledger-navy menggantikan ledger-blue, bg-surface untuk card
  - `layout.tsx` auth & dashboard — dark mode classes dihapus
  - Semua page konten: card container `rounded-xl border border-border/50 bg-surface shadow-sm` untuk empty state
- **Route guard (proxy.ts):** Next.js 16 proxy.ts — redirect ke /login kalau tidak ada cookie selaras_token
- **Outlet state management:** auth-store menyimpan activeOutletId + outlets + cookie persist. Topbar dropdown real untuk Owner. CartPanel baca activeOutletId dari store, bukan hardcoded.
- **Product CRUD Frontend:** components/modal.tsx, components/products/product-form.tsx. products/page.tsx role-based (create/edit/delete untuk owner/manager, read-only untuk kasir). Modal create + edit, confirmation delete.
- **Soft Delete Produk:** Backend Product field `IsActive` + repository List filter is_active=true + Delete update is_active=false. SKU duplicate error message beda (aktif vs nonaktif). Frontend tidak perlu perubahan.
- **Laporan Penjualan Backend:**
  - `repository/report_repository.go` — GetSalesReport (total_penjualan int64, jumlah_transaksi int64, produk_terlaris top 5). Semua nominal int64 (CAST AS BIGINT), bukan float.
  - `service/report_service.go` — pass-through ke repository
  - `handlers/report_handler.go` — query params from/to (validasi format + from <= to), outlet_id (role-based: Owner bebas, Manager/Kasir forced ke outlet sendiri)
  - Route: `GET /api/reports/sales` — RequireRole("owner", "manager")
- **Laporan Penjualan Frontend:**
  - `app/(dashboard)/reports/page.tsx` — date range picker (default: bulan ini), dropdown outlet (Owner only, pakai data dari auth store), summary cards (total penjualan + jumlah transaksi, mono ledger-navy), tabel produk terlaris (nama, SKU mono, quantity, revenue mono). Loading skeleton + error toast + empty state. Fix hydration double-fetch: `isOwner` dihapus dari dependency array `useCallback` + `useRef` dedup guard.
  - `services/data.ts` — getSalesReport() + type TopProductReport + SalesReport
- **Toast Sonner dikustomisasi:** `lib/toast.tsx` — wrapper dengan `toast.custom()` + ikon Lucide + border kiri warna status (sync-emerald/conflict-red/sync-amber), font IBM Plex Sans, shadow-sm, rounded-xl. Semua import toast dialihkan ke wrapper baru. `layout.tsx` — `richColors` dihapus.

## Sedang Dikerjakan 🚧
- (Fase 1 selesai — lanjut Fase 2 atau review tech debt)

## Belum Dibuat (Backlog Fase 1)
> Fitur yang belum disentuh sama sekali:
- **Manajemen Outlet CRUD** — backend handler + frontend UI
- **Frontend dashboard** — ringkasan penjualan, stok, dll
- **Fase 2 (Offline-First Sync)** — belum dimulai sama sekali

## Diketahui Bermasalah / Belum Dites ⚠️
- Token JWT di localStorage + cookie non-httpOnly — rentan XSS, perbaiki sebelum production
- outlet_id di token Owner = string kosong "", seharusnya null — minor, gak fungsional bug

## Keputusan Teknis yang Sudah Diambil (dan kenapa)
> Supaya AI di sesi berikutnya gak "mengusulkan ulang" hal yang sudah diputuskan lalu bikin kamu bolak-balik jelasin alasan yang sama.
- Delta-based merge untuk stock_ledger (bukan last-write-wins) — lihat AGENTS.md 0.4
- GORM models ditempatkan di package `database/` (bukan `models/`) agar AutoMigrate bisa langsung akses — DTO request/response dipisah di `service/` untuk sekarang
- Zustand sebagai state management (bukan Redux/Context)
- Dexie.js untuk offline-first storage (IndexedDB)
- **Pola arsitektur** untuk semua endpoint: Handler (parse request) → Service (business logic) → Repository (query DB). Handler TIDAK boleh akses db langsung.
- **Seeder** hanya berjalan sekali (cek `count > 0`) — pakai `go run main.go` ulang untuk reset (drop DB dulu)
- **Transaksi + Stock Ledger:** Semua operasi stok dalam satu DB transaction (gorm Transaction). Insert append-only ke stock_ledger + update stocks cache dengan jumlah delta (`quantity = quantity + delta`). Idempotency key dicek sebelum eksekusi — retry tidak akan double-count.
- **CRUD routing pattern:** `GET` tanpa restrict role (semua authenticated user bisa baca). `POST/PUT/DELETE` pakai `middleware.RequireRole("owner", "manager")` untuk proteksi mutasi.
- **Race condition fixes (Langkah 3.5):**
  - Idempotency: `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING` — bukan SELECT pre-check
  - Stock deduction: `UPDATE ... SET qty = qty - ? WHERE qty >= ?` atomic — bukan read-then-write
  - Urutan transaksi: stock check DULUAN sebelum insert items/ledger (fail-fast)
  - `errors.Is()` untuk sentinel error matching, bukan string compare
- **Semua nominal Rupiah pakai int64** di laporan keuangan, bukan float64 — CAST AS BIGINT di SQL
- **Soft delete** untuk produk (is_active boolean) — histori transaksi tetap utuh
- **Proxy (Next.js 16)** untuk route guard, bukan middleware.ts (deprecated)

## Yang Perlu Direview Manual oleh Ghif (prioritas tinggi)
> Karena kamu review sedikit-sedikit pas capek, fokuskan energi review ke area berisiko tinggi ini dulu — bukan semua baris kode:
- Logic di sekitar `stock_ledger` (insert/delta calculation)
- Validasi `idempotency_key` di endpoint transaksi & sync
- Auth/role-check di setiap endpoint (jangan sampai kasir bisa akses endpoint owner)

## WARNING!! 
⚠️ Token JWT disimpan di localStorage + cookie non-httpOnly — rentan XSS. WAJIB dipindah ke httpOnly cookie (Set-Cookie dari backend) sebelum production/multi-user real.

---

## Fase 1 — SELESAI (17 Juli 2026)
Semua fitur diuji manual end-to-end (bukan cuma laporan AI):
- **Auth:** login, JWT, role-based access — 6 skenario tes lolos
- **Transaksi:** atomic stock check, idempotency, unit_price server-side, rollback total — teruji
- **Produk:** CRUD + soft delete + role-based UI — teruji
- **Laporan:** agregasi penjualan, filter outlet, proteksi role, validasi tanggal — teruji
- **Toast:** dikustomisasi sesuai identitas warna Selaras

**Tag:** `v1.0.0-fase1`


## Fase 2 — Dimulai
Rujukan: PHASE2_SPEC.md (WAJIB dibaca AI sebelum kerja di fase ini)
Status: Langkah 1 belum dimulai


## Fase 2 — Progress
- Langkah 1-4: SELESAI, teruji (caching produk, deteksi online/offline 2 lapis, transaksi offline-first, sync engine otomatis)
- Langkah 5 (badge conflict + halaman review): BELUM
- Catatan: perlu konfirmasi race condition antara handlePay fire-and-forget vs sync-engine interval — kemungkinan aman karena idempotency, tapi belum dikonfirmasi eksplisit ke AI

## v2.3.0 — Auth Hardening Selesai
- Token pindah dari localStorage ke httpOnly cookie (proteksi XSS)
- Rate limiting login (5x/menit per IP)
- Outlet filtering konsisten di semua halaman via topbar (single source of truth)
- Logout sekarang lewat endpoint backend (wajib, karena httpOnly cookie gak bisa dihapus dari JS)

## v2.4.0 — Transfer Stok Selesai
- Endpoint POST /api/stocks/transfer, atomic dalam 1 DB transaction
- Idempotency per-item-per-arah (out/in terpisah)
- Frontend: modal transfer dengan validasi stok client-side, Owner-only
- Backlog dari sesi ini: Print Struk, Notifikasi Stok Menipis (threshold custom)