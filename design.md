# DESIGN & UI/UX ARCHITECTURE — SELARAS (design.md)

## 0. IDENTITAS DESAIN: "LEDGER, BUKAN DASHBOARD GENERIK"

Selaras bukan POS generik. Inti produknya adalah **kepercayaan terhadap data** — kasir dan owner harus selalu tahu status sinkronisasi tiap transaksi. Bahasa visual Selaras dibangun dari dua hal:
1. **Warna yang fungsional**, bukan dekoratif — mengikuti status sync (pending/synced/conflict)
2. **Angka yang presisi** — tabular figures di semua tempat yang menampilkan uang/stok, supaya kolom angka tidak "loncat" saat data live update

DILARANG KERAS: **kombinasi** krem/gading + font DISPLAY SERIF + aksen terracotta/oranye sekaligus (pola AI-slop #1), atau dark mode dengan aksen neon tunggal tanpa fungsi (pola AI-slop #2). Catatan penting: warna dasar Selaras MEMANG warm/gading (lihat 2.1) — itu bukan pelanggaran, karena kita TIDAK memakai serif (tetap IBM Plex Sans/Mono) dan aksen utama TIDAK terracotta/oranye (kita pakai Ink Navy). Yang dilarang adalah kombinasi ketiganya sekaligus, bukan warna hangat itu sendiri. Setiap warna dan elemen visual di Selaras harus bisa dijawab "ini fungsinya apa" — kalau jawabannya cuma "biar cakep", pertimbangkan ulang.

## 1. ART DIRECTION & VIBE (ANTI-AI SLOP)
- **Aesthetic-Usability Effect:** Desain harus modern, bersih, minimalis, presisi — kesan "software finansial yang bisa dipercaya", bukan sekadar "cakep ala Apple".
- **Strictly No Slop:** DILARANG KERAS stiker, ilustrasi 3D murahan, gradasi warna pelangi tanpa makna, atau skeuomorphism berlebihan. Satu-satunya elemen "fisik" yang diizinkan adalah tepi bergerigi struk (lihat bagian 5) — itu pun hanya di komponen transaksi.
- **Whitespace is King:** Beri ruang napas antar elemen. Kepadatan hanya diizinkan di tabel data (stok, laporan) karena di situ kepadatan = fungsi (scan cepat).
- **Borders & Shadows:** Border halus (`border-border/50`), shadow sangat lembut (`shadow-sm`/`shadow-md` opacity rendah). BUKAN shadow tebal.

## 2. COLOR PALETTE — SISTEM WARNA FUNGSIONAL

Bukan "satu warna aksen elegan" seperti template pada umumnya — warna di Selaras punya makna status yang konsisten di seluruh aplikasi.

**Catatan revisi:** Palet direvisi dari dark-mode dingin ke light-mode hangat ("Warm Paper"). Alasan: kertas struk fisik itu bertekstur gading/hangat, bukan putih dingin kebiruan — jadi palet ini justru LEBIH nyambung ke identitas ledger/receipt Selaras dibanding versi awal. Supaya tetap gak jatuh ke klise "krem + serif + terracotta" yang kita hindari sejak awal, tipografi TETAP IBM Plex Sans/Mono (bukan serif), dan aksen utama sengaja dipilih Ink Navy — BUKAN oranye/terracotta — supaya gak bentrok hue dengan `sync-amber` di sistem status.

### 2.1 Base (Light Mode — WARM PAPER, default & utama)
| Token | Hex | Fungsi |
|---|---|---|
| `canvas` | `#FAF8F5` | Background utama — putih gading hangat, bukan krem tua, bukan putih dingin kebiruan |
| `ink` | `#292524` | Teks utama — charcoal hangat, bukan hitam pekat |
| `ink-muted` | `#78716C` | Teks sekunder, label, metadata — WAJIB dicek kontrasnya di background (minimal rasio 4.5:1 untuk teks kecil) |
| `ledger-navy` | `#1E3A5F` | Aksen utama — CTA, nav aktif, link. Formal & "dipercaya", jauh dari biru default Tailwind/shadcn (`#2563EB`) supaya gak terlihat template generik |
| `surface` | `#FFFFFF` | Background card/panel yang perlu dibedakan dari canvas (mis. modal, dropdown) |

Dark mode TIDAK jadi prioritas Fase 1 — fokus dulu bikin light mode ini benar-benar matang. Dark mode bisa ditambahkan belakangan sebagai fitur opsional, bukan default.

### 2.2 Status Sync (Signature System — WAJIB dipakai konsisten)
| Token | Hex | Dipakai untuk |
|---|---|---|
| `sync-amber` | `#D97706` | Transaksi/data pending sync, indikator offline |
| `sync-emerald` | `#059669` | Transaksi/data berhasil tersinkron |
| `conflict-red` | `#DC2626` | Konflik stok, error kritikal — HANYA untuk ini, jangan dipakai untuk delete button biasa dsb (biar maknanya tetap tajam) |

**Aturan penerapan:** ketiga warna status ini WAJIB muncul di: (a) pill indikator sync di topbar, (b) badge di setiap baris transaksi, (c) log audit sync. Konsistensi ini yang membuat Selaras terasa "dipikirkan", bukan skin warna acak di atas template CRUD.

## 3. TYPOGRAPHY

Bukan Inter + serif display seperti kebanyakan produk SaaS AI-generated. Pasangan font Selaras dipilih karena fungsinya untuk software finansial:

| Role | Font | Alasan |
|---|---|---|
| Heading & UI chrome | **IBM Plex Sans** (Medium/SemiBold) | Karakter lebih teknis-presisi dibanding Inter yang sudah jadi default di mana-mana; cocok nuansa software ledger |
| Body text | **IBM Plex Sans** (Regular) | Konsisten satu keluarga font dengan heading, mengurangi "noise" visual |
| **Semua angka (WAJIB)**: harga, stok, timestamp, SKU, ID transaksi | **IBM Plex Mono** | Tabular figures (lebar digit seragam) — angka tidak "loncat" posisi saat data live update dari sync. Ini keputusan fungsional, bukan gaya. |

Import via Google Fonts atau self-host: `IBM Plex Sans` (400, 500, 600) dan `IBM Plex Mono` (400, 500).

## 4. LAYOUT PRINSIP

- **Sync indicator PERMANEN di topbar** — bukan disembunyikan di menu atau notifikasi. Ini value proposition inti produk, jadi harus selalu terlihat: pill kecil menunjukkan `● Synced 2m ago` (emerald), `● 3 pending` (amber), atau `● Offline` (amber, dengan ikon).
- **Outlet switcher** di topbar untuk role Owner/Manager multi-outlet.
- **Sidebar navigasi** standar dengan CTA "Kasir" yang persisten dan menonjol (aksi paling sering dipakai).
- Struktur dasar:
```
┌─────────────────────────────────────────────┐
│ Selaras   Outlet: Cabang A ▾   [●Synced 2m]  │
├───────────┬─────────────────────────────────┤
│ Dashboard │                                 │
│ Transaksi │         Main Content            │
│ Produk    │                                 │
│ Stok      │                                 │
│ Laporan   │                                 │
├───────────┤                                 │
│  [Kasir]  │                                 │
└───────────┴─────────────────────────────────┘
```

## 5. SIGNATURE ELEMENT: KARTU TRANSAKSI TEPI STRUK

Elemen visual khas Selaras: kartu transaksi/receipt preview punya tepi atas bergerigi tipis (perforated edge, dibuat via CSS `mask` atau SVG, bukan gambar/sticker). Ini merepresentasikan struk kertas fisik tanpa jadi skeuomorphism norak.

**Batasan penting:** elemen ini HANYA dipakai di kartu transaksi dan preview struk. JANGAN dipakai di card lain (produk, laporan, dsb) — kalau dipakai di mana-mana, dia jadi dekorasi generik dan kehilangan makna sebagai signature element.

## 6. FLUIDITY & ANIMATIONS (FRAMER MOTION)
- **Page Transitions:** fade-in lembut (`opacity: 0` ke `1`).
- **Micro-interactions:** hover & tap/active di semua tombol/link (`scale: 0.98` atau perubahan `bg` halus).
- **Sync status transition:** saat status berubah (pending → synced), gunakan transisi warna halus pada badge, BUKAN animasi mencolok — perubahan status terjadi sering, jadi harus tenang, bukan "merayakan" tiap sync.
- **State Changes:** DILARANG layout shift. Gunakan `AnimatePresence` untuk elemen muncul/hilang.

## 7. COMPONENT ANATOMY & LOADING STATES
- **No God Components:** Pecah UI besar jadi komponen kecil di `/components`.
- **Skeleton First:** Skeleton loader animasi *pulse* yang merepresentasikan bentuk konten asli — untuk tabel stok, skeleton harus berbentuk baris tabel, bukan blok generik.
- **Error States:** Toast (Sonner) untuk error/sukses. Untuk konflik sync, gunakan warna `conflict-red` dan bahasa yang jelas ("Stok tidak cocok, perlu ditinjau" bukan "Error 409").

## 8. ICON SYSTEM

Gunakan **Lucide Icons** sebagai basis utama (konsisten stroke 2px, 24x24). Icon yang tersedia dan relevan: `receipt`, `store`, `wifi-off`, `refresh-cw` (sync), `package`, `alert-triangle` (konflik), `check-circle` (synced).

**Catatan penting — kemungkinan gap icon:** Lucide belum tentu punya icon yang pas untuk konsep spesifik seperti "outlet dengan banyak cabang terhubung" atau "delta stok (+/-)". Kalau nanti dibutuhkan icon semacam ini dan tidak ada versi bawaan yang cocok, saya akan flag ke kamu supaya kita bikin custom SVG kecil yang tetap konsisten dengan gaya stroke 2px Lucide — bukan comot icon dari sumber lain yang gaya garisnya beda (ini salah satu tanda AI-slop yang sering luput: campuran gaya icon dari berbagai library).

## 9. ACCESSIBILITY (A11Y) & SEMANTICS
- **Semantic HTML:** `<article>`, `<section>`, `<nav>`, `<main>`, `<header>` alih-alih `<div>` semua.
- **Aria Labels:** Semua tombol icon/elemen interaktif wajib `aria-label`.
- **Status sync tidak boleh hanya warna:** Karena status pakai warna (amber/emerald/red), WAJIB disertai ikon + teks juga untuk pengguna dengan gangguan penglihatan warna — jangan cuma titik warna polos.
