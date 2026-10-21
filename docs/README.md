# Indeks Dokumentasi — PPDB & Company Profile Ar-Rahman

Selamat datang di direktori dokumentasi teknis dan operasional **Pesantren Tahfidz Qur'an dan Digital Ar-Rahman**.

---

## 📌 Dokumen Utama Monorepo

| Dokumen | Lokasi | Fokus Utama |
|---|---|---|
| **System Design & Monorepo** | [`../README.md`](../README.md) | **Rancangan Sistem Teknis (System Design)**: Arsitektur monorepo, topologi Docker, request lifecycle, auth cookies HTTP-only, pipeline 10 tahap pendaftar, payment gateway Pakasir v2, Safe Exam Browser (SEB), WhatsApp BullMQ, dan skema database relasional. |
| **Sistem Desain Visual & UI/UX** | [`../DESIGN.md`](../DESIGN.md) | **Desain Antarmuka (UI/UX Design System)**: Filosofi visual Islami & digital, token warna (Ivory, Obsidian, Emerald, Gold), tipografi (Playfair Display, Inter, Amiri), elevasi & bayangan, animasi `.ease-brand-pill`, komponen shared `@repo/ui`, dan standar cetak A4 baku. |
| **Panduan AI Agent** | [`../AGENTS.md`](../AGENTS.md) | Aturan pengkodean AI agent, batasan arsitektur, konvensi repository, dan penjaga integritas bisnis. |

> [!IMPORTANT]
> **Pembedaan Konseptual:**
> - **System Design** terletak di [`README.md`](../README.md) — mencakup arsitektur teknis, database, endpoint, container, dan logika backend.
> - **Design System** terletak di [`DESIGN.md`](../DESIGN.md) — mencakup estetika antarmuka, warna semantik, tipografi, komponen UI, dan pengalaman pengguna.

---

## 📑 Daftar Dokumen Teknis & Panduan (`/docs`)

### 1. Kebutuhan & Logika Bisnis
- **[`REQUIREMENTS.md`](REQUIREMENTS.md)**: Spesifikasi aturan bisnis PPDB (periode tunggal, gelombang tunggal, bebas jenjang, kuota atomik, penutupan otomatis, 10 pertanyaan kuesioner kesehatan, `is_locked`, dan manajemen dossier arsip).

### 2. Infrastruktur & Deployment
- **[`DOCKER_SETUP.md`](DOCKER_SETUP.md)**: Panduan langkah-demi-langkah deployment lokal di lingkungan Windows WSL2 & Docker Compose.
- **[`DOCKER_PRODUCTION.md`](DOCKER_PRODUCTION.md)**: Panduan setup production VPS Ubuntu dengan Nginx Reverse Proxy, SSL Let's Encrypt, firewall, dan keamanan HTTP headers.

### 3. Integrasi Khusus & Fitur
- **[`INTEGRASI_TIU_APPS_SCRIPT.md`](INTEGRASI_TIU_APPS_SCRIPT.md)**: Panduan pemasangan trigger Google Apps Script pada Google Form TIU untuk sinkronisasi nilai otomatis ke endpoint `POST /ppdb/webhook/tiu`.
- **[`PANDUAN_UJIAN_TIU_SEB.md`](PANDUAN_UJIAN_TIU_SEB.md)**: Panduan instalasi dan pengujian Safe Exam Browser (SEB) untuk lingkungan ujian online terkunci.
- **[`HERO_3D_GLOBE.md`](HERO_3D_GLOBE.md)**: Arsitektur kanvas 3D Three.js pada landing page, optimasi render bundle, dan penanganan model procedural/GLB.
- **[`notifikasi-code-1790904241894.md`](notifikasi-code-1790904241894.md)**: Spesifikasi template dan trigger event notifikasi WhatsApp otomatis via BullMQ.
- **[`TIU_AUTO_VERIFICATION_MODAL_PLAN.md`](TIU_AUTO_VERIFICATION_MODAL_PLAN.md)**: Rancangan modal verifikasi otomatis hasil ujian TIU.

---

## 🏛️ Panduan Agent per Aplikasi

- [**apps/api/AGENTS.md**](../apps/api/AGENTS.md): Panduan backend Core API (FastAPI, SQLAlchemy 2.0, Alembic, Pakasir v2, Repositories).
- [**apps/ppdb/AGENTS.md**](../apps/ppdb/AGENTS.md): Panduan portal pendaftar (10 tahap) dan backoffice admin PPDB (React 19 + Vite).
- [**apps/superadmin/AGENTS.md**](../apps/superadmin/AGENTS.md): Panduan panel Superadmin (RBAC, semantic search, user & role audit).
- [**apps/companyprofile/AGENTS.md**](../apps/companyprofile/AGENTS.md): Panduan portal Company Profile publik dan CMS (Next.js 16).
