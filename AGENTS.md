# Panduan Agent — PPDB Ar-Rahman

> Dokumen ini adalah panduan utama bagi AI agent yang bekerja di monorepo ini. Gunakan sebagai referensi pertama sebelum membaca kode. Selalu prioritaskan dokumen di `docs/` sebagai acuan aturan bisnis terbaru — jangan menerapkan flow lama dari arsip kode atau README lama tanpa konfirmasi.

---

## 📑 Daftar Isi

1. [Status Kebutuhan Produk](#status-kebutuhan-produk)
2. [Ruang Lingkup Sistem](#ruang-lingkup-sistem)
3. [Alur 10 Tahap Pendaftar](#alur-10-tahap-pendaftar)
4. [Aturan Bisnis Kritis](#aturan-bisnis-kritis)
5. [Arsitektur Database & Model](#arsitektur-database--model)
6. [Konvensi Pengkodean](#konvensi-pengkodean)
7. [Endpoint Kritis](#endpoint-kritis)
8. [Integrasi External](#integrasi-external)
9. [Dokumen Resmi & Ekspor Cetak](#dokumen-resmi--ekspor-cetak)
10. [Pencarian & Manajemen Sesi](#pencarian--manajemen-sesi)
11. [Rute Publik Tanpa Login](#rute-publik-tanpa-login)
12. [Acuan Dokumen Repository](#acuan-dokumen-repository)
13. [Aturan Kerja & Konvensi](#aturan-kerja--konvensi)

---

## Status Kebutuhan Produk

Sistem PPDB Pesantren Tahfidz Qur'an dan Digital Ar-Rahman menaungi **Konfigurasi Backoffice Panitia** dan **Portal Tahapan Mandiri Calon Santri (Pendaftar)**. Gunakan dokumen spesifikasi terbaru dalam `docs/` sebagai acuan kebutuhan utama. Jangan menerapkan flow lama dari kode arsip atau README lama tanpa konfirmasi.

---

## Ruang Lingkup Sistem

### 1. Konfigurasi Backoffice Panitia

Admin/Panitia menyiapkan komponen operasional sebelum pendaftaran dibuka:

- **Gelombang:** tanggal buka/tutup, harga formulir, kuota pendaftar, diskon komponen DP/gedung/SPP, diskon X pendaftar pertama, dan minimal DP.
- **Template dan LoA:** generate dan preview LoA sebelum publish, latar SKD, dan klausul dana tidak dapat dikembalikan (*non-refundable*).
- **Rubrik Penilaian:** kriteria, bobot, dan formulir evaluator Tahfidz serta Wawancara. Nilai TIU berasal otomatis dari paket pilihan ganda dan webhook — admin **tidak** menginput nilai TIU manual.
- **Sesi 1:1 Tahfidz:** penjadwalan, penguji, mode online/offline, tautan Zoom atau lokasi tatap muka.
- **Sesi 1:1 Wawancara:** penjadwalan, pewawancara, mode online/offline, tautan Zoom atau lokasi tatap muka.
- **Pengaturan TIU Global:** URL pre-filled Google Form (dengan placeholder `{token}`), webhook secret, durasi tes (menit), dan integrasi Apps Script untuk sinkronisasi skor secara real-time. Pengaturan TIU bersifat **global**, bukan per gelombang.

---

## Alur 10 Tahap Pendaftar

Pendaftar melewati tahapan pendaftaran secara berurutan dan terstruktur:

| # | Tahap | Aksi Kunci | Endpoint Terkait |
|---|---|---|---|
| 1 | **Pendaftaran Akun (7 Bagian)** | Pilih Jalur, Identitas Santri, Data Ortu/Wali, Kontak, Domisili, Kuesioner Kesehatan (10 soal), Pernyataan | `POST /ppdb/register` |
| 2 | **Bayar Formulir (Pakasir v2)** | QRIS dinamis → kuota berkurang → kuitansi terbit | `POST /ppdb/payment/create-invoice` |
| 3 | **Upload Dokumen** | NISN, KK, Akte, Pas Foto + dokumen jalur khusus | `POST /ppdb/documents/upload` |
| 4 | **Ujian TIU (SEB)** | Unduh `.seb` → kunci layar → Google Form → Apps Script webhook | `POST /ppdb/webhook/tiu` |
| 5 | **Booking Tahfidz** | Pilih slot jadwal + penguji (online/offline) | `POST /ppdb/sessions/tahfidz/book` |
| 6 | **Booking Wawancara** | Terbuka otomatis setelah nilai Tahfidz diinput | `POST /ppdb/sessions/interview/book` |
| 7 | **Pengumuman + LoA** | Unduh LoA → tanda tangan digital pendaftar + orang tua | `POST /ppdb/applicants/me/sign-loa` |
| 8 | **Bayar DP + Cicilan** | QRIS DP Pakasir v2 → setup skema cicilan | `POST /ppdb/payment/dp/create-invoice` |
| 9 | **SKD + Grup WA** | DP lunas → SKD `REG-{YYYYMMDD}-{XXXX}` → tautan WA Group | `GET /ppdb/applicants/me/skd` |
| 10 | **Profil Mandiri** | Update data + kuesioner kesehatan, kelola avatar, pantau sesi | `PUT /ppdb/applicants/me` |

> **is_locked:** Setelah LoA resmi terbit dan ditandatangani, flag `is_locked = true` dikunci. Pendaftar tidak dapat mengubah data formulir atau kuesioner kesehatan setelah status ini.

---

## Aturan Bisnis Kritis

### Periode & Gelombang Tunggal

- **Periode Tunggal:** Hanya satu periode aktif secara global. Mengaktifkan periode lain menonaktifkan periode dan gelombang sebelumnya.
- **Gelombang Tunggal:** Dalam satu periode hanya boleh ada satu gelombang aktif. Mengaktifkan gelombang lain menggantikan gelombang aktif sebelumnya.
- **Penautan Otomatis:** Pendaftar otomatis masuk ke gelombang aktif satu-satunya — tidak ada pilihan manual.

### Kuota Atomik & Penutupan Otomatis

- Kuota dan diskon X pendaftar awal dihitung dari pembayaran formulir yang **sukses** (bukan dari pendaftaran akun).
- Saat kuota tercapai: gelombang ditutup otomatis, invoice pending dibatalkan, dan WA reminder dihentikan.
- **Pengecualian pembayaran terlambat:** jika webhook sukses tiba setelah kuota habis dan invoice dibatalkan → tandai sebagai *exception* untuk pemeriksaan admin. **Jangan** memindahkan pendaftar ke gelombang lain secara otomatis.

### Bebas Jenjang Pendidikan

- Sistem **tidak mengenal** daftar jenjang pendidikan (`SMP`, `SMK`, dll.).
- Tidak ada pemilihan jenjang di mana pun: formulir registrasi, dashboard pendaftar, konfigurasi gelombang, maupun halaman publik.
- Pendaftar tidak dapat memilih, mengisi, atau mengubah jenjang.
- **Jangan** menambah field/whitelist jenjang baru di backend maupun UI.
- Jika jenjang perlu dicantumkan di dokumen resmi (LoA, SKD), perlakukan sebagai atribut tetap institusi dari satu konfigurasi tingkat sekolah — **bukan input pengguna**.

### Kuesioner Kesehatan (Pengganti Medcheck)

- Diisi sendiri oleh pendaftar saat registrasi awal di `/register` — **bukan** oleh petugas medis.
- Struktur **10 pertanyaan baku:** riwayat penyakit kronis, diagnosis kondisi tertentu, alergi, pengobatan rutin, keterbatasan fisik, riwayat rawat inap (2 tahun terakhir), kebutuhan khusus belajar, nama kontak darurat, hubungan kontak darurat, nomor telepon darurat.
- Pertanyaan Ya/Tidak membuka kolom keterangan kondisional. Keterangan pada jawaban "Tidak" dikosongkan dan tidak dikirim.
- Validasi kelengkapan dijalankan ulang di backend saat pendaftaran.
- Data kesehatan bersifat **sensitif**: hanya dapat dibuka oleh admin pada detail/dossier pendaftar dengan catatan audit.
- Pendaftar dapat memperbarui kuesioner di `/applicant/profile` selama `is_locked = false`.

### Arsip & Dossier

- Filter pencarian lintas periode dan gelombang **hanya ada** di halaman `/admin/arsip` — tidak ditambahkan ke tabel operasional lain.
- Dossier lengkap: biodata, dokumen + riwayat verifikasi, hasil TIU, nilai sesi 1:1, keputusan kelulusan, LoA bertanda tangan, riwayat pembayaran & cicilan, SKD.
- Mendukung unduhan per berkas dan unduhan paket ZIP satu-klik.
- Akses dossier dibatasi izin khusus dan mencatat log audit alamat IP admin.

---

## Arsitektur Database & Model

Model SQLAlchemy dikelompokkan per domain di `apps/api/src/models/`:

| File Model | Domain | Tabel Utama |
|---|---|---|
| `auth.py` | Autentikasi & Pengguna | `users`, `user_sessions`, `roles`, `permissions`, `role_permissions` |
| `ppdb.py` | PPDB Inti | `periods`, `waves`, `applicants`, `health_questionnaires`, `documents`, `document_verifications` |
| `selection.py` | Seleksi & Penilaian | `tiu_settings`, `tiu_results`, `rubrics`, `rubric_criteria`, `session_schedules`, `session_bookings`, `session_scores` |
| `payment.py` | Pembayaran | `invoices`, `payments`, `installment_plans`, `installment_payments` |
| `content.py` | CMS Company Profile | `posts`, `programs`, `staff`, `facilities`, `galleries`, `settings` |
| `notification.py` | Notifikasi & Log | `notification_logs`, `wa_jobs`, `activity_logs` |
| `loa_skd.py` | Dokumen Kelulusan | `loa_templates`, `loa_signatures`, `skd_records` |

**Konvensi migrasi:** Gunakan Alembic (`apps/api/alembic/`). Setiap perubahan skema harus melalui file migrasi — **jangan** `ALTER TABLE` langsung ke database produksi.

---

## Konvensi Pengkodean

### Backend (FastAPI — `apps/api/`)

Arsitektur berlapis (layered architecture):

```
Router (src/routers/)
  └──► Service (src/services/)
         └──► Repository (src/repositories/)
                └──► SQLAlchemy Model / Redis / External API
```

| Lapisan | Lokasi | Tanggung Jawab |
|---|---|---|
| **Router** | `src/routers/` | Validasi request (Pydantic), otorisasi, panggil service, format response |
| **Service** | `src/services/` | Logika bisnis, orkestrasi antar-repository, transaksi DB |
| **Repository** | `src/repositories/` | Query database, tidak boleh ada logika bisnis |
| **Core** | `src/core/` | Klien eksternal: `pakasir.py`, `cloudinary.py`, `scheduler.py`, `security.py` |
| **Models** | `src/models/` | Definisi SQLAlchemy ORM |
| **Schemas** | `src/schemas/` | Pydantic request/response schema |

**Aturan:**
- Router **tidak boleh** memanggil repository secara langsung — harus melalui service.
- Service **tidak boleh** mengimport router atau schema response secara langsung.
- Repository **tidak boleh** mengandung logika bisnis — hanya query data.
- Semua dependency injection menggunakan `Depends()` FastAPI.

### Frontend (React — `apps/ppdb/`, `apps/superadmin/`)

```
Page Component (src/pages/)
  └──► Feature Component (src/components/<feature>/)
         └──► API Hook (src/hooks/ atau src/services/)
                └──► API Client (src/lib/api.ts)
```

- Gunakan TanStack Query untuk semua data fetching — jangan `useEffect` + `fetch` manual.
- State global dengan Zustand; state lokal dengan `useState`/`useReducer`.
- Komponen UI bersama berada di `packages/ui` — import dari `@repo/ui/...`.

---

## Endpoint Kritis

### Autentikasi
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/auth/login` | Login, set HTTP-only Cookie JWT |
| `POST` | `/auth/logout` | Hapus cookie & revoke sesi |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/sessions` | Daftar sesi aktif pengguna |
| `DELETE` | `/auth/sessions/{session_id}` | Revoke sesi spesifik |
| `DELETE` | `/auth/sessions/others` | Revoke semua sesi lain |

### Pendaftaran PPDB
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/ppdb/register` | Registrasi akun pendaftar baru |
| `GET` | `/ppdb/applicants/me` | Data pendaftar yang sedang login |
| `PUT` | `/ppdb/applicants/me` | Update profil & kuesioner kesehatan |
| `POST` | `/ppdb/applicants/me/sign-loa` | Tanda tangan digital LoA |
| `GET` | `/ppdb/applicants/me/skd` | Unduh SKD pasca-pelunasan DP |

### Dokumen & TIU
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/ppdb/documents/upload` | Upload dokumen persyaratan |
| `GET` | `/ppdb/tiu/seb-config` | Unduh konfigurasi `.seb` untuk ujian |
| `POST` | `/ppdb/webhook/tiu` | Webhook nilai TIU dari Apps Script |

### Sesi 1:1
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/ppdb/sessions/tahfidz/slots` | Daftar slot Tahfidz tersedia |
| `POST` | `/ppdb/sessions/tahfidz/book` | Booking sesi Tahfidz |
| `GET` | `/ppdb/sessions/interview/slots` | Daftar slot Wawancara tersedia |
| `POST` | `/ppdb/sessions/interview/book` | Booking sesi Wawancara |

### Payment
| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/ppdb/payment/create-invoice` | Buat invoice formulir, generate QRIS |
| `POST` | `/ppdb/payment/dp/create-invoice` | Buat invoice DP Tahap 2, generate QRIS |
| `POST` | `/payment/webhook` | Terima webhook Pakasir v2 |
| `POST` | `/payment/webhook/pak-kasir` | Alternatif endpoint webhook Pakasir |
| `GET` | `/payment/public-receipt/{id}` | Kuitansi publik (tanpa login) |

### Admin Backoffice
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/admin/waves` | Daftar gelombang |
| `POST` | `/admin/waves` | Buat gelombang baru |
| `PUT` | `/admin/waves/{id}/activate` | Aktifkan gelombang |
| `GET` | `/admin/applicants` | Daftar pendaftar (gelombang aktif) |
| `GET` | `/admin/applicants/{id}` | Detail pendaftar |
| `PUT` | `/admin/documents/{id}/verify` | Verifikasi dokumen pendaftar |
| `GET` | `/admin/pembayaran-tahap2/{applicantId}` | Detail tagihan & cicilan Tahap 2 |
| `GET` | `/admin/arsip` | Arsip dossier lintas periode & gelombang |

### Pencarian & Superadmin
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/search/global` | Pencarian global lintas modul |
| `GET` | `/admin/settings` | Konfigurasi global sistem |
| `PUT` | `/admin/settings` | Update konfigurasi global |

### Verifikasi Publik
| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/kuitansi/:id` | Verifikasi kuitansi via QR (publik) |
| `GET` | `/loa/:registrationNo` | Verifikasi LoA via QR (publik) |

---

## Integrasi External

### 💳 Pakasir API v2
- **File:** `apps/api/src/core/pakasir.py` & `src/services/payment_service.py`
- **QRIS Dinamis:** Setiap transaksi (formulir atau DP) men-generate QRIS baru dengan batas waktu kedaluwarsa.
- **Webhook 1 Pintu:** `POST /payment/webhook` dan `POST /payment/webhook/pak-kasir`
  - Validasi header `X-Secret`
  - Pencocokan nominal
  - Idempotency check — mencegah duplikasi saldo/kuota
- **Kuitansi:** Setiap pembayaran yang terkonfirmasi menerbitkan kuitansi bertanda tangan HMAC.

### 🧪 Google Form + Apps Script (TIU)
- **Alur:** Pendaftar buka Google Form via SEB → isi soal → submit → Apps Script otomatis `POST /ppdb/webhook/tiu`
- **Konfigurasi Global:** URL pre-filled form dengan placeholder `{token}`, webhook secret, durasi tes (menit).
- **Keamanan:** Webhook divalidasi dengan secret — reject request tanpa header yang valid.
- **File panduan:** `docs/INTEGRASI_TIU_APPS_SCRIPT.md`

### 🔒 Safe Exam Browser (SEB)
- **Alur:** Pendaftar unduh file `.seb` dari dashboard → SEB mengunci seluruh desktop → buka Google Form pre-filled dengan token pendaftar.
- **Token:** Disematkan otomatis di URL Google Form — pendaftar tidak perlu input manual.
- **File panduan:** `docs/PANDUAN_UJIAN_TIU_SEB.md`

### 🖼️ Cloudinary
- **File:** `apps/api/src/core/cloudinary.py`
- **Digunakan untuk:** Upload & serve gambar avatar pendaftar, logo institusi, foto staf, galeri, dan aset CMS.
- **Dynamic branding:** Logo dan favicon diambil dinamis via `settingsService.getLogo()` — **jangan** hardcode path statis.

### 📱 WhatsApp (whatsapp-web.js)
- **Arsitektur:** Core API enqueue job ke Redis → BullMQ consumer di `apps/whatsapp` → `whatsapp-web.js` kirim pesan.
- **Event notifikasi:** Pembayaran formulir sukses, konfirmasi booking sesi, pengingat cicilan H-3 (via APScheduler), tautan WA Group pasca-SKD.
- **Port internal:** `:3100` — tidak dipublikasikan ke host, hanya diakses dari jaringan Docker internal.
- **Spesifikasi template:** `docs/notifikasi-code-1790904241894.md`

### ⏰ Scheduler Cicilan (APScheduler)
- **File:** `apps/api/src/core/scheduler.py`
- **Tugas:** Mendeteksi jatuh tempo cicilan dan mengirimkan notifikasi pengingat via WhatsApp H-3 sebelum tenggat.
- **Pemberhentian otomatis:** Saat gelombang penuh (kuota tercapai), pengingat Senin dihentikan.

---

## Integrasi Payment Gateway Pakasir API v2

- Backend menggunakan integrasi resmi Pakasir API v2 (`apps/api/src/core/pakasir.py` & `src/services/payment_service.py`).
- **QRIS Dinamis:** Setiap transaksi formulir atau pembayaran tahap 2 men-generate QRIS dengan batas waktu kedaluwarsa.
- **Webhook Verifikasi 1 Pintu:** Webhook diterima di `POST /payment/webhook` dan `POST /payment/webhook/pak-kasir`, divalidasi dengan header `X-Secret`, pencocokan nominal, dan pencatatan idempoten untuk mencegah duplikasi saldo/kuota.
- **Kuitansi Resmi Publik:** Setiap pembayaran yang terkonfirmasi menerbitkan kuitansi resmi bertanda tangan digital HMAC token (`/kuitansi/:id` atau `/payment/public-receipt/{id}`).
- **Penjadwal Cicilan:** Scheduler latar belakang (`apps/api/src/core/scheduler.py`) mendeteksi jatuh tempo cicilan pendaftar dan mengirimkan notifikasi pengingat via WhatsApp H-3 sebelum tenggat.

---

## Dokumen Resmi & Ekspor Cetak

Sistem menerapkan format cetak dan ekspor resmi A4 baku (`apps/ppdb/src/utils/export*`):

| Dokumen | Fungsi | Isi |
|---|---|---|
| **Formulir Pendaftaran** | `exportApplicantForm` | Data diri, riwayat sekolah, keluarga, kuesioner kesehatan + stempel digital |
| **Lembar Penilaian Evaluator** | `exportAssessment` | Skor TIU otomatis, nilai Tahfidz & Wawancara berbobot |
| **Kuitansi Resmi Pembayaran** | `exportReceipt` | Nominal, tanggal, stempel digital, QR verifikasi HMAC |
| **Surat Penerimaan (LoA)** | `exportLoa` | Klausul non-refundable, TTD digital orang tua + panitia, QR verifikasi |
| **Surat Keterangan Diterima (SKD)** | `exportSkd` | Nomor `REG-{YYYYMMDD}-{XXXX}`, diterbitkan pasca-pelunasan DP |

---

## Pencarian & Manajemen Sesi

### Pencarian Terpadu
- **Core API (`GET /search/global`):** Endpoint pencarian modular lintas modul — pendaftar, berita, program, staf, pengguna sistem, dan log aktivitas.
- **Superadmin Semantic Engine (`Ctrl+K`):** Dialog pencarian semantik cerdas untuk navigasi cepat halaman, pencarian data pendaftar, dan eksekusi tindakan instan.

### Manajemen Sesi Multi-Perangkat
- Terpasang pada seluruh profil pengguna (Pendaftar, Admin PPDB, Admin Web, dan Superadmin) melalui paket bersama `@repo/ui/profile`.
- Melacak sesi login aktif: perangkat, browser, OS, alamat IP, waktu interaksi terakhir.
- Menyediakan fungsi pemutusan sesi jarak jauh (*remote session revoke*) dan pencabutan seluruh sesi lain saat terjadi aktivitas mencurigakan.

---

## Rute Publik Tanpa Login

- `/kuitansi/:id` & `/receipt/:id` — Verifikasi keaslian kuitansi pembayaran resmi via QR code.
- `/loa/:registrationNo` — Verifikasi keaslian Surat Penerimaan (LoA) calon santri resmi via QR code.

---

## Acuan Dokumen Repository

| Dokumen | Path | Keterangan |
|---|---|---|
| **System Design & Monorepo** | `README.md` | Arsitektur teknis lengkap (System Design), alur request, database, dan Docker |
| **Sistem Desain UI/UX** | `DESIGN.md` | Panduan desain visual, palet warna, tipografi, token, komponen, dan A4 print |
| Aturan Bisnis & Requirements | `docs/REQUIREMENTS.md` | Spesifikasi aturan bisnis dan logika utama |
| Docker Runbook Lokal | `docs/DOCKER_SETUP.md` | Deployment lokal WSL2 & Docker langkah per langkah |
| Docker Runbook Production | `docs/DOCKER_PRODUCTION.md` | Panduan deployment VPS Ubuntu & Nginx Reverse Proxy |
| Hero 3D Globe | `docs/HERO_3D_GLOBE.md` | Arsitektur Three.js dan optimasi bundle |
| Integrasi Apps Script TIU | `docs/INTEGRASI_TIU_APPS_SCRIPT.md` | Pemasangan Apps Script Google Form TIU |
| Panduan SEB | `docs/PANDUAN_UJIAN_TIU_SEB.md` | Instalasi dan penggunaan Safe Exam Browser |
| Notifikasi WhatsApp | `docs/notifikasi-code-1790904241894.md` | Template dan event notifikasi WhatsApp |
| Skrip & Tooling | `scripts/README.md` | Sinkronisasi Windows-WSL, normalisasi LF, tooling debug |
| Panduan Agent API | `apps/api/AGENTS.md` | Arsitektur backend (FastAPI, Alembic, Pakasir v2, Repositories) |
| Panduan Agent PPDB | `apps/ppdb/AGENTS.md` | Arsitektur frontend PPDB (10 rute tahapan, modal, backoffice) |
| Panduan Agent Superadmin | `apps/superadmin/AGENTS.md` | Arsitektur panel Superadmin |
| Panduan Agent Company Profile | `apps/companyprofile/AGENTS.md` | Arsitektur portal Company Profile & auth cookies |

---

## Aturan Kerja & Konvensi

- **Dynamic branding:** Logo dan favicon diambil dinamis dari API `settingsService.getLogo()` — **jangan** hardcode path logo statis.
- **Secret & Kredensial:** Simpan di file `.env` lokal masing-masing aplikasi. **Jangan pernah** commit file secret ke Git.
- **Git:** Jangan commit atau membuat branch baru kecuali diminta secara eksplisit oleh user.
- **Jenjang:** Jangan menambah field atau logika jenjang pendidikan di mana pun (lihat [Bebas Jenjang Pendidikan](#bebas-jenjang-pendidikan)).
- **Arsip:** Filter lintas periode/gelombang hanya di `/admin/arsip` — jangan spread ke tabel operasional lain.

### Keselarasan Port

| Lingkungan | App | Port |
|---|---|---|
| **Docker Compose** | Company Profile | `:3000` |
| **Docker Compose** | PPDB | `:5173` |
| **Docker Compose** | Superadmin | `:5174` |
| **Docker Compose** | Core API | `:8080` |
| **Docker Compose** | WhatsApp (internal) | `:3100` |
| **Local Vite Dev** | Company Profile | `:3000` |
| **Local Vite Dev** | PPDB | `:5174` |
| **Local Vite Dev** | Superadmin | `:5173` |
| **Local Vite Dev** | Core API | `:8000` |
