# Selaras

**POS multi-outlet dengan offline-first sync untuk UMKM Indonesia.**

Selaras adalah sistem Point of Sale yang dirancang untuk bisnis dengan 2+ cabang, khususnya di area dengan koneksi internet yang belum stabil. Kasir tetap bisa bertransaksi walau internet mati — data tersinkron otomatis saat koneksi kembali, tanpa selisih stok atau data hilang.

Project ini dual-purpose: cukup solid untuk dipakai sebagai produk nyata, sekaligus cukup dalam secara teknis (arsitektur delta-based sync) untuk menarik kontributor open source.

---

## Fitur Utama

- **Role-based access control** — Owner (akses semua outlet + kelola staf/outlet/transfer stok), Manager (isolasi penuh ke 1 outlet: kelola produk, stok, staff kasir, lihat laporan), Kasir (transaksi saja)
- **Transaksi kasir** dengan multi-payment method (cash, QRIS, kartu) — offline-first: simpan ke IndexedDB dulu, sync otomatis saat online
- **Manajemen produk & kategori** — SKU, soft delete, role-based CRUD, **threshold stok menipis per-produk** (default 10, bisa diatur tiap produk)
- **Manajemen stok per outlet** — stock ledger append-only sebagai sumber kebenaran, **transfer stok antar outlet** dengan atomic transaction, **stock adjustment** manual dengan delta
- **Manajemen outlet & staff** — soft delete, restore, inactive toggle
- **Laporan penjualan** — harian/bulanan per outlet & gabungan lintas outlet, top 5 produk terlaris
- **Print struk thermal** — format 80mm, hitam-putih, IBM Plex Mono untuk angka, **cetak offline** (font di-self-host)
- **Offline-first sync** — transaksi ditulis ke IndexedDB lokal dulu, sync otomatis saat online
- **Delta-based merge** — stok di-track sebagai perubahan (delta), bukan nilai absolut, dengan idempotency key untuk mencegah double-counting
- **Autentikasi httpOnly cookie** — JWT disimpan di cookie httpOnly (tidak bisa diakses JavaScript), proteksi XSS

## Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS v4, Zustand, Framer Motion, Dexie.js, Lucide Icons |
| **Backend** | Go 1.x, Fiber v2, GORM, PostgreSQL |
| **Offline Storage** | IndexedDB via Dexie.js |
| **Authentication** | JWT (HS256, httpOnly cookie, same-site strict) |

## Arsitektur

### Backend Pattern

Setiap endpoint mengikuti pola **Handler → Service → Repository** (strict — Handler tidak boleh mengakses database langsung):

```
Request → Router → Middleware (Auth, Role) → Handler (parse request/response)
                                               → Service (business logic, validation)
                                                    → Repository (database queries)
```

Lapisan repository dan service diisolasi per entitas. Semua transaksi database menggunakan GORM `Transaction` untuk atomicity.

### Sync Strategy: Delta-Based Merge

Selaras **tidak** menggunakan last-write-wins untuk data stok. Alasannya: last-write-wins pada stok menyebabkan data hilang ketika dua outlet sama-sama menjual barang yang sama saat offline. Sebaliknya, Selaras mencatat setiap perubahan stok sebagai **delta** di tabel append-only `stock_ledger`. Saat sync:

1. Server menjumlahkan seluruh delta berdasarkan `client_created_at`
2. Server menerapkan delta ke stok tervalidasi terakhir dengan atomic `UPDATE ... SET qty = qty + delta WHERE qty + delta >= 0`
3. Idempotency key (UNIQUE constraint) mencegah double-counting jika retry

Stok negatif (dua outlet offline menjual unit terakhir yang sama) tidak di-resolve otomatis — sistem mencatatnya sebagai `adjustment_needed` di `sync_audit_log` untuk review Owner.

### Database Principles

Tabel `stock_ledger` adalah **sumber kebenaran** (append-only, mirip event sourcing). Tabel `stocks` adalah cache hasil kalkulasi untuk query cepat. Keduanya di-update dalam satu transaksi database.

---

## Cara Menjalankan Lokal

### Prasyarat

- Go 1.22+
- Node.js 20+
- PostgreSQL 15+
- npm

### 1. Clone & Setup

```bash
git clone https://github.com/<username>/selaras.git
cd selaras
```

### 2. Backend — Environment

```bash
cd backend
cp .env.example .env
# Edit .env sesuai konfigurasi PostgreSQL lokal:
#   DB_USER=postgres
#   DB_PASSWORD=your_password
#   DB_NAME=selaras
#   DB_HOST=localhost
#   DB_PORT=5432
```

File `.env.example` berisi semua variabel yang dibutuhkan: koneksi database (connection pool), JWT secret/expiry, dan server port.

### 3. Backend — Install & Migrate

```bash
# Unduh dependencies
go mod tidy

# Buat database PostgreSQL
createdb selaras

# Jalankan (akan auto-migrate + seed data awal)
go run main.go
```

Seeder berisi data awal:
- **User:** `owner` / `password123` (role owner, akses semua outlet), `kasir1` / `password123` (role kasir)
- **Outlet:** "Selaras Outlet Pusat"
- **Kategori:** Makanan, Minuman
- **Produk:** 2 produk dengan stok awal (50, 100)
- **Stock ledger:** entry awal untuk setiap produk

> **Catatan:** Seeder hanya berjalan sekali (cek `count(*) > 0`). Untuk reset, drop database dan ulangi.

### 4. Frontend — Install & Jalankan

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8080/api

npm install
npm run dev
```

Frontend berjalan di `http://localhost:3000`. Backend harus berjalan di `http://localhost:8080`.

### 5. Login

Buka `http://localhost:3000/login`, login dengan:
- **Owner:** `owner` / `password123` — akses penuh ke semua fitur
- **Kasir:** `kasir1` / `password123` — terbatas ke transaksi

> Untuk akun Manager, buat via menu Staff setelah login sebagai Owner.

---

## Struktur Folder

```
selaras/
├── backend/
│   ├── config/         # Konfigurasi (.env, koneksi DB)
│   ├── database/       # GORM models + AutoMigrate + seeder
│   ├── handlers/       # HTTP handlers (Fiber controllers)
│   ├── middleware/      # Auth JWT + role-based access control
│   ├── repository/     # Database queries (GORM)
│   ├── routes/         # Route definisi (standalone)
│   ├── service/        # Business logic + validasi
│   └── main.go         # Entry point, dependency injection, route registration
│
├── frontend/
│   ├── src/
│   │   ├── app/        # Next.js App Router pages + layouts
│   │   ├── components/ # UI komponen (modal, sidebar, topbar, form, skeleton)
│   │   ├── db/         # Dexie.js schema untuk IndexedDB offline storage
│   │   ├── hooks/      # Custom React hooks
│   │   ├── lib/        # Utility (toast, format, API client)
│   │   ├── services/   # HTTP client functions (data.ts, auth.ts)
│   │   ├── store/      # Zustand stores (auth, cart, product, network)
│   │   ├── utils/      # Helpers (formatCurrency, generateIdempotencyKey)
│   │   └── proxy.ts    # Next.js route guard (auth redirect)
│   └── package.json
│
├── AGENTS.md           # System constraints, project spec, sync strategy
├── PHASE2_SPEC.md      # Offline-first sync technical specification
├── PROGRESS.md         # Progress tracker antar sesi
├── design.md           # Design system, color palette, typography guide
└── README.md
```

## Status Project

### Selesai — Fase 1: Core POS

Semua fitur berikut sudah diuji manual end-to-end:

- **Auth:** Login JWT dalam httpOnly cookie (bukan localStorage), role-based access (6 skenario), bcrypt password hashing
- **Transaksi:** Atomic stock check + deduction (`WHERE qty >= ?`), idempotency (`ON CONFLICT DO NOTHING`), unit_price ditentukan server (bukan client), rollback total jika gagal
- **Produk & Kategori:** CRUD lengkap + soft delete + role-based UI, **threshold stok menipis per-produk** (bisa diatur di form tambah/edit produk)
- **Outlet & Staff:** CRUD dengan soft delete, restore endpoint, inactive toggle
- **Stock Adjustment:** Penyesuaian stok manual dengan delta, idempotency guard, race-condition-free
- **Transfer Stok Antar Outlet:** Atomic transaction, idempotency per-item-per-arah (suffix `-out`/`-in`), validasi stok cukup, error message dengan nama produk + stok tersedia
- **Laporan Penjualan:** Agregasi per outlet & gabungan, filter tanggal, proteksi role, top 5 produk
- **Dashboard:** Total penjualan, jumlah transaksi, **jumlah produk stok menipis** (threshold per-produk), grafik produk terlaris, transaksi terbaru
- **Design System:** Warm Paper palette, IBM Plex Sans/Mono untuk tabular figures, komponen skeleton loading, status sync indicator

### Selesai — Fase 2: Offline-First Sync

- **Dexie Schema:** IndexedDB dengan `products_cache` dan `pending_transactions`
- **Network Store:** Deteksi online/offline 2 lapis (`navigator.onLine` + health-check periodik)
- **Offline Transaksi:** Semua transaksi ditulis ke Dexie dulu, baru di-sync
- **Sync Engine:** Sequential sync otomatis saat online, idempotency-aware, retry logic
- **Conflict Review Page:** Halaman untuk review transaksi conflict/failed
- **Print Struk:** Print thermal 80mm via `react-to-print`, hitam-putih, font IBM Plex Mono di-self-host untuk cetak offline

### Roadmap — Fase 3 (Nilai Tambah)

- Dashboard analitik jam ramai (peak hours analysis)
- Export laporan (PDF/Excel)
- Notifikasi stok menipis (push/email)
- Dashboard analitik profit margin

---

## Screenshot

[Screenshot akan ditambahkan]

---

*Selaras dibangun dengan Go, Next.js, dan PostgreSQL.*
