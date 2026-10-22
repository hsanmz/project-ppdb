# Company Profile - PTDARRAHMAN

Main public website + admin dashboard for Pesantren Tahfidz Qur'an dan Digital Ar-Rahman.

## Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI/Animation**: `lucide-react`, `framer-motion`, `gsap`
- **Security**: `dompurify`
- **Fonts**: `Inter`, `DM_Sans`, `Playfair_Display`, `Amiri` via `next/font/google`
- **Build Tools**: ESLint 9

## Routes
- **Public (`app/(main)/`)**:
  - `/` — Home
  - `/about`, `/news`, `/news/[slug]`, `/programs`, `/programs/[slug]`
  - `/facilities`, `/achievements`, `/gallery`, `/staff`, `/contact`
  - `/ppdb` — PPDB landing page (with 3D hero)
- **Auth**:
  - `/auth/login` — Shared login page
- **Admin (`app/admin/`)**:
  - `/admin/login` — Redirect shim ke `/auth/login`
  - `/admin/overview` — Dashboard overview page (stats + per-section links into `/admin/dashboard`).
  - `/admin/dashboard` — Main CRUD dashboard (15 tabs, supports deep-link `?tab=...`). Tab `hero` mengelola slide hero beranda (`hero-slides`). Grup `PPDB` (jalur/pillars/steps/copy) memakai entitas generik yang sama; `ppdb-copy` singleton (tanpa tombol Buat Baru/Hapus).
  - `/admin/profile` — Profile page for website admin (uses `@repo/ui/profile` with avatar editor, change password, and active device sessions).
  - `/admin` — Redirects to `/admin/overview` if `admin_user` exists in localStorage, else `/auth/login`.

## Visual, Design System & 3D Hero Globe
- **UI/UX Design System:** Rujuk ke [**DESIGN.md**](../../DESIGN.md) untuk sistem token warna (Warm Ivory `#F7F5F0`, Islamic Emerald `#1A6B47`, Regal Gold `#D4A853`), tipografi brand (`Playfair Display`, `DM Sans`, `Amiri`), serta kurva transisi `.ease-brand-pill`.
- **System Design:** Rujuk ke [**README.md**](../../README.md) untuk arsitektur teknis lengkap, alur auth cookies, dan topologi jaringan monorepo.
- **Hero 3D Globe:** Implementation in `components/ui/orbit-delivery-hero.tsx` (Three.js custom canvas) and decorative section waves (`HeroWaveSVG.tsx`, `CTAShapeDivider.tsx`).
- For 3D architecture, model assets in `public/models/`, and procedural vs GLB globe caveats, see [**docs/HERO_3D_GLOBE.md**](../../docs/HERO_3D_GLOBE.md).

## Key Conventions
- **Route Group**: `app/(main)/` contains all public pages wrapped with Navbar and Footer.
- **Layout**: Root `app/layout.tsx` is minimal (sets up `html`, `body`, fonts, and `Providers`).
- **Error Pages**: Custom `error.tsx`, `not-found.tsx`, and `global-error.tsx`.
- **Path Alias**: All imports use the `@/...` path alias (e.g., `@/app/...`).
- **Menu Program (Navbar & Footer)**: Isi dropdown "Program" TIDAK boleh di-hardcode. `app/(main)/layout.tsx` mengambil `getProgramsCached()` lalu meneruskannya sebagai prop `programs` ke `<Navbar>`/`<Footer>`, yang merender `programMenuLinks()` (label = judul program, tautan = `/programs/{slug}`). Daftar bawaan di `app/lib/programs.ts` hanya dipakai sebagai cadangan saat API kosong/gagal. Tambah/ubah/hapus program di backoffice langsung mengubah menu (fetch di-cache 60 detik). Urutan menu & daftar program mengikuti kolom `order` (field "Urutan Tampilan" di tab Program, ASC) — migrasi `0044`; tanpa kolom itu urutannya mengikuti PK UUID (acak).
- **Halaman Detail Program (`/programs/[slug]`)**: Hero menampilkan judul, tagline, breadcrumb, dan chip Durasi/Tingkat — keduanya hanya sekali di sini, jangan diulang di kolom isi. Sidebar memuat CTA ("Daftar Sekarang"/"Ajukan Pertanyaan") dan daftar "Program Lainnya" yang dibangun `siblingProgramLinks(programs, currentSlug)` (semua program selain yang dibuka; tanpa daftar cadangan bawaan supaya tidak menautkan halaman yang sedang dibuka). `page.tsx` mengambil daftar sekali via `getProgramsCached()` lalu memakai `fallbackPrograms()` bila CMS kosong/gagal. Kartu isi (Keunggulan/Kurikulum/Hasil) memakai `sm:grid-cols-2 xl:grid-cols-3` agar daftar 3 item rapi dalam satu baris di desktop, dan paragraf "Gambaran Program" dibatasi `max-w-prose`.

## Backend & API
- **Backend Architecture**: FastAPI monolithic backend (located in `../api/`).
- **API Client**: Handled centrally in `app/lib/api.ts` with fallback mechanisms (`fetchWithFallback`).
- **Public API**: Fetched via `GET /companyprofile/{table}`.
- **Admin CRUD**: Managed via `POST/PUT/DELETE /companyprofile/{table}[/{id}]`.
- **Auth Flow**: Login at `POST /companyprofile/auth/login`.
  - **Cookie-Based Auth**: Tokens are stored in secure HTTP-only cookies (`access_token`, `refresh_token`), sent via `credentials: 'include'`.
  - Keys in `localStorage`: Only `admin_user` (JSON profile) is stored in localStorage. Tokens are NOT stored in localStorage.
  - Token refresh logic is built into the API client (`tryRefresh` via `POST /companyprofile/auth/refresh`).
- **Real-time**: `useSSE.ts` uses `EventSource` to subscribe to `/companyprofile/events` (Server-Side Events from FastAPI).

## Admin Dashboard
- **11 CRUD Tabs**: hero, news, programs, facilities, staff, achievements, gallery, testimonials, social, contact, and settings.
- **File Uploads**: Files are uploaded via `/companyprofile/upload` (forwarded to Cloudinary by backend).

### ATURAN WAJIB: Access Control & Permissions
- Access levels for modules follow the hierarchy: `none` < `dashboard` < `read` < `crud`.
- Users with `user_type === 'superadmin'` or `permissions.companyprofile === 'crud'` can create, edit, and delete.
- User data (`admin_user`) is retrieved from `localStorage` (populated at login) or via `api.getMe()`.
- Buttons (Create/Edit/Delete), "Aksi" columns, and forms must check this permission before rendering or allowing edits. Forms should be read-only if the user lacks `crud` access.
- Backend enforces permissions; frontend hiding is just for UX.

## Hooks & Contexts
- `useFocusTrap(open, onClose?)` — Focus trap for modals (Escape key, `role=dialog`).
- `useSSE()` — Subscribe to real-time content changes.
- `useRealtimeData()` — Fetch initial data and sync updates via SSE.
- `useScrollAnimations()` & `useTiltEffect()` — UI interactions and animations.
- `Providers` (in `app/context/Providers.tsx`) — Pass-through wrapper (renders `{children}` with no contexts; kept as an extension point).

## Components
- `AdminConfirm` — Reusable confirmation dialog.
- `AdminToast` — Toast notifications for admin actions.
- `ProfileModal` / `ProfileDropdown` — Manage user profile (username, email, password, avatar).
- `CrossTabSync` — Syncs state (like auth logout) across browser tabs.
- `EmptyState` — Renders empty fallback UI for admin tables.

## Build & Deployment
- `npm run dev` — Local development (port 3000)
- `npm run lint` — ESLint 9 with `--cache`
- `npm run build` — Standard Next.js build
