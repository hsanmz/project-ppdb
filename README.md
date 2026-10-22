<div align="center">
  <img src="https://res.cloudinary.com/dunynusuh/image/upload/v1755771459/Logo-Ar-Rahman_fm4mgg.png" alt="Ar-Rahman Logo" width="120" />
  <h1>Sistem PPDB dan Company Profile PTDARRAHMAN</h1>
  <p><strong>Company Profile & Portal Terpadu PPDB (Penerimaan Peserta Didik Baru)</strong></p>

  [![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)
  [![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
  [![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
  [![Python](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![TypeScript](https://img.shields.io/badge/React_Vite-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://vitejs.dev/)

</div>

---

Selamat datang di monorepo Sistem Terpadu **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**. Repository ini menaungi seluruh ekosistem digital institusi — mulai dari website publik (Company Profile), portal seleksi mandiri santri, backoffice PPDB, hingga panel superadmin dan layanan notifikasi WhatsApp.

---

## 📑 Daftar Isi

1. [Arsitektur Monorepo](#-arsitektur-monorepo)
2. [Tech Stack per Aplikasi](#-tech-stack-per-aplikasi)
3. [System Design](#-system-design)
   - [Diagram Arsitektur Sistem](#1-diagram-arsitektur-sistem)
   - [Infrastruktur Docker & Resource Limits](#2-infrastruktur-docker--resource-limits)
   - [Autentikasi, Sesi & RBAC Detail](#3-autentikasi-sesi--rbac-detail)
   - [Pipeline 10 Tahap Calon Santri](#4-pipeline-10-tahap-calon-santri)
   - [Arsitektur Pembayaran Pakasir API v2](#5-arsitektur-pembayaran-pakasir-api-v2)
   - [Arsitektur Safe Exam Browser (SEB) & TIU](#6-arsitektur-safe-exam-browser-seb--tiu)
   - [Arsitektur WhatsApp Microservice & BullMQ](#7-arsitektur-whatsapp-microservice--bullmq)
   - [Arsitektur Database & Domain Models](#8-arsitektur-database--domain-models)
   - [Aturan Bisnis Kritis (Business Invariants)](#9-aturan-bisnis-kritis-business-invariants)
   - [Integrasi Eksternal](#10-integrasi-eksternal)
4. [Dokumen Resmi & Ekspor Cetak](#-dokumen-resmi--ekspor-cetak)
5. [Rute Verifikasi Publik (Tanpa Login)](#-rute-verifikasi-publik-tanpa-login)
6. [UI/UX Design System](#-uiux-design-system)
7. [Referensi Dokumen](#-referensi-dokumen)
8. [Quick Start](#-quick-start)

---

## 🏗️ Arsitektur Monorepo

Project ini menggunakan arsitektur modular **pnpm workspace** yang diorkestrasi oleh **Turborepo**. Masing-masing aplikasi saling terisolasi namun terhubung melalui Core API pusat dan jaringan internal Docker.

| Aplikasi | Path | Tech Stack | Peran |
|---|---|---|---|
| 🎓 **PPDB** | [`apps/ppdb`](apps/ppdb/README.md) | React 19, Vite 8, TypeScript | Portal santri (10 tahap) + Backoffice PPDB |
| 🛡️ **Superadmin** | [`apps/superadmin`](apps/superadmin/README.md) | React 19, Vite 8, TypeScript | Panel manajemen platform & RBAC |
| 🌐 **Company Profile** | [`apps/companyprofile`](apps/companyprofile/README.md) | Next.js 16, Tailwind v4 | Website publik & portal login terpusat |
| ⚙️ **Core API** | [`apps/api`](apps/api/README.md) | FastAPI, Python 3.12, MySQL, Redis | Backend REST API monolithic |
| 📱 **WA Gateway** | [`apps/whatsapp`](apps/whatsapp/README.md) | Node.js, BullMQ, Express | Service notifikasi WhatsApp mandiri |
| 🧩 **Shared UI** | `packages/ui` | React, TypeScript | Komponen UI bersama (profile, session, dll.) |
| 🔧 **TS Config** | `packages/typescript-config` | TypeScript | Konfigurasi TypeScript terpusat |

> **Catatan:** `apps/whatsapp` adalah service mandiri berbasis Node.js — **bukan** bagian dari pnpm workspace. Dikelola dan di-build secara independen.

---

## 🛠️ Tech Stack per Aplikasi

### 🎓 apps/ppdb — Portal Santri & Backoffice
| Kategori | Teknologi |
|---|---|
| Framework | React 19 + Vite 8 |
| Bahasa | TypeScript |
| State/Data | TanStack Query v5, Zustand |
| Routing | React Router v7 |
| UI | Tailwind CSS v4, Radix UI |
| PDF/Print | Print engine kustom A4 (`utils/export*`) |
| Auth | HTTP-only Cookie JWT (via Core API) |

**Fitur Portal Santri:** Wizard registrasi 7 bagian → pembayaran QRIS → upload dokumen → ujian TIU via SEB → booking Tahfidz & Wawancara → LoA digital → DP + cicilan → SKD + WA Group → profil mandiri.

**Fitur Backoffice:** Manajemen gelombang, verifikasi dokumen, input nilai rubrik, monitoring keuangan & cicilan, cetak dokumen resmi, arsip dossier ZIP.

### 🛡️ apps/superadmin — Panel Superadmin
| Kategori | Teknologi |
|---|---|
| Framework | React 19 + Vite 8 |
| Bahasa | TypeScript |
| Pencarian | Semantic search `Ctrl+K` |
| Auth | HTTP-only Cookie JWT (via Core API) |

**Fitur:** Manajemen akun staf/admin, matriks RBAC per modul, audit trail log aktivitas, broadcast notifikasi, monitoring bot WhatsApp, pemantauan sesi login aktif multi-perangkat.

### 🌐 apps/companyprofile — Website Publik
| Kategori | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 |
| 3D | Three.js (Hero Globe) |
| CMS | Admin panel internal |

**Fitur:** Website publik pesantren, program pendidikan, berita, fasilitas, galeri, hero 3D interaktif, portal login terpusat untuk semua role.

### ⚙️ apps/api — Core API Backend
| Kategori | Teknologi |
|---|---|
| Framework | FastAPI (Python 3.12) |
| ORM | SQLAlchemy 2.0 + Alembic |
| Database | MySQL 8 |
| Cache/Queue | Redis 7 |
| Auth | JWT (HTTP-only Cookie), RBAC |
| Payment | Pakasir API v2 |
| Storage | Cloudinary |
| Scheduler | APScheduler (cicilan reminder) |

**Fitur:** REST API monolithic, autentikasi & otorisasi, payment gateway QRIS, webhook TIU & payment, pencarian global, generator dokumen resmi.

### 📱 apps/whatsapp — WA Gateway
| Kategori | Teknologi |
|---|---|
| Runtime | Node.js |
| Queue | BullMQ + Redis |
| WA Client | whatsapp-web.js + Chromium |

**Fitur:** Penerima task dari Core API via Redis queue, pengirim notifikasi otomatis (pembayaran, cicilan reminder, grup WA), standalone service.

---

## 🔬 System Design

> **Arsitektur Sistem Teknis & Alur Operasional Monorepo PPDB Ar-Rahman**
> Bagian ini memuat rancangan sistem teknis menyeluruh (System Design) dari ekosistem digital Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Untuk panduan antarmuka visual, palet warna, tipografi, dan komponen UI, rujuk ke [DESIGN.md](DESIGN.md).

---

### 1. Diagram Arsitektur Sistem

Ekosistem mengadopsi pola arsitektur **Monolith Berorientasi Layanan (Service-Oriented Modular Monolith)** dengan microservice mandiri untuk otomatisasi WhatsApp:

```
[ Klien Pengguna ]
  │  (Desktop, Smartphone, Safe Exam Browser)
  ▼
[ Nginx Reverse Proxy / Port Publik :80, :443 ]
  │
  ├──► :3000 ──► container: companyprofile (Next.js 16 SSR / App Router)
  │
  ├──► :5173 ──► container: ppdb          (React 19 SPA, Vite preview / Nginx static)
  │
  ├──► :5174 ──► container: superadmin    (React 19 SPA, Vite preview / Nginx static)
  │
  └──► :8080 ──► container: api           (FastAPI / Uvicorn Python 3.12)
          (Host :8000)   │
                         ├──► MySQL 8 Database (Relational Store & ACID Transactions)
                         │
                         ├──► Redis 7 In-Memory Broker
                         │     ├── DB 0: JWT Session Store & Rate Limiter
                         │     ├── DB 1: BullMQ Job Queue (Notifikasi WhatsApp)
                         │     └── DB 2: Shared Application Cache
                         │
                         └──► :3100 (Internal Only) ──► container: whatsapp
                                                          ├── BullMQ Worker (Node.js)
                                                          └── Chromium (whatsapp-web.js)
```

**Alur Akses Jaringan:**
- Port publik frontend (`:3000`, `:5173`, `:5174`) dan API (`:8080` di Docker / `:8000` di Dev Host) dapat diakses klien.
- Port microservice WhatsApp (`:3100`) **hanya dapat diakses melalui jaringan internal Docker (`127.0.0.1:3100` / bridge network)**, terisolasi dari akses publik luar.

---

### 2. Infrastruktur Docker & Resource Limits

Semua layanan diorkestrasi via Docker Compose (`docker-compose.yml` untuk dev/staging, `docker-compose.prod.yml` untuk VPS production) dengan alokasi batas memori eksplisit:

| Container | Image / Base | Port Internal | Port Host | `mem_limit` | Peran Utama |
|---|---|---|---|---|---|
| `companyprofile` | Node.js 20-alpine (Next.js) | 3000 | 3000 | 512 MB | Website publik & portal login terpusat |
| `ppdb` | Node.js 20-alpine (Vite preview) | 5173 | 5173 | 512 MB | Portal santri 10 tahap & Backoffice PPDB |
| `superadmin` | Node.js 20-alpine (Vite preview) | 5174 | 5174 | 512 MB | Panel kendali Superadmin & RBAC |
| `api` | Python 3.12-slim (FastAPI) | 8000 | 8080 (dev: 8000) | 512 MB | Backend REST API monolithic |
| `whatsapp` | Node.js 20 + Chromium | 3100 | 127.0.0.1:3100 | 768 MB (`shm_size: 256MB`) | WhatsApp Gateway via BullMQ consumer |
| `redis` | Redis 7-alpine | 6379 | internal | 256 MB (`maxmemory: 192MB`) | Cache, JWT Session, & Message Queue |
| `mysql` | MySQL 8.0 | 3306 | internal / cloud | Remote / Dedicated | Penyimpanan data relasional utama |

#### Named Volumes & Persistensi Data:
- `uploads_data`: Menyimpan berkas unggahan pendaftar (dokumen persyaratan, bukti pembayaran, dsb.)
- `redis_data`: Persistensi snapshot disk data antrian Redis
- `wa_session`: Direktori sesi otentikasi Chromium WhatsApp Web agar tidak perlu re-scan QR setiap restart
- `wa_logs`: Berkas log aktivitas pengiriman pesan WhatsApp

#### Health Check & Dependency Chain:
```
redis (healthy) ──► api (healthy) ──► frontend (companyprofile, ppdb, superadmin)
                                 └──► whatsapp (healthy)
```

---

### 3. Autentikasi, Sesi & RBAC Detail

#### Mekanisme Token Cookie HTTP-Only
Aplikasi mengabaikan penyimpanan token di `localStorage` demi perlindungan terhadap serangan Cross-Site Scripting (XSS).

```
[ Klien Browser ]                                    [ Core API ]
        │                                                  │
        │─── POST /companyprofile/auth/login ─────────────►│
        │    (username/email, password)                    │ (Validasi bcrypt hash)
        │                                                  │
        │◄── Set-Cookie: access_token (HttpOnly, Secure) ──│
        │    Set-Cookie: refresh_token (HttpOnly, Secure)  │
        │    Response: { user_id, role, permissions }      │ (Catat sesi di DB user_sessions)
        │                                                  │
        │                                                  │
  (Setiap Request Biasa)                                   │
        │─── GET /api/v1/... (credentials: 'include') ────►│
        │    (Cookie access_token terkirim otomatis)       │ (Validasi JWT & cek status user)
        │◄── HTTP 200 OK (Data Response) ──────────────────│
        │                                                  │
        │                                                  │
  (Token Expired 401)                                      │
        │─── Request APi (401 Unauthorized) ──────────────►│
        │                                                  │
        │─── POST /companyprofile/auth/refresh ───────────►│ (Gunakan refresh_token)
        │◄── Set-Cookie: access_token baru ────────────────│
        │─── Ulangi Request Semula (Auto-Retry) ──────────►│
```

#### Hierarki RBAC (Role-Based Access Control)
Tingkat izin hak akses tersusun secara berjenjang dari yang paling ketat ke paling longgar:

```
none < dashboard < read < crud
```

- `none`: Modul tertutup sepenuhnya bagi user.
- `dashboard`: Pengguna hanya berhak melihat statistik agregat / ringkasan.
- `read`: Pengguna dapat membaca data detail, namun tidak dapat melakukan perubahan.
- `crud`: Pengguna memiliki hak penuh untuk membuat, memperbarui, dan menghapus data modul.

#### Tipe Pengguna & Cakupan Akses:
- `applicant`: Akses portal mandiri santri (`/applicant/*`).
- `admin`: Akses backoffice panitia PPDB (`/admin/*`).
- `website_admin`: Akses CMS konten publik Company Profile (`/admin/dashboard`).
- `superadmin`: Akses kendali penuh lintas semua modul, audit log, konfigurasi sistem, dan manajemen akun staf.

#### Pelacakan Sesi Aktif Multi-Perangkat (Multi-Device Session Management):
- Setiap login mencatat metadata perangkat di tabel `user_sessions`: nama perangkat, browser, OS, alamat IP klien, dan waktu interaksi terakhir (*last_active*).
- Pengguna maupun Superadmin dapat mencabut sesi tertentu dari jarak jauh (`DELETE /companyprofile/auth/sessions/{id}`).
- Tersedia fitur darurat pencabutan seluruh sesi lain (`DELETE /companyprofile/auth/sessions/revoke-others`) jika terindikasi kebocoran kredensial.

---

### 4. Pipeline 10 Tahap Calon Santri

Calon santri melalui 10 tahapan seleksi terstruktur dengan validasi ketat di setiap gerbang:

```
 1. REGISTRASI AKUN (Wizard 7 Bagian)
    POST /ppdb/register
    • Pilih Jalur (tanpa tag kurung) • Identitas Santri • Data Ortu/Wali Lengkap
    • Kontak (Email & WA) • Domisili • Kuesioner Kesehatan (10 Soal) • Persetujuan
    └──► Auto-link ke satu-satunya gelombang aktif
            │
            ▼
 2. BAYAR FORMULIR (Pakasir v2 QRIS)
    POST /ppdb/payment/create-invoice ──► Scan QRIS
    Webhook Pakasir v2 ──► Konfirmasi Pembayaran
    └──► Kuota berkurang atomik; Kuitansi resmi terbit (/kuitansi/:id)
            │
            ▼
 3. UNGGAH DOKUMEN
    POST /ppdb/documents/upload
    • Wajib: NISN, KK, Akta Kelahiran, Pas Foto
    • Jalur Khusus: Sertifikat Prestasi / Rapor / Bukti Hafalan
    └──► Panitia verifikasi berkas di Backoffice (/admin/verifikasi-dokumen)
            │
            ▼
 4. UJIAN TIU VIA SAFE EXAM BROWSER (Khusus Jalur TIU)
    GET /selection/applicants/me/tiu-seb ──► Unduh file .seb
    • SEB mengunci layar desktop ──► Buka Google Form (token pre-filled otomatis)
    • Submit ──► Apps Script Webhook ──► POST /ppdb/webhook/tiu
    └──► Timer server ketat, attempt tunggal, tanpa input manual panitia
            │
            ▼
 5. BOOKING SESI 1:1 TAHFIDZ
    POST /ppdb/sessions/tahfidz/book
    • Pilih tanggal, jam, penguji, dan mode (Online Zoom / Tatap Muka)
    └──► Notifikasi konfirmasi booking otomatis terkirim via WhatsApp
            │
            ▼
 6. BOOKING SESI 1:1 WAWANCARA
    POST /ppdb/sessions/interview/book
    • Terbuka otomatis setelah nilai Tahfidz diinput oleh evaluator
    • Pilih jadwal, pewawancara, dan mode (Online / Tatap Muka)
            │
            ▼
 7. PENGUMUMAN KELULUSAN & LoA DIGITAL
    POST /ppdb/applicants/me/sign-loa
    • Panitia rilis status kelulusan di backoffice
    • Pendaftar & wali santri menandatangani LoA digital secara resmi
    └──► is_locked = true (Seluruh data formulir & kesehatan terkunci permanen)
    └──► LoA dapat diverifikasi publik (/loa/:registrationNo)
            │
            ▼
 8. BAYAR DP + ATUR SKEMA CICILAN
    POST /ppdb/payment/dp/create-invoice ──► Bayar DP via QRIS Pakasir v2
    POST /payment/stage2/my-installment-plan ──► Pengaturan tenor cicilan
    └──► Scheduler otomatis kirim WhatsApp reminder H-3 jatuh tempo cicilan
            │
            ▼
 9. PENERBITAN SKD & GABUNG GRUP WHATSAPP
    GET /ppdb/applicants/me/skd
    • Terbit otomatis pasca pelunasan DP
    • Format nomor registrasi unik resmi: REG-{YYYYMMDD}-{XXXX}
    └──► Tautan eksklusif bergabung ke Grup WhatsApp Resmi Santri Baru
            │
            ▼
10. PROFIL MANDIRI & KEAMANAN
    PUT /ppdb/applicants/me
    • Tinjau berkas pendaftaran & kesehatan (read-only jika is_locked = true)
    • Penggantian kata sandi & avatar profil
    └──► Manajemen dan audit sesi login perangkat aktif
```

---

### 5. Arsitektur Pembayaran Pakasir API v2

Sistem pembayaran mengintegrasikan gerbang pembayaran resmi **Pakasir API v2** dengan perlindungan idempotensi satu pintu:

```
[ Pendaftar ]                 [ Core API ]                [ Pakasir API v2 ]
      │                             │                            │
      │─── Klik "Bayar Formulir" ──►│                            │
      │                             │─── POST /api/v2/invoice ──►│
      │                             │    (order_id, amount)      │
      │                             │◄── Response QRIS payload ──│
      │◄── Tampilkan QR Code ───────│                            │
      │                             │                            │
 (Pendaftar Scan & Bayar via m-Banking / e-Wallet)               │
      │                                                          │
      │                                                          │─── Webhook Notifikasi ──┐
      │                                                          │    POST /payment/webhook│
      │                                                          │    (Header: X-Secret)   │
      │                             ┌────────────────────────────┴─────────────────────────┘
      │                             ▼
      │                     [ Webhook Handler API ]
      │                     ├── 1. Validasi header X-Secret
      │                     ├── 2. Pencocokan nominal tagihan (exact match)
      │                     ├── 3. Idempotency Check (skip jika invoice sudah PAID)
      │                     ├── 4. Pengurangan kuota gelombang secara atomik di DB
      │                     │       │
      │                     │       ├── Kuota Habis?
      │                     │       │    ├── Auto-close gelombang pendaftaran
      │                     │       │    ├── Batalkan seluruh invoice formulir pending
      │                     │       │    ├── Kirim WA blast pemberitahuan penutupan
      │                     │       │    └── Hentikan jadwal pengingat Senin
      │                     │       └── Kuota Masih Ada ──► Lanjut proses
      │                     ├── 5. Update status invoice ──► PAID
      │                     ├── 6. Terbitkan Kuitansi Resmi bertanda tangan HMAC
      │                     └── 7. Enqueue notifikasi WA ──► Redis DB 1 ──► BullMQ
      │
      ▼
[ Kuitansi Publik ] ◄── GET /kuitansi/:id (Dapat diakses publik tanpa login via QR)
```

#### Penanganan Transaksi Terlambat (`late_payment_exception`):
Jika webhook pembayaran sukses tiba dari Pakasir **setelah** tagihan dibatalkan karena kuota gelombang telah habis:
1. Sistem **tidak** menolak pembayaran dan **tidak** memindahkan pendaftar secara otomatis ke gelombang lain.
2. Sistem menandai transaksi dengan status `late_payment_exception`.
3. Insiden masuk ke dashboard panitia untuk penanganan manual administratif (penambahan kuota darurat atau proses pengembalian dana resmi).

---

### 6. Arsitektur Safe Exam Browser (SEB) & TIU

Tes Intelegensi Umum (TIU) diselenggarakan secara aman dan otomatis tanpa input nilai manual oleh panitia:

```
[ Backoffice Admin ]
   │ Konfigurasi Global:
   │ • Pre-filled URL Google Form (dengan placeholder {token})
   │ • Webhook Secret (X-TIU-Secret)
   │ • Durasi Ujian (menit)
   ▼
[ Pendaftar di /applicant/ujian-tiu ]
   │ Klik "Mulai Ujian"
   ▼
[ Core API: GET /selection/applicants/me/tiu-seb ]
   ├── Validasi: Belum pernah ujian (single attempt) & status pembayaran paid
   ├── Generate token unik attempt ujian
   ├── Catat waktu mulai ujian (server-side start timestamp)
   └── Bangun file .seb terenkripsi dengan StartURL pre-filled token
   ▼
[ Klien Buka ujian-tiu.seb di Safe Exam Browser (Windows/macOS) ]
   ├── SEB mengunci seluruh layar (task switching, screenshot, clipboard diblokir)
   ├── Menampilkan Google Form ujian dengan token pendaftar terisi otomatis
   └── Pendaftar menjawab soal pilihan ganda
   ▼
[ Pendaftar Klik "Submit" pada Google Form ]
   │
   ▼ (Trigger Google Apps Script: onSubmit)
[ Google Apps Script ]
   │ Ekstrak skor perolehan & token peserta
   └──► POST /ppdb/webhook/tiu
        (Header: X-TIU-Secret, Body: { token, score, submitted_at })
   ▼
[ Core API TIU Webhook Handler ]
   ├── Validasi header X-TIU-Secret
   ├── Validasi token attempt aktif di database
   ├── Validasi batas durasi: submitted_at <= start_time + durasi + 5 menit toleransi
   ├── Simpan skor secara idempoten di tabel tiu_results
   └── Dispatch pesan WhatsApp: tiu_result_ready
```

> **Toleransi Gangguan Jaringan:** Timer ujian dikontrol sepenuhnya di server. Jika perangkat pendaftar mati atau koneksi terputus, pendaftar dapat membuka kembali file `.seb` selama durasi server belum habis. Google Form secara otomatis menyimpan draf jawaban (*autosave*).

---

### 7. Arsitektur WhatsApp Microservice & BullMQ

Notifikasi WhatsApp diproses secara asynchronous menggunakan pola antrian pesan terdistribusi:

```
[ Core API (FastAPI) ]
   │
   │ Operasi event (Invoice terbit, Pembayaran sukses, LoA, Jadwal sesi)
   ▼
[ Enqueue Job via aioredis ]
   │ Queue Name: 'wa-notifications'
   ▼
[ Redis Instance (DB 1) ]
   │
   ▼ (BLPOP / Worker Consumer)
[ WhatsApp Microservice (apps/whatsapp) ]
   ├── BullMQ Job Worker (Concurrency: 1)
   ├── Anti-flood Rate Limiting (Jeda acak 2-5 detik antar pesan)
   ├── Headless Chromium Instance (whatsapp-web.js)
   └── Eksekusi Kirim Pesan / Kirim File Dokumen
          │
          ├── Sukses ──► Catat riwayat di tabel notification_logs
          └── Gagal  ──► Retry eksposensial (maksimal 3 kali) ──► Dead Letter Queue
```

#### Scheduler Pengingat Cicilan (APScheduler):
- Background scheduler pada Core API (`apps/api/src/core/scheduler.py`) berjalan secara berkala setiap hari.
- Mendeteksi jatuh tempo tagihan cicilan Tahap 2 pendaftar dan otomatis men-dispatch notifikasi peringatan via WhatsApp **H-3 sebelum tanggal jatuh tempo**.

---

### 8. Arsitektur Database & Domain Models

Struktur data relasional dikelompokkan secara terpisah berdasarkan domain bisnis di `apps/api/src/models/`:

```
apps/api/src/models/
├── auth.py          # User, Role, UserSession, UserModulePermission, UserPagePermission
├── ppdb.py          # PPDBPeriod, PPDBWave, PPDBApplicant, PPDBDocument, PPDBHealthQuestionnaire
├── selection.py     # SelectionCategory, SelectionCriteria, SelectionSession, SelectionScore, PPDBTIUAttempt
├── payment.py       # PPDBPaymentTransaction, PPDBStage2Bill, InstallmentPlan, InstallmentPayment
├── content.py       # SiteSetting, News, Programs, Facilities, Staff, Galleries, Testimonials
├── notification.py  # NotificationLog, NotificationTemplate
└── loa_skd.py       # LoATemplate, LoASignature, SKDRecord
```

#### Entitas & Relasi Inti:
1. **`PPDBPeriod` (1) ───< (N) `PPDBWave`:** Periode menaungi gelombang. Hanya 1 periode dan 1 gelombang yang boleh berstatus aktif (`is_active = true`) dalam satu waktu secara global.
2. **`PPDBWave` (1) ───< (N) `PPDBApplicant`:** Pendaftar otomatis terikat pada satu-satunya gelombang yang aktif saat registrasi.
3. **`PPDBApplicant` (1) ─── (1) `PPDBHealthQuestionnaire`:** Relasi 1:1 data kuesioner kesehatan 10 pertanyaan baku.
4. **`PPDBApplicant` (1) ───< (N) `PPDBPaymentTransaction`:** Transaksi pembayaran formulir dan DP pendaftar.
5. **`PPDBApplicant` (1) ─── (1) `PPDBTIUAttempt`:** Rekaman percobaan ujian TIU tunggal per peserta.
6. **`PPDBApplicant` (1) ─── (1) `PPDBStage2Bill`:** Buku besar tagihan masuk, status DP, dan skema cicilan.

#### Konvensi Migrasi Skema:
Semua perubahan skema database wajib melalui berkas migrasi Alembic (`apps/api/alembic/versions/`). **Dilarang keras mengeksekusi perintah DDL (`ALTER TABLE`) langsung di database produksi.**

---

### 9. Aturan Bisnis Kritis (Business Invariants)

Aturan-aturan berikut adalah pilar integritas sistem yang wajib dipatuhi di backend maupun frontend:

1. **Bebas Jenjang Pendidikan (Zero Education-Level Bias):**
   - Sistem **sama sekali tidak mengenal** pemilihan jenjang pendidikan (`SMP`, `SMK`, dll.).
   - Tidak ada dropdown, filter, atau field isian jenjang di seluruh formulir registrasi, dashboard pendaftar, konfigurasi gelombang, maupun halaman publik.
   - Jika jenjang perlu tertera pada dokumen cetak resmi (LoA, SKD), ambil sebagai atribut tetap institusi dari satu konfigurasi tingkat sekolah — **bukan input pendaftar**.
2. **Periode & Gelombang Tunggal:**
   - Hanya boleh ada **satu periode aktif** secara global. Mengaktifkan periode lain otomatis menonaktifkan periode sebelumnya dan gelombang di dalamnya.
   - Hanya boleh ada **satu gelombang aktif** per periode. Mengaktifkan gelombang lain otomatis menonaktifkan gelombang aktif sebelumnya.
   - Pendaftar tidak memilih gelombang; sistem otomatis menautkannya ke gelombang aktif satu-satunya.
3. **Kuota Atomik & Penutupan Otomatis:**
   - Kuota dan diskon pendaftar awal dihitung dari transaksi pembayaran formulir yang **sukses terkonfirmasi** (bukan dari pendaftaran akun).
   - Saat kuota terpenuhi: gelombang langsung ditutup otomatis, tagihan formulir pending dibatalkan, dan WA reminder dihentikan.
4. **Kuesioner Kesehatan (Pengganti Medcheck):**
   - Diisi mandiri oleh pendaftar saat registrasi (10 soal baku + kontak darurat + pernyataan).
   - Bersifat sensitif: hanya dapat dibuka oleh admin berizin pada dossier pendaftar dan setiap akses tercatat dalam log audit.
5. **Kunci Formulir Pasca-LoA (`is_locked = true`):**
   - Begitu LoA resmi ditandatangani oleh pendaftar dan wali santri, seluruh data profil dan kuesioner kesehatan dikunci permanen (`is_locked = true`) dan tidak dapat diedit lagi di portal mandiri.
6. **Arsip Terpusat di `/admin/arsip`:**
   - Filter lintas periode dan gelombang **hanya tersedia di halaman Arsip/Cari Pendaftar (`/admin/arsip`)**.
   - Menyediakan unduhan berkas individual dan paket arsip dossier ZIP lengkap (`GET /ppdb/archive/applicants/{id}/dossier/zip`) yang diaudit dengan alamat IP admin.

---

### 10. Integrasi Eksternal

| Layanan Eksternal | Protokol | Arah Komunikasi | Peran & Penggunaan |
|---|---|---|---|
| **Pakasir API v2** | HTTPS REST | Dua Arah (Outbound API call & Inbound Webhook) | Pembuatan QRIS dinamis, verifikasi notifikasi pembayaran, refund |
| **Google Apps Script** | HTTPS Webhook | Inbound (Apps Script ──► Core API) | Pengiriman skor kuis TIU real-time pasca-submit Google Form |
| **Safe Exam Browser (SEB)** | File `.seb` | Outbound (Core API generate file) | Penguncian lingkungan desktop saat ujian online TIU |
| **Cloudinary** | HTTPS REST | Outbound (Core API ──► Cloudinary) | Media storage untuk avatar pendaftar, foto staf, galeri, dan aset CMS |
| **WhatsApp (whatsapp-web.js)** | Redis Queue | Internal Monorepo | Core API enqueue ke BullMQ ──► WhatsApp Microservice kirim pesan |

---

## 📄 Dokumen Resmi & Ekspor Cetak

Sistem menyediakan engine ekspor A4 resmi (`apps/ppdb/src/utils/export*`):

| Dokumen | Fungsi Export | Isi |
|---|---|---|
| **Formulir Pendaftaran** | `exportApplicantForm` | Data diri, riwayat sekolah, keluarga, kuesioner kesehatan + stempel digital |
| **Lembar Penilaian** | `exportAssessment` | Skor TIU otomatis, nilai Tahfidz & Wawancara berbobot |
| **Kuitansi Pembayaran** | `exportReceipt` | Nominal, tanggal, stempel digital, QR verifikasi HMAC |
| **Surat Penerimaan (LoA)** | `exportLoa` | Klausul non-refundable, TTD digital orang tua + panitia, QR verifikasi |
| **Surat Keterangan Diterima (SKD)** | `exportSkd` | Nomor `REG-{YYYYMMDD}-{XXXX}`, diterbitkan pasca-pelunasan DP |

---

## 🌐 Rute Verifikasi Publik (Tanpa Login)

Untuk memudahkan verifikasi keabsahan dokumen secara langsung via pemindaian QR code fisik atau digital:

- 🧾 **Kuitansi Pembayaran Resmi:** `/kuitansi/:id` atau `/receipt/:id`
  Diberi segel keamanan token HMAC — dapat diakses siapa saja tanpa login.
- 📜 **Surat Penerimaan Resmi (LoA):** `/loa/:registrationNo`
  Memverifikasi status kelulusan santri dan keaslian dokumen LoA.

---

## 🎨 UI/UX Design System

> **PENTING: Desain Antarmuka (Visual Design) berbeda dengan Arsitektur Sistem (System Design).**
> Dokumen ini berfokus pada estetika, warna, tipografi, dan pengalaman pengguna Pesantren Tahfidz Qur'an dan Digital Ar-Rahman. Rincian lengkap dapat dipelajari di [**DESIGN.md**](DESIGN.md).

Ringkasan Visual Identity Ar-Rahman:
- **Filosofi Visual:** Perpaduan Keagungan Islam (*Islamic Serenity*) dan Modernitas Digital (*Digital Precision*).
- **Warna Pokok:** Latar Gading (*Warm Ivory* `#F7F5F0`), Teks Obsidian (`#1A1A1A`), Hijau Zamrud Institusi (`#1A6B47`), Emas Tahfidz (`#D4A853`), dan Biru Telegram (`#2AABEE`).
- **Tipografi:** *Playfair Display* (Hero Brand Utama), *Inter / DM Sans* (Body & UI), *Amiri* (Ayat Al-Qur'an), dan *Inter Monospace* (Nomor Registrasi & Token).
- **Micro-Interactions & Motion:** Kurva transisi kustom `.ease-brand-pill` (`cubic-bezier(0.22, 1, 0.36, 1)` durasi 400ms) untuk navbar mengambang dan efek glassmorphism.
- **Komponen UI Bersama:** Terisolasi di `packages/ui` (`@repo/ui`) menggunakan primitif Radix UI dan Tailwind CSS.
- **Dynamic Branding:** Logo, favicon, dan teks institusi wajib diambil dinamis dari `settingsService.getLogo()` — dilarang melakukan hardcode gambar logo statis.

Untuk spesifikasi detail token CSS, rasio kontras WCAG AA, dan tata letak A4 resmi, buka [**DESIGN.md**](DESIGN.md).

---

## 📚 Referensi Dokumen

| Dokumen | Path | Keterangan |
|---|---|---|
| **Panduan Desain UI/UX** | [`DESIGN.md`](DESIGN.md) | Sistem Desain, token warna, tipografi, elevasi, dan standar visual |
| Aturan Bisnis & Requirements | [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Logika utama: periode, kuota atomik, LoA, rubrik, bebas-jenjang, kesehatan |
| Docker Runbook (WSL2 Lokal) | [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md) | Panduan deployment lokal langkah-per-langkah |
| Docker Runbook (Production VPS) | [`docs/DOCKER_PRODUCTION.md`](docs/DOCKER_PRODUCTION.md) | Setup VPS Linux dengan Nginx + Let's Encrypt |
| Panduan TIU Safe Exam Browser | [`docs/PANDUAN_UJIAN_TIU_SEB.md`](docs/PANDUAN_UJIAN_TIU_SEB.md) | Instalasi & penggunaan SEB untuk ujian TIU |
| Integrasi Apps Script TIU | [`docs/INTEGRASI_TIU_APPS_SCRIPT.md`](docs/INTEGRASI_TIU_APPS_SCRIPT.md) | Skrip Google Apps Script sinkronisasi nilai kuis |
| Notifikasi WhatsApp | [`docs/notifikasi-code-1790904241894.md`](docs/notifikasi-code-1790904241894.md) | Template & event notifikasi WhatsApp |
| Hero 3D Globe | [`docs/HERO_3D_GLOBE.md`](docs/HERO_3D_GLOBE.md) | Arsitektur Three.js, aset, dan optimasi bundle |
| Skrip & Tooling | [`scripts/README.md`](scripts/README.md) | Sinkronisasi Windows-WSL, normalisasi LF, utilitas debug |
| **Panduan Agent (root)** | [`AGENTS.md`](AGENTS.md) | Aturan coding & konvensi lintas project |
| Panduan Agent API | [`apps/api/AGENTS.md`](apps/api/AGENTS.md) | Arsitektur backend (FastAPI, Alembic, Pakasir v2, Repositories) |
| Panduan Agent PPDB | [`apps/ppdb/AGENTS.md`](apps/ppdb/AGENTS.md) | Arsitektur frontend PPDB (10 rute tahapan, modal, backoffice) |
| Panduan Agent Superadmin | [`apps/superadmin/AGENTS.md`](apps/superadmin/AGENTS.md) | Arsitektur panel Superadmin |
| Panduan Agent Company Profile | [`apps/companyprofile/AGENTS.md`](apps/companyprofile/AGENTS.md) | Arsitektur portal Company Profile & auth cookies |

---

## 🚀 Quick Start

### Opsi 1: Docker di WSL2 (Sangat Direkomendasikan)

Ikuti runbook lengkap di [`docs/DOCKER_SETUP.md`](docs/DOCKER_SETUP.md):

1. Pastikan berada di direktori ext4 WSL (`/home/<user>/project-ppdb`) — jangan di `/mnt/c/`.
2. Siapkan file `.env` di masing-masing aplikasi (`apps/api/.env`, `apps/whatsapp/.env`).
3. Jalankan Docker Compose:

```bash
docker compose up -d --build
```

Setelah semua container berstatus *healthy*, layanan dapat diakses:

| Layanan | URL |
|---|---|
| Company Profile | `http://<ip-wsl>:3000` |
| Portal PPDB | `http://<ip-wsl>:5173` |
| Panel Superadmin | `http://<ip-wsl>:5174` |
| Core API | `http://<ip-wsl>:8080` |

### Opsi 2: Local Vite Dev (Host Dev)

Untuk pengembangan UI secara cepat tanpa Docker:

```bash
# Instal seluruh dependensi monorepo
pnpm install

# Jalankan seluruh frontend secara serentak via Turborepo
pnpm dev
```

> **Alokasi Port Dev Lokal:**
> | Layanan | Port |
> |---|---|
> | Company Profile | `http://localhost:3000` |
> | Portal PPDB | `http://localhost:5174` |
> | Panel Superadmin | `http://localhost:5173` |
> | Core API (non-Docker) | `http://localhost:8000` |

---

<div align="center">
  <i>Dikembangkan dengan 💻 untuk generasi Qur'ani masa depan.</i>
</div>
