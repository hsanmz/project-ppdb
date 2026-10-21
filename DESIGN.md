# Design System & Visual Identity — Ar-Rahman

> **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**
> Dokumen Panduan Desain Antarmuka (UI/UX), Sistem Desain Visual, Token Desain, Tipografi, Komponen, dan Standar Estetika.
> *Catatan: Dokumen ini berfokus pada Visual & UX Design. Untuk arsitektur teknis dan infrastruktur sistem, rujuk ke [README.md](README.md).*

---

## 📑 Daftar Isi

1. [Filosofi Desain](#1-filosofi-desain)
2. [Palet Warna & Token Desain (Color Tokens)](#2-palet-warna--token-desain-color-tokens)
3. [Sistem Tipografi (Typography)](#3-sistem-tipografi-typography)
4. [Elevasi, Bayangan & Glassmorphism](#4-elevasi-bayangan--glassmorphism)
5. [Gerak & Transisi (Motion & Animation)](#5-gerak--transisi-motion--animation)
6. [Geometri, Grid & Tata Letak Responsif](#6-geometri-grid--tata-letak-responsif)
7. [Arsitektur Komponen Bersama (@repo/ui)](#7-arsitektur-komponen-bersama-repoui)
8. [Pola Form & Interaksi Pengguna (UX Patterns)](#8-pola-form--interaksi-pengguna-ux-patterns)
9. [Standar Desain Dokumen Cetak A4](#9-standar-desain-dokumen-cetak-a4)
10. [Aturan Wajib Desain & Aksesibilitas](#10-aturan-wajib-desain--aksesibilitas)

---

## 1. Filosofi Desain

Identitas visual Pesantren Tahfidz Qur'an dan Digital Ar-Rahman memadukan dua nilai luhur yang saling melengkapi:

```
      🌿 Spiritual & Tradisi Islam        ⚡ Modernitas Digital & Presisi
      (Keagungan, Keikhlasan, Ketenangan)  (Efisiensi, Ketegasan, Aksesibilitas)
                            \                    /
                             \                  /
                              ▼                ▼
                     [ IDENTITAS VISUAL AR-RAHMAN ]
```

- **Keagungan & Ketenangan (Islamic Serenity):** Aksen Hijau Zamrud (*Islamic Emerald*) dan Emas Kemuliaan (*Regal Gold*) di atas latar belakang Gading Alami (*Warm Ivory*), memberikan atmosfer tenang, terpercaya, dan bersahaja.
- **Ketegasan Digital (Digital Precision):** Garis tepi halus, tipografi jernih berkecepatan tinggi, feedback interaktif instan, micro-interactions elegan, serta keselarasan modular antarmuka web modern.
- **Kejelasan Tanpa Beban Kognitif:** Informasi penting (tahapan pendaftar, tagihan, jadwal seleksi) disajikan secara hierarkis tanpa distorsi atau dekorasi berlebihan.

---

## 2. Palet Warna & Token Desain (Color Tokens)

Sistem menggunakan token warna semantik yang didefinisikan pada konfigurasi Tailwind CSS (`apps/ppdb/tailwind.config.js`, `apps/superadmin/tailwind.config.js`, dan `packages/ui`):

### 2.1. Warna Inti (Core Palette)

| Token Semantik | Nilai Heksadesimal | Peran & Penggunaan |
|---|---|---|
| `ivory` | `#F7F5F0` | Latar belakang kanvas utama aplikasi (memberikan kesan hangat ramah di mata) |
| `elevated` | `#FFFFFF` | Permukaan kartu, modal dialog, panel popup, dan kontainer formulir |
| `obsidian` | `#1A1A1A` | Teks judul utama, elemen foreground berbobot tinggi, kontras tajam |
| `slate` (DEFAULT) | `#6B6B6B` | Teks pendukung, label input sekunder, deskripsi bantuan |
| `slate.light` | `#949494` | Placeholder input, ikon non-aktif, batas divider halus |
| `slate.dark` | `#4A4A4A` | Teks badan (body text) paragraf panjang |

### 2.2. Aksen Karakter Institusi

| Token Semantik | Nilai / Nilai Alfa | Karakter & Penggunaan |
|---|---|---|
| `emerald.primary` | `#1A6B47` | Identitas utama institusi — tombol aksi primer (CTA), badge resmi, navbar header |
| `emerald.bright` | `#22C55E` | Indikator status sukses, verifikasi valid, kuota aman |
| `emerald.dark` | `#135235` | Status hover/active tombol primary, header tabel |
| `emerald.light` | `#E8F5EE` | Latar belakang badge sukses, highlight baris aktif |
| `emerald.glow` | `rgba(34, 197, 94, 0.25)` | Cahaya aksen (glow) pada kartu aktif dan tombol fokus |
| `gold.accent` | `#D4A853` | Aksen kemuliaan tahfidz — ornamen prestasi, bintang, highlight jalur tahfidz |
| `gold.light` | `#F0C878` | Hover aksen emas, piala/medali penghargaan |
| `gold.dark` | `#B88F3D` | Teks aksen emas di atas permukaan terang |
| `gold.bg` | `#FEFAEE` | Latar belakang kartu informasi istimewa / kupon diskon formulir |
| `gold.glow` | `rgba(212, 168, 83, 0.25)` | Glow aura penghargaan / badge LoA resmi |
| `telegram.blue` | `#2AABEE` | Tautan WhatsApp / Telegram grup, notifikasi pesan, tautan eksternal |
| `rose.danger` | `#FF3B30` | Peringatan kritis, error validasi, tagihan kadaluwarsa, tombol destruktif |
| `rose.light` | `#FFEEEE` | Latar peringatan error, penolakan dokumen |

### 2.3. Pemetaan Variabel CSS HSL (Theme Root)

Ditetapkan di `:root` (`index.css`):

```css
:root {
  --background: 43 30% 95%;       /* #F7F5F0 Warm Ivory */
  --foreground: 0 0% 10%;         /* #1A1A1A Obsidian */
  --card: 0 0% 100%;              /* #FFFFFF Pure White */
  --card-foreground: 0 0% 10%;
  --primary: 153 61% 26%;         /* #1A6B47 Islamic Emerald Primary */
  --primary-foreground: 0 0% 100%;
  --secondary: 43 20% 92%;
  --secondary-foreground: 0 0% 10%;
  --muted: 43 20% 92%;
  --muted-foreground: 0 0% 42%;
  --accent: 40 60% 58%;           /* #D4A853 Regal Gold */
  --accent-foreground: 0 0% 10%;
  --destructive: 3 100% 59%;      /* #FF3B30 Rose Red */
  --destructive-foreground: 0 0% 100%;
  --border: 43 14% 88%;
  --input: 43 14% 88%;
  --ring: 153 61% 26%;
  --radius: 0.75rem;              /* 12px standar sudut melengkung */
}
```

---

## 3. Sistem Tipografi (Typography)

Tipografi disusun berjenjang dengan pemisahan peran yang tegas antara branding, konten teks, dan data angka/kode:

```
[ Playfair Display / Georgia ]  ──► Brand Hero & Judul Utama Institusi
[ Inter / DM Sans ]            ──► Antarmuka, Tombol, Form, Label & Teks Konten
[ Amiri ]                      ──► Ayat Suci Al-Qur'an & Frasa Arab Kaligrafi
[ Inter Monospace ]            ──► Nomor Registrasi (REG-...), Kode Invoice, HMAC Hash
```

### 3.1. Rincian Font Family

| Nama Token | Font Primer & Cadangan | Peruntukan Khusus |
|---|---|---|
| `font-brand` | `'Playfair Display', Georgia, serif` | Judul hero utama, branding nama yayasan di landing page |
| `font-heading` | `'Inter', 'DM Sans', sans-serif` | H1–H4 judul bagian halaman, judul kartu, modal header |
| `font-sans` / `font-body` | `'Inter', system-ui, sans-serif` | Paragraf teks, teks input form, deskripsi tahapan |
| `font-arabic` | `'Amiri', serif` | Ayat Al-Qur'an, lafadz doa, terjemahan resmi tahfidz |
| `font-mono` / `font-numbers` | `'Inter', monospace` | Angka nominal rupiah, kode invoice, tanggal ISO, ID registrasi |

### 3.2. Skala Hierarki Tipografi

| Level | Ukuran (Desktop) | Ukuran (Mobile) | Line Height | Weight | Penggunaan |
|---|---|---|---|---|---|
| **Display Hero** | `2.75rem (44px)` | `2rem (32px)` | `1.15` | Bold (700) | Judul utama landing page |
| **Heading 1 (H1)** | `2rem (32px)` | `1.5rem (24px)` | `1.25` | Semibold (600) | Judul halaman portal & backoffice |
| **Heading 2 (H2)** | `1.5rem (24px)` | `1.25rem (20px)` | `1.3` | Semibold (600) | Judul seksi wizard registrasi |
| **Heading 3 (H3)** | `1.125rem (18px)` | `1rem (16px)` | `1.4` | Medium (500) | Sub-seksi kartu, modal title |
| **Body (P)** | `0.9375rem (15px)` | `0.875rem (14px)` | `1.6` | Regular (400) | Teks penjelasan, petunjuk form |
| **Caption / Help** | `0.8125rem (13px)` | `0.75rem (12px)` | `1.4` | Regular (400) | Bantuan input, status footer |
| **Badge / Label** | `0.75rem (12px)` | `0.6875rem (11px)` | `1` | Semibold (600) | Status pill, tag kuota, jalur |

---

## 4. Elevasi, Bayangan & Glassmorphism

Untuk membedakan lapisan informasi secara visual di atas kanvas `ivory`, sistem menerapkan standar efek kedalaman:

### 4.1. Token Bayangan (Box Shadow)

```css
boxShadow: {
  /* Efek kaca lembut untuk kartu mengambang */
  'glass': '0 8px 32px rgba(26, 107, 71, 0.06)',

  /* Efek elevasi aktif saat kartu disentuh/dilewati kursor */
  'glass-hover': '0 12px 40px rgba(26, 107, 71, 0.12)',

  /* Aura hijau zamrud untuk elemen sukses / tombol primer */
  'glow-emerald': '0 0 20px rgba(34, 197, 94, 0.35)',

  /* Aura emas untuk penghargaan, nomor registrasi SKD, badge lolos */
  'glow-gold': '0 0 20px rgba(212, 168, 83, 0.35)',
}
```

### 4.2. Glassmorphism & Transparansi

- **Floating Navbar (Pill Mode):** Menggunakan latar `rgba(255, 255, 255, 0.85)` berpadu dengan `backdrop-blur-md` (12px) dan `border: 1px solid rgba(26, 107, 71, 0.08)`.
- **Modal Backdrops:** Latar hitam lembut `rgba(26, 26, 26, 0.45)` berpadu dengan `backdrop-blur-xs` (2px).
- **Sticky Form Footers:** Latar `rgba(247, 245, 240, 0.92)` berpadu dengan `backdrop-blur-md` untuk menjaga keterbacaan tombol navigasi pendaftaran di perangkat mobile.

---

## 5. Gerak & Transisi (Motion & Animation)

Gerakan dalam sistem dirancang untuk memberikan umpan balik taktil tanpa mengorbankan performa perangkat.

### 5.1. Kurva Easing Kustom (Brand Bezier)

```css
/* Transisi mulus khas pill navbar dan modal Ar-Rahman */
.ease-brand-pill {
  transition-duration: 400ms;
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### 5.2. Keyframe Animations

| Nama Animasi | Durasi & Kurva | Perilaku & Penggunaan |
|---|---|---|
| `slide-up` | `0.35s cubic-bezier(0.32, 0.72, 0, 1)` | Elemen meluncur halus dari bawah (modal masuk, toast muncul) |
| `slide-down` | `0.3s ease-out` | Notifikasi bilah atas (banner alert) turun dari atas |
| `scale-in` | `0.25s cubic-bezier(0.34, 1.56, 0.64, 1)` | Dialog konfirmasi atau popover membesar membal halus |
| `fade-in` | `0.2s ease-out` | Pergantian tab, pembaruan data tabel, pergantian step wizard |
| `pulse-subtle` | `3s cubic-bezier(0.4, 0, 0.6, 1) infinite` | Indikator live status bot WhatsApp atau timer sisa ujian |

---

## 6. Geometri, Grid & Tata Letak Responsif

### 6.1. Acuan Geometri Hero & Kontainer

```css
:root {
  /* Kolom simetris konten utama (896px di desktop) */
  --hero-col-width: min(56rem, 92vw);

  /* Titik tengah luar kolom untuk penempatan ornamen simetris */
  --hero-edge: calc(var(--hero-col-width) / 2);
}
```

### 6.2. Breakpoint Responsif

| Token Breakpoint | Lebar Minimum | Target Perangkat Utama |
|---|---|---|
| `xs` | `425px` | Smartphone modern (iPhone Pro Max, Samsung Galaxy Plus) |
| `sm` | `640px` | Phablet & Smartphone lanskap |
| `md` | `768px` | Tablet portrait, iPad mini |
| `lg` | `1024px` | Laptop 13-14", iPad Pro lanskap |
| `xl` | `1280px` | Desktop monitor standar |
| `2xl` | `1536px` | Monitor lebar (ultrawide / iMac) |

---

## 7. Arsitektur Komponen Bersama (@repo/ui)

Komponen UI bersama diisolasi dalam paket `packages/ui` dan diekspor ke aplikasi frontend:

```
packages/ui/src/
├── components/
│   ├── ui/                       # Primitif berbasis Radix UI
│   │   ├── button.tsx            # Button varian: default, emerald, gold, outline, ghost, destructive
│   │   ├── input.tsx             # Input text, email, number dengan focus ring zamrud
│   │   ├── dropdown-menu.tsx     # Menu aksi pengguna & selector
│   │   ├── dialog.tsx            # Modal universal
│   │   └── badge.tsx             # Status tag pendaftar & keuangan
│   └── dashboard/                # Struktur shell dashboard terpadu
│       ├── brand-mark.tsx        # Logo dinamis + nama institusi
│       ├── dashboard-header.tsx  # Topbar, search trigger, status bot
│       ├── dashboard-sidebar.tsx # Navigasi hirarkis dengan badge izin
│       ├── dashboard-shell.tsx   # Pembungkus responsif layar penuh
│       └── semantic-search/      # Dialog pencarian cerdas (Ctrl+K)
├── hooks/
│   ├── useBrand.ts               # Hook data branding dinamis dari backend
│   └── useMediaQuery.ts          # Deteksi ukuran layar responsif
└── profile/                      # Manajemen profil santri/admin & sesi aktif multi-perangkat
```

### 7.1. Spesifikasi Tombol (Button Specs)

- **Ukuran Tinggi Baku:**
  - `sm`: 32px (font 12px, padding horizontal 12px)
  - `default`: 40px (font 14px, padding horizontal 16px)
  - `lg`: 48px (font 16px, padding horizontal 24px)
- **Radius Sudut:** Menggunakan `var(--radius)` (12px standar).
- **Target Sentuh Mobile:** Minimal 44×44px untuk kenyamanan sentuhan jari tanpa salah tekan (*fat-finger tolerance*).

---

## 8. Pola Form & Interaksi Pengguna (UX Patterns)

### 8.1. Wizard Registrasi 7 Bagian

Formulir pendaftaran dirancang dengan pendekatan *progressive disclosure*:

```
[1. Pilih Jalur] ─► [2. Data Santri] ─► [3. Orang Tua/Wali] ─► [4. Kontak]
                                                                     │
[7. Pernyataan] ◄─ [6. Kuesioner Kesehatan] ◄─ [5. Domisili] ◄───────┘
```

- **Pilihan Jalur Bersih:** Nama jalur pendaftaran ditampilkan apa adanya tanpa embel-embel teknis seperti `(Non-TIU)` atau `(Tes TIU)`.
- **Kelengkapan Orang Tua/Wali:** Formulir mewajibkan data Ayah dan Ibu secara terpisah (Nama, Pekerjaan, Nomor WhatsApp) serta opsional Wali. Data ini **tidak boleh disingkat** menjadi satu baris `parent_name` di antarmuka mana pun.
- **Kuesioner Kesehatan Kondisional (10 Soal Baku):**
  - Pertanyaan Ya/Tidak hanya membuka kolom isian keterangan lanjutan jika pengguna memilih "Ya".
  - Jika pengguna memilih "Tidak", kolom keterangan otomatis dikosongkan dan tidak dikirimkan.
  - Data kesehatan diperlakukan sebagai informasi sensitif (tampilan di backoffice dilindungi izin khusus dan dicatat dalam audit log).

### 8.2. Kunci Formulir Pasca-LoA (`is_locked`)

- Setelah santri dinyatakan lulus dan menandatangani LoA resmi, sistem mengaktifkan status visual `is_locked = true`.
- Semua field formulir dan kuesioner kesehatan berubah menjadi mode baca (*read-only preview*) dengan badge penguncian emas bertuliskan: *"Data pendaftaran telah dikunci secara resmi pasca penerbitan LoA"*.

---

## 9. Standar Desain Dokumen Cetak A4

Semua dokumen resmi lembaga (`apps/ppdb/src/utils/export*`) dicetak dengan rasio kertas ISO A4 baku melalui iframe print browser:

| Komponen Dokumen | Standar Tampilan |
|---|---|
| **Kop Surat (Letterhead)** | Logo resolusi tinggi di sebelah kiri, nama resmi yayasan berhuruf kapital tegas, alamat lengkap, kontak resmi, dan garis pemisah ganda emas-zamrud |
| **Nomor Registrasi Resmi** | Format `REG-{YYYYMMDD}-{XXXX}` dengan font monospace tebal dan kontras tinggi |
| **Kuitansi Pembayaran** | Memuat segel digital, stempel cap panitia, rincian nominal terbilang, dan **Kode QR bertoken HMAC** |
| **Letter of Acceptance (LoA)** | Memuat klausul pembatalan non-refundable, tabel rincian biaya, serta **dua kotak tanda tangan berdampingan** (Wali Santri & Panitia PPDB) |
| **Surat Keterangan Diterima (SKD)** | Diterbitkan eksklusif pasca-pelunasan DP dengan latar belakang watermark stempel orisinal pesantren |

---

## 10. Aturan Wajib Desain & Aksesibilitas

1. **Dynamic Branding Mandat:** Seluruh aset logo, favicon, dan identitas teks institusi wajib diambil dinamis melalui API backend (`settingsService.getLogo()` atau hook `useBrand()`). **Dilarang keras melakukan hardcode path statis logo** di kode frontend.
2. **Bebas Jenjang Pendidikan:** Desain antarmuka sama sekali tidak boleh menampilkan dropdown, input, atau badge pilihan jenjang (`SMP`, `SMK`, dll.). Sistem bersifat independen dari jenjang.
3. **Kontras Warna Aksesibilitas (WCAG AA):** Teks gelap di atas latar `ivory` wajib memiliki rasio kontras minimal `4.5:1` untuk teks normal dan `3:1` untuk teks besar.
4. **Indikator Fokus Keyboard:** Seluruh kontrol input interaktif wajib memiliki focus ring zamrud: `focus-visible:ring-2 focus-visible:ring-emerald-primary focus-visible:ring-offset-2`.
5. **Pagination Sisi Server:** Setiap tabel data administratif wajib menyertakan kontrol paginasi; dilarang menampilkan data tak terhingga (*infinite vertical dumping*) pada layar operasional.
6. **Perbedaan dengan Arsitektur Sistem:** Dokumen `DESIGN.md` ini mengatur **ekspresi visual dan interaksi manusia**. Detail database, protokol jaringan, enkripsi, dan container dikelola di [README.md](README.md).

---

<div align="center">
  <i>Pedoman Desain Resmi — Pesantren Tahfidz Qur'an dan Digital Ar-Rahman</i>
</div>
