# PRINT STRUK — SPESIFIKASI TEKNIS

## 0. Masalah yang Perlu Diselesaikan Dulu: Sumber Harga di Struk

Prinsip dari Fase 1: `unit_price` TIDAK dikirim/disimpan dari client saat transaksi (harga selalu di-lookup ulang di server, mencegah manipulasi harga). Tapi struk butuh nampilin harga per item.

**Solusi:** Struk BUKAN dokumen otoritatif soal harga — dia cuma representasi informasional buat pelanggan, dicetak SEGERA setelah kasir klik Bayar (sebelum tentu sempat sync ke server kalau lagi offline). Sumber harga untuk struk adalah **cart snapshot** yang SUDAH ADA di `handlePay` (dari PHASE2_SPEC.md Langkah 3, poin "Snapshot cart items, total, method — biar aman setelah clearCart"). Cart snapshot itu pakai harga dari `product-store` (katalog produk yang sudah di-cache), BUKAN dari input manual kasir — jadi tetap aman dari manipulasi, cuma sumbernya beda dari `transaction_service` di backend. TIDAK ADA perubahan ke alur transaksi/backend untuk fitur ini.

## 1. Kapan Struk Muncul

Setelah `handlePay` sukses nulis ke Dexie (langkah 3 di PHASE2_SPEC.md, SEBELUM tau hasil sync), tampilkan modal/preview struk otomatis — SELARAS dengan prinsip "konfirmasi instan tanpa nunggu network" yang sudah jadi fondasi Fase 2.

## 2. Isi Struk (dari Cart Snapshot + Data Lain yang Sudah Ada)

```
[Nama Outlet]
[Alamat outlet, kalau ada]
----------------------------
Tanggal: [formatDateTime dari created_at_client]
Kasir: [user.username dari auth-store]
No. Ref: [8 karakter pertama dari idempotency_key]
----------------------------
[Nama Produk 1]
  2 x Rp 25.000          Rp 50.000
[Nama Produk 2]
  1 x Rp 10.000          Rp 10.000
----------------------------
TOTAL                    Rp 60.000
Metode: [Tunai/QRIS/Kartu]
----------------------------
Terima kasih atas kunjungan Anda
```

## 3. Implementasi Teknis

- Install `react-to-print` (library standar buat print React component)
- Buat komponen baru `components/kasir/receipt.tsx` — terima props dari cart snapshot, render struk sesuai format di atas
- Pakai `useReactToPrint` hook dengan `componentRef` mengarah ke `receipt.tsx`
- CSS print: `@page { size: 80mm auto; margin: 4mm; }` — ukuran standar kertas thermal receipt
- **Force hitam-putih di mode print**, TIDAK PEDULI tema warm-paper aplikasi — printer thermal cetak monokrom, jadi semua teks `color: black`, background transparent, abaikan token warna Selaras di context print ini SPESIFIK
- Angka (harga, quantity, total) tetap pakai **IBM Plex Mono** — alasan sama seperti di layar (kolom rapi)
- Font non-angka (nama outlet, nama produk) boleh sans-serif biasa, gak perlu monospace

## 4. UI Trigger

Setelah transaksi sukses (toast "Transaksi berhasil"), tampilkan modal kecil berisi 2 tombol: **"Cetak Struk"** dan **"Lewati"**. Modal ini TIDAK menghalangi kasir lanjut transaksi berikutnya — cuma opsional.

## 5. Yang TIDAK Berubah

- Alur `handlePay`, Dexie schema, sync engine — NOL perubahan
- Backend — NOL perubahan
- Ini murni fitur presentasi tambahan di atas data yang sudah ada
