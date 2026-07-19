# TRANSFER STOK ANTAR OUTLET — SPESIFIKASI TEKNIS

> WAJIB dibaca AI sebelum mengerjakan task ini. Ikuti persis, jangan berimprovisasi di bagian atomicity.

## 0. Keputusan Desain

| Keputusan | Final |
|---|---|
| Siapa yang boleh transfer | **Owner SAJA** — bukan Manager, karena transfer melibatkan 2 outlet sekaligus, sementara Manager sengaja dibatasi ke 1 outlet |
| Bisa transfer ke outlet sendiri? | TIDAK — `from_outlet_id` harus beda dari `to_outlet_id`, tolak dengan error jelas kalau sama |
| Kalau stok sumber gak cukup | Transfer DITOLAK TOTAL (semua item, bukan sebagian) — reuse pola atomic `WHERE quantity >= ?` dari transaksi |
| Sumber kebenaran | `stock_ledger`, sama seperti semua operasi stok lain — TIDAK ADA pengecualian |

## 1. Endpoint Baru

`POST /api/stocks/transfer` — `RequireRole("owner")`

### Request Body
```json
{
  "from_outlet_id": "uuid",
  "to_outlet_id": "uuid",
  "idempotency_key": "string",
  "items": [
    { "product_id": "uuid", "quantity": 5 }
  ]
}
```

### Validasi (sebelum proses apapun)
1. `from_outlet_id !== to_outlet_id` — kalau sama, return 400 "Outlet asal dan tujuan tidak boleh sama"
2. `items` tidak boleh kosong
3. `quantity` tiap item harus > 0 (transfer selalu positif, beda dari stock adjustment yang boleh negatif)

## 2. Proses — WAJIB Satu Database Transaction

Semua langkah di bawah ini HARUS di dalam `db.Transaction()` yang SAMA. Kalau ada satu langkah gagal, SEMUA di-rollback — termasuk item lain dalam request yang sama yang sudah sempat diproses.

```
UNTUK SETIAP item di request:
  1. DEDUCT dari from_outlet_id:
     UPDATE stocks SET quantity = quantity - ? 
     WHERE product_id = ? AND outlet_id = from_outlet_id AND quantity >= ?
     → RowsAffected == 0? → return error "stok tidak cukup di outlet asal untuk {nama produk}"
     
  2. INSERT stock_ledger untuk sisi OUT:
     product_id, outlet_id=from_outlet_id, delta=-quantity, reason="transfer_out",
     reference_id=(bisa null atau id transfer batch, opsional),
     idempotency_key = "{idempotency_key}-{product_id}-out"   ← WAJIB unik per item+arah
     
  3. ADD ke to_outlet_id (kalau record stocks belum ada, buat baru dengan quantity=0 dulu baru tambah):
     UPDATE stocks SET quantity = quantity + ? WHERE product_id = ? AND outlet_id = to_outlet_id
     (kalau tidak ada baris, INSERT baru dengan quantity = jumlah yang ditransfer)
     
  4. INSERT stock_ledger untuk sisi IN:
     product_id, outlet_id=to_outlet_id, delta=+quantity, reason="transfer_in",
     idempotency_key = "{idempotency_key}-{product_id}-in"    ← WAJIB unik per item+arah

SETELAH SEMUA item selesai tanpa error → COMMIT
```

**Kenapa idempotency_key per-item-per-arah:** kolom `idempotency_key` di `stock_ledger` itu UNIQUE. Kalau 1 request transfer punya 3 produk, itu artinya 6 baris ledger baru (3 out + 3 in) — masing-masing butuh key yang unik sendiri, makanya di-suffix `-{product_id}-out` / `-{product_id}-in`, bukan pakai idempotency_key mentah yang sama berulang.

## 3. Frontend

Halaman/modal baru "Transfer Stok" — HANYA muncul untuk role Owner (cek di sidebar dan page-level guard, sama pola seperti halaman Outlet).

Form:
- Dropdown **Outlet Asal**
- Dropdown **Outlet Tujuan** (opsi harus exclude outlet yang sama dengan Outlet Asal yang sudah dipilih)
- Search produk + input quantity (bisa multi-item, mirip pola Stock Adjustment Modal yang sudah ada — reuse komponennya kalau memungkinkan, jangan bikin dari nol)
- Tampilkan **stok tersedia saat ini** di outlet asal untuk tiap produk yang dipilih, biar Owner tau batas sebelum submit (bukan cuma tau setelah ditolak server)
- Submit → `POST /api/stocks/transfer`, refetch data stok setelah sukses

## 4. Reuse — Jangan Bikin Ulang

- Pola atomic `WHERE quantity >= ?` — sudah ada di `transaction_service.go` dan `stock_service.go` (adjustment)
- Komponen UI Stock Adjustment Modal — struktur mirip, tinggal adaptasi jadi 2 outlet
- `generateIdempotencyKey()` — sama seperti semua fitur lain

## 5. Urutan Kerja

1. **Langkah 1:** Backend — endpoint + service + repository, TANPA frontend dulu. Tes lewat Thunder Client dulu sebelum sentuh UI.
2. **Langkah 2:** Frontend — form transfer.
3. **Langkah 3:** Verifikasi manual end-to-end.
