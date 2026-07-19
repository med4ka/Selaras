# FASE 2 — OFFLINE-FIRST SYNC: SPESIFIKASI TEKNIS DETAIL

> File ini WAJIB dibaca AI sebelum mengerjakan task apapun di Fase 2. Ini bukan brainstorm — ini keputusan final yang sudah disepakati. Jangan usulkan alternatif desain (misal last-write-wins, atau blocking UI saat offline) kecuali diminta eksplisit.

## 0. KEPUTUSAN YANG SUDAH FINAL (Jangan Didebat Ulang)

| Keputusan | Pilihan Final |
|---|---|
| Kapan sync terjadi | OTOMATIS saat koneksi kembali online, tanpa tombol manual |
| Notifikasi status koneksi | Toast setiap kali status berubah (online→offline DAN offline→online) |
| Validasi stok saat offline | TIDAK ADA sama sekali. Kasir bisa transaksi produk apapun jumlah berapapun saat offline. Validasi stok terjadi 100% di server saat sync (pakai logic atomic `WHERE quantity >= ?` yang SUDAH ADA dari Fase 1 — tidak perlu dibuat ulang) |
| Transaksi gagal sync (conflict) | DUA hal: (a) badge angka merah di menu, (b) halaman detail khusus buat review manual Owner |

## 1. SKEMA DEXIE (IndexedDB) — Struktur Persis

### Tabel `products_cache`
```typescript
{
  id: string,          // UUID produk, primary key
  sku: string,
  name: string,
  price: number,       // integer Rupiah, BUKAN float
  category_id: string,
  category_name: string,
  cached_at: number     // timestamp Unix ms, kapan data ini terakhir di-refresh dari server
}
```
**Fungsi:** Katalog produk buat ditampilkan di grid Kasir SAAT OFFLINE. Diisi/di-refresh setiap kali `getProducts()` berhasil dipanggil saat online (piggyback di response yang sama, bukan request terpisah).

### Tabel `pending_transactions`
```typescript
{
  local_id: number,           // auto-increment, primary key LOKAL (bukan dikirim ke server)
  idempotency_key: string,    // UNIQUE, dibuat client-side pakai generateIdempotencyKey() yang SUDAH ADA
  outlet_id: string,
  cashier_id: string,
  items: Array<{ product_id: string, quantity: number }>,   // TANPA unit_price — harga tetap di-lookup server, sesuai prinsip Fase 1
  payments: Array<{ method: string, amount: number }>,
  total_amount: number,
  status: "pending" | "syncing" | "synced" | "conflict" | "failed",
  created_at_client: number,   // timestamp Unix ms saat kasir klik Bayar — INI yang dipakai server buat urutan delta merge
  synced_at: number | null,
  error_message: string | null,   // diisi kalau status = conflict/failed
  retry_count: number          // default 0, increment tiap percobaan sync gagal karena network (BUKAN karena conflict)
}
```

## 2. DETEKSI STATUS KONEKSI — Jangan Cuma Andalkan `navigator.onLine`

**Peringatan teknis penting:** `navigator.onLine` browser itu TIDAK RELIABLE — dia cuma ngecek apakah perangkat konek ke jaringan (WiFi/LAN), BUKAN apakah internet beneran nyampe ke server. Contoh kasus gagal: laptop konek WiFi kafe tapi WiFi-nya gak ada internet — `navigator.onLine` tetap bilang `true`.

**Implementasi yang benar:**
1. Pakai `window.addEventListener('online', ...)` dan `('offline', ...)` sebagai SINYAL AWAL (cepat, tapi gak 100% akurat)
2. WAJIB ditambah: health-check aktif — kirim `GET /api/outlets` (endpoint ringan yang udah ada) dengan timeout pendek (3 detik) setiap 15 detik SELAMA status "online" menurut browser. Kalau health-check gagal (timeout atau network error), baru status dianggap OFFLINE beneran.
3. Simpan status final ini di Zustand store baru: `store/network-store.ts` dengan field `isOnline: boolean` dan `lastCheckedAt: number`.

## 3. TOAST NOTIFIKASI STATUS KONEKSI

| Transisi | Toast | Warna |
|---|---|---|
| online → offline | "Koneksi terputus — transaksi akan disimpan secara lokal" | `sync-amber` |
| offline → online | "Koneksi tersambung kembali — menyinkronkan data..." | `sync-emerald` |
| Setelah sync batch selesai, ADA yang berhasil, TIDAK ADA conflict | "X transaksi berhasil disinkronkan" | `sync-emerald` |
| Setelah sync batch selesai, ADA conflict | "X berhasil, Y transaksi perlu ditinjau" | `sync-amber`, dengan tombol aksi "Lihat" yang redirect ke halaman review |

**PENTING:** toast ini HARUS cuma nembak SEKALI per transisi, bukan berulang. Gunakan pola yang sama kayak fix duplikasi toast produk sebelumnya — deteksi PERUBAHAN status (`prevStatus !== currentStatus`), bukan re-render biasa.

## 4. ALUR TRANSAKSI BARU (Menggantikan Alur Fase 1)

**PRINSIP UTAMA:** SEMUA transaksi (baik online maupun offline) HARUS lewat jalur yang SAMA — ditulis ke Dexie dulu, baru dicoba sync. JANGAN bikin 2 jalur kode terpisah (satu buat online, satu buat offline) — itu bakal jadi duplikasi logic sama seperti bug fetch produk sebelumnya.

```
Kasir klik "Bayar"
  │
  ├─ 1. generateIdempotencyKey() (fungsi yang SUDAH ADA)
  ├─ 2. Tulis ke Dexie pending_transactions, status="pending"
  ├─ 3. TAMPILKAN KONFIRMASI SUKSES KE KASIR SEKARANG JUGA
  │      (jangan nunggu network — ini kunci UX offline-first)
  ├─ 4. clearCart()
  │
  └─ 5. Trigger fungsi syncOneTransaction(local_id) SEGERA (fire and forget, tidak blocking UI):
         ├─ Cek network-store.isOnline
         ├─ FALSE → biarkan status="pending", berhenti (sync engine nanti yang lanjutin)
         └─ TRUE  → lanjut ke Bagian 5 (proses sync)
```

## 5. SYNC ENGINE — Logic Detail

### Kapan sync engine berjalan
1. **Trigger utama:** event `offline → online` dari network-store
2. **Safety net:** interval setiap 30 detik SELAMA status online (jaga-jaga ada item pending yang somehow ketinggalan)
3. **Immediate:** langsung setelah transaksi baru dibuat (Bagian 4 langkah 5) KALAU saat itu online

### Proses (WAJIB sequential, satu-satu, BUKAN paralel)
```
syncPendingTransactions():
  1. Ambil SEMUA record di pending_transactions WHERE status = "pending"
  2. Urutkan berdasarkan created_at_client ASCENDING (paling lama duluan)
  3. UNTUK SETIAP record, SATU PERSATU (await, jangan Promise.all):
     a. Update status lokal jadi "syncing"
     b. POST ke /api/transactions dengan body: outlet_id, idempotency_key,
        items, payments (persis struktur yang sudah dipakai createTransaction()
        di Fase 1 — TIDAK ADA perubahan di endpoint backend)
     c. Response 201 Created:
          → status = "synced", synced_at = now
     d. Response 409 Conflict (duplicate idempotency_key):
          → status = "synced" JUGA (ini artinya transaksi ini sebenarnya
            SUDAH pernah berhasil terkirim sebelumnya, misal app sempat
            crash setelah server terima tapi sebelum status lokal ke-update.
            409 di sini BUKAN error yang perlu ditinjau Owner.)
     e. Response 400 dengan pesan mengandung "insufficient stock":
          → status = "conflict", error_message = pesan dari server.
            JANGAN retry otomatis. Ini WAJIB direview manual Owner.
     f. Response error lain (500, timeout, dll):
          → retry_count += 1
          → JIKA retry_count >= 3 → status = "failed", error_message = pesan error
          → JIKA retry_count < 3 → status tetap "pending" (dicoba lagi di
            trigger sync berikutnya)
     g. JIKA di tengah proses ini network tiba-tiba putus (network-store
        berubah jadi offline) → HENTIKAN loop, sisa item tetap "pending",
        tidak perlu lanjut mencoba yang lain
  4. Setelah semua record diproses, hitung total: berapa "synced" baru,
     berapa "conflict" baru → tampilkan toast ringkasan (lihat Bagian 3)
```

## 6. BADGE + HALAMAN REVIEW CONFLICT

### Badge
Angka merah (pakai warna `conflict-red`) muncul di sebelah menu "Transaksi" di sidebar, isinya `COUNT(*) WHERE status = "conflict"` dari Dexie. Update reaktif (pakai Dexie live query / `useLiveQuery` dari `dexie-react-hooks`, BUKAN polling manual).

### Halaman Review (`/transactions/review` atau sejenis)
- HANYA bisa diakses role `owner`/`manager` (pola `restrictedRoles` yang sudah ada dipakai kebalikannya — atau buat guard baru, sesuaikan dengan pola existing)
- Tampilkan list transaksi dengan status "conflict" DAN "failed" (2 tab terpisah)
- Tiap item tampilkan: waktu transaksi (created_at_client), daftar item + quantity, pesan error dari server
- Aksi yang tersedia per item:
  - **"Hapus"** — buang transaksi ini dari Dexie permanen (Owner memutuskan transaksi ini gak jadi diproses, misal karena barangnya emang udah abis beneran)
  - **"Coba Lagi"** — reset status jadi "pending", biar dicoba sync ulang di siklus berikutnya (berguna kalau ternyata stok udah direstock)

## 7. YANG TIDAK BERUBAH DARI FASE 1 (Reuse, Jangan Bikin Ulang)

- Endpoint backend `/api/transactions` — TIDAK ADA perubahan sama sekali
- `generateIdempotencyKey()` di `utils/format.ts` — dipakai persis sama
- Logic atomic stock check `WHERE quantity >= ?` di backend — inilah yang otomatis jadi validasi stok pas sync, TIDAK PERLU dibuat ulang di frontend
- `createTransaction()` di `services/data.ts` — dipakai sebagai fungsi pemanggil API di dalam sync engine, TIDAK PERLU dibuat fungsi API baru

## 8. URUTAN KERJA (Jangan Loncat)

1. **Langkah 1:** Setup Dexie — buat `db/schema.ts` sesuai Bagian 1, plus `products_cache` diisi dari `getProducts()` yang sudah ada
2. **Langkah 2:** `network-store.ts` — deteksi online/offline sesuai Bagian 2, plus toast sesuai Bagian 3. TES DULU sampai bagian ini benar-benar akurat (bukan cuma `navigator.onLine` polos) sebelum lanjut
3. **Langkah 3:** Ubah alur transaksi Kasir sesuai Bagian 4 — transaksi selalu tulis ke Dexie dulu
4. **Langkah 4:** Sync engine sesuai Bagian 5
5. **Langkah 5:** Badge + halaman review sesuai Bagian 6
