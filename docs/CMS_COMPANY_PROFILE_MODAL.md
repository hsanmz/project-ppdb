# Dokumentasi Modal & Form CMS Company Profile

Dokumen ini memuat **setiap modal (dialog) dan permukaan input** pada CMS Company Profile (`apps/companyprofile`), lengkap dengan daftar kolom input, tempat disimpan, dan alur penggunaan dari buka sampai tersimpan.

Sumber kebenaran:
- `apps/companyprofile/app/admin/dashboard/_constants.ts` (definisi field per tab)
- `apps/companyprofile/app/admin/dashboard/CrudFormDialog.tsx` (modal CRUD generik)
- `apps/companyprofile/app/admin/dashboard/page.tsx` (orkestrasi buka/simpan/hapus)
- `apps/companyprofile/app/admin/dashboard/SettingsEditor.tsx`, `ContactEditor.tsx`
- `apps/companyprofile/app/components/ProfileModal.tsx`
- `apps/api/src/modules/companyprofile/schemas.py` (whitelist & validasi backend)

---

## 1. Peta Lokasi Form

| # | Form | Jenis | Dipicu dari | Catatan |
|---|------|-------|-------------|---------|
| 1 | **Modal CRUD** (`CrudFormDialog`) | Modal (Radix Dialog) | Tombol **Buat Baru** & **Edit** di `/admin/dashboard` | 1 modal generik, 13 tab |
| 2 | **Edit Info Kontak** (`ContactEditor`) | Kartu (bukan modal) | Tab **Info Kontak** | Tab `contact` tidak memakai modal CRUD |
| 3 | **Pengaturan** (`SettingsEditor`) | Kartu (bukan modal) | Tab **Pengaturan** | Tab `settings` tidak memakai modal CRUD |
| 4 | **Profile Admin** (`ProfileModal`) | Modal | Klik avatar/nama di header dashboard | Dipakai semua role |
| 5 | **Konfirmasi Hapus** (`AdminConfirm`) | Modal | Tombol **Hapus** di tabel | `variant: danger`, teks hardcoded |

> **Catatan:** Tab `contact` dan `settings` sengaja dikecualikan dari modal CRUD — keduanya memakai editor kartu tersendiri. Definisi kolom editor Kontak (`CONTACT_FIELDS`) diletakkan di `_constants.ts` sebagai satu-satunya sumber kebenaran, dan dipakai oleh `ContactEditor.tsx`.

---

## 2. Alur Umum (Pola yang Sama di Semua Tab)

```
[Login] → /admin/dashboard → pilih tab
   │
   ├─► "Buat Baru"  → openCreate()  → form kosong → modal CRUD (mode=create)
   │                                      └─ Simpan → POST /companyprofile/{endpoint}
   │
   ├─► "Edit"       → openEdit(item) → GET detail penuh (wajib!)
   │                 │                 ├─ gagal  → toast error, modal TIDAK dibuka
   │                 │                 └─ sukses → form terisi → modal CRUD (mode=edit)
   │                                      └─ Simpan → PUT /companyprofile/{endpoint}/{id}
   │
   └─► "Hapus"      → AdminConfirm → konfirmasi → DELETE /companyprofile/{endpoint}/{id}
```

### 2.1 Aturan wajib pada "Edit" (anti-kehilangan-data)

`GET /companyprofile/{entity}` **sengaja membuang `content.content` dan mengosongkan `gallery`** supaya list publik tetap ringan. Jika form edit diisi langsung dari baris tabel lalu disimpan, isi artikel dan galeri akan **terhapus permanen**.

 protections yang berjalan:
1. `openEdit()` selalu memanggil `api.getEntityDetail()` lebih dulu. Bila gagal → toast error dan **form tidak dibuka sama sekali**.
2. `CrudFormDialog.handleSave()` memblokir penyimpanan bila `mode === 'edit'` dan `editingItem.content` kosong (tab yang punya `content`).
3. Tombol Edit menampilkan spinner selama detail dimuat (`detailLoading`).

### 2.2 Alur Simpan

```
handleSave()
 1. Guard: edit + content kosong → toast error, stop
 2. Kumpulkan payload kolom tabel dari FORM_FIELDS
      - number  → wajib diisi; bila kosong → tandai kolom + fokus + stop
      - required→ kosong → tandai kolom + fokus + stop
 3. Tentukan apakah kirim kolom `image`
      - social  → tidak
      - lainnya → ya (boleh kosong → "")
 4. news: payload.gallery = JSON.stringify(array URL)
 5. Tab punya `content`: payload.content = JSON.stringify(buildContent())
 6. Dispatch API:
      - mode edit        → api.updateItem(`${endpoint}/${id}`, payload)
      - mode create      → api.createItem(endpoint, payload)
 7. Tutup modal → onSaved() (refetch) → toast sukses
```

### 2.3 Apa yang terjadi pada kolom `content`

Semua field di seksi **Detail Konten** disimpan sebagai satu objek JSON pada kolom `content` (tipe `Text` di DB). Aturan penyusunannya (`buildContent()`):

| Tipe field | Cara disimpan |
|------------|---------------|
| `text` / `textarea` | Disimpan apa adanya (string) |
| `list` | Dipecah per baris (`\n`), dibersihkan (trim), baris kosong dibuang → array string |
| `number` | `Number(raw)`; kosong → `undefined` (key dihapus saat serialize) |
| `parent` | Disimpan sebagai string ID; kosong → key **dihapus** dari `content` |

Pada mode **edit**, objek `content` lama di-*spread* di awal, lalu field yang ada di form ditimpa. Artinya field `content` yang tidak ada di `CONTENT_FIELDS` tetap aman (tidak terhapus).

### 2.4 Upload Gambar

- Semua upload memakai `api.uploadImage(file)` → `POST /companyprofile/upload` (backend meneruskan ke Cloudinary).
- Setelah URL diperoleh, URL **tidak langsung disimpan**. Admin tetap harus menekan **Simpan**. Notifikasi upload sudah memperjelas hal ini (lihat §11.1).
- Galeri: setiap file ditambahkan ke array; URL yang diketik manual ditambahkan lewat tombol **+**.

### 2.5 Validasi

**Frontend (modal CRUD)**

| Aturan | Sumber |
|--------|--------|
| Field `number` di Informasi Utama wajib diisi | `CrudFormDialog.handleSave()` |
| Field `required` (hanya `date` pada Berita) wajib diisi | idem |
| Panjang maksimum per kolom tabel (slug 255, category/role 100, dst.) | `FIELD_MAX_LENGTHS` → `maxLengthFor()` |
| Textarea kolom tabel dibatasi 10.000 karakter | `maxLength={10000}` |

**Backend (`apps/api/src/modules/companyprofile/schemas.py`)**

| Lapisan | Aturan |
|---------|--------|
| Whitelist kolom | Key di luar whitelist entitas → **422** "Unknown fields for ..." |
| Required (create only) | `news`: slug+category, `programs`: slug, `facilities`: category, `staff`: role, `achievements`: year, `gallery`: category, `social-links`: label+href+path, `testimonials`: name+child, `hero-slides`: content |
| Tipe | Kolom `INT_COLUMNS` dikoersi ke int (error bila bukan angka) |
| Slug | Dinormalisasi (lowercase, non-alnum → `-`), wajib unik, minimal punya satu huruf/angka |
| Tanggal berita | Dinormalisasi ke `YYYY-MM-DD` |
| Panjang | Diukur terhadap lebar kolom DB; teks bebas dibatasi 500.000 karakter |
| Default saat create | `order` = 0 untuk programs, testimonials, hero-slides |
| Urutan list | `hero-slides`, `programs`, `testimonials` → `ORDER BY order ASC`. Entitas PPDB & `staff` tidak punya kolom `order`, jadi urutannya diurus di sisi klien |

---

## 3. Struktur Modal CRUD

```
┌───────────────────────────────────────────────┐
│ HEADER  [Ikon Tab] Tambah Data / Ubah Data    │  ← judul tab, tombol X kanan atas
│          (nama tab)                           │
├───────────────────────────────────────────────┤
│ BODY (scroll)                                 │
│  ▸ Detail Konten   (bila tab punya content)  │
│  ▸ Gambar Utama    (bila tab punya kolom img) │
│  ▸ Galeri          (khusus tab Berita)       │
│  ▸ Informasi Utama (kolom tabel non-content)  │
├───────────────────────────────────────────────┤
│ FOOTER  "* Wajib diisi"   [Batal] [Simpan]     │
└───────────────────────────────────────────────┘
```

- Lebar `max-w-2xl`, tinggi maksimum `92vh`, body bisa di-scroll (`modal-scroll`).
- Latar body dikunci (`document.body.style.overflow = 'hidden'`) selama modal terbuka.
- Grid 2 kolom; field `textarea`/`list`/`parent` selalu membentang penuh. `computeSpans()` memastikan tidak ada baris setengah kosong (field pendek berjumlah ganjil → field terakhir dibuat penuh).
- Semua input fokus memakai ring emerald + latar putih.

### 3.1 Rendering per tipe field

| Tipe | Komponen | Perilaku |
|------|----------|----------|
| `text` | `Input type="text"` | Maks. panjang mengikuti `FIELD_MAX_LENGTHS` (khusus kolom tabel) |
| `textarea` | `Textarea` | Baris 5 (di Detail Konten) / 4 (di Informasi Utama, maks 10.000 karakter) |
| `list` | `Textarea` | Baris 4; 1 item per baris; disimpan sebagai array |
| `number` | `Input type="number"` | Di Informasi Utama: wajib diisi |
| `date` | `Input type="date"` | Native date picker; wajib diisi pada Berita |
| `parent` | `<select>` | Hanya untuk `staff.parentId`; opsi diambil dari daftar staff, kecuali diri sendiri |

---

## 4. Daftar Kolom Input per Tab (Modal CRUD)

> **Detail Konten** = kolom di dalam JSON `content`. **Informasi Utama** = kolom tabel di database.
> Kolom dengan tanda ⚠️ = wajib diisi saat create (divalidasi backend).

### 4.0 Di mana nilai "Urutan Tampilan" disimpan

Tidak seragam, mengikuti skema tabel masing-masing entitas:

| Sumber | Entitas | Diurutkan oleh | Form |
|--------|---------|----------------|------|
| Kolom `order` di DB | `hero-slides`, `programs`, `testimonials` | Backend — `ORDER BY order ASC` saat list endpoint | Kolom tabel → seksi **Informasi Utama** |
| JSON `content.order` | `staff` | Klien — backend tidak bisa (`ORDER BY` kolom JSON tidak portabel), tabel dashboard mengurutkan sendiri lewat `sortRowsByOrder()` | Kolom konten → seksi **Detail Konten** |

Konsekuensi praktis:
- Entitas berkolom `order`: nilai dikirim sebagai kolom tabel.
- Entitas berbasis `content`: tabel `staff` memang tidak punya kolom `order` di DB, jadi nilainya hidup di dalam JSON `content`.
- Sumber ini dideklarasikan sekali di `ORDER_SOURCE` (`_constants.ts`) supaya frontend dan dokumentasi tidak berbeda pendapat.

### 4.1 `hero` — Hero Beranda (`/hero-slides`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Detail Konten | Label Kecil (badge) | text | `content.label` | Badge di atas judul slide |
| Detail Konten | Judul Slide | textarea | `content.title` | |
| Detail Konten | Subjudul | textarea | `content.subtitle` | |
| Detail Konten | Label Tombol | text | `content.button_label` | |
| Detail Konten | Tautan Tombol | text | `content.button_href` | Mis. `/ppdb` |
| Gambar Utama | Gambar | upload / URL | `image` | Latar slide beranda |
| Informasi Utama | Urutan Tampilan | number | `order` | Wajib diisi; default 0 saat create |

> Migrasi `0045` menyemai 3 slide hero bawaan (`heroslide-1..3`) dengan urutan 1–3. Panitia bebas mengganti, menambah, atau menghapus slide tersebut lewat tab ini.

### 4.2 `news` — Berita (`/news`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Detail Konten | Judul Berita | text | `content.title` | |
| Detail Konten | Ringkasan | textarea | `content.excerpt` | Ringkasan di kartu list |
| Detail Konten | Isi Berita | textarea | `content.content` | Body artikel, dibersihkan `dompurify` saat render publik |
| Detail Konten | Penulis | text | `content.author` | |
| Gambar Utama | Gambar | upload / URL | `image` | Gambar sampul |
| Galeri | Daftar URL | upload / URL + `+` | `gallery` (JSON array) | Grid thumbnail; hapus per gambar |
| Informasi Utama | Slug | text | `slug` | ⚠️ Wajib; dinormalisasi backend; dipakai URL `/news/{slug}` |
| Informasi Utama | Kategori | text | `category` | ⚠️ Wajib; maks 100 karakter |
| Informasi Utama | Tanggal | date | `date` | **Wajib diisi di form** (backend tidak mewajibkan); format `YYYY-MM-DD` |

### 4.3 `programs` — Program (`/programs`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Detail Konten | Judul Program | text | `content.title` | |
| Detail Konten | Tagline | text | `content.tagline` | |
| Detail Konten | Deskripsi | textarea | `content.desc` | Batas "Gambaran Program" di halaman detail |
| Detail Konten | Durasi | text | `content.duration` | Chip di hero halaman detail |
| Detail Konten | Tingkat | text | `content.level` | Chip di hero halaman detail |
| Detail Konten | Keunggulan (1 per baris) | list | `content.highlights` | |
| Detail Konten | Kurikulum (1 per baris) | list | `content.curriculum` | |
| Detail Konten | Hasil (1 per baris) | list | `content.outcomes` | |
| Gambar Utama | Gambar | upload / URL | `image` | |
| Informasi Utama | Slug | text | `slug` | ⚠️ Wajib; URL `/programs/{slug}`; **menentukan urutan menu Navbar/Footer** |
| Informasi Utama | Ikon | text | `icon` | Nama ikon lucide |
| Informasi Utama | Urutan Tampilan | number | `order` | Wajib diisi; kolom DB; urutan menu & daftar program (ASC) |

### 4.4 `facilities` — Fasilitas (`/facilities`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Detail Konten | Nama Fasilitas | text | `content.name` | |
| Detail Konten | Deskripsi | textarea | `content.desc` | |
| Detail Konten | Fitur (1 per baris) | list | `content.features` | |
| Gambar Utama | Gambar | upload / URL | `image` | |
| Informasi Utama | Kategori | text | `category` | ⚠️ Wajib; maks 100 karakter |

### 4.5 `staff` — Staff (`/staff`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Detail Konten | Nama Staff | text | `content.name` | |
| Detail Konten | Jabatan | text | `content.position` | |
| Detail Konten | Biografi | textarea | `content.bio` | |
| Detail Konten | Keahlian (1 per baris) | list | `content.expertise` | |
| Detail Konten | Atasan | select | `content.parentId` | Kosong = posisi puncak; opsi = staff lain (kecuali diri sendiri) |
| Detail Konten | Urutan Tampilan | number | `content.order` | |
| Gambar Utama | Foto | upload / URL | `image` | |
| Informasi Utama | Peran (leader / teacher) | text | `role` | ⚠️ Wajib; maks 100 karakter |

> Tab ini juga menampilkan **Struktur Organisasi** (`StaffOrgChart`) di atas tabel; klik kartu staff untuk membuka form edit yang sama.

### 4.6 `achievements` — Prestasi (`/achievements`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Detail Konten | Judul Prestasi | text | `content.title` | |
| Detail Konten | Deskripsi | text | `content.desc` | |
| Detail Konten | Lingkup | text | `content.scope` | |
| Gambar Utama | Gambar | upload / URL | `image` | |
| Informasi Utama | Tahun | number | `year` | ⚠️ Wajib; badge emas di tabel |

### 4.7 `gallery` — Galeri (`/gallery`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Detail Konten | Judul Gambar | text | `content.title` | |
| Detail Konten | Deskripsi Gambar | textarea | `content.desc` | |
| Gambar Utama | Gambar | upload / URL | `image` | Satu-satunya media galeri (tab ini tidak punya seksi Galeri) |
| Informasi Utama | Kategori | text | `category` | ⚠️ Wajib; maks 100 karakter |

### 4.8 `testimonials` — Testimoni (`/testimonials`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Detail Konten | Kutipan Testimoni | textarea | `content.quote` | |
| Gambar Utama | Foto | upload / URL | `image` | |
| Informasi Utama | Nama | text | `name` | ⚠️ Wajib; maks 255 karakter |
| Informasi Utama | Anak | text | `child` | ⚠️ Wajib; maks 255 karakter |
| Informasi Utama | Urutan Tampilan | number | `order` | Wajib diisi; default 0 saat create; list diurutkan `order` ASC |

### 4.9 `social` — Tautan Sosial (`/social-links`)

| Seksi | Kolom | Tipe | Simpan ke | Catatan |
|-------|-------|------|-----------|---------|
| Informasi Utama | Label | text | `label` | ⚠️ Wajib; maks 255 karakter |
| Informasi Utama | URL | text | `href` | ⚠️ Wajib; maks 255 karakter |
| Informasi Utama | SVG Path | textarea | `path` | ⚠️ Wajib; **ada pemilih preset** (Instagram, YouTube, WhatsApp, LinkedIn, Facebook, X, TikTok, Telegram, Discord, GitHub, Globe, Email) + textarea bebas untuk ikon custom |

> Tab `social` **tidak punya** seksi Detail Konten maupun Gambar Utama, dan field `image` tidak pernah dikirim.

> **Catatan:** Konten halaman publik `/ppdb` (Jalur Pendaftaran, Pilar Kurikulum, Alur PPDB, Teks & CTA) **tidak lagi dikelola dari CMS** — sejak migrasi `0047` seluruh konten itu statis di `apps/companyprofile/app/lib/ppdbContent.ts`, dan tab `ppdb-*` beserta entitas/tabelnya sudah dihapus.

---

## 5. Edit Info Kontak (Tab `contact`) — Kartu, Bukan Modal

Berisi di `ContactEditor.tsx`, menggantikan modal CRUD untuk tab `contact`. Definisi kolom ada di `CONTACT_FIELDS` (`_constants.ts`).

| Kolom | Tipe input | Simpan ke | Catatan |
|-------|-----------|-----------|---------|
| Telepon Utama | `tel` (inputMode numeric) | `phone_primary` | |
| Telepon Kedua | `tel` (inputMode numeric) | `phone_secondary` | |
| WhatsApp | `tel` (inputMode numeric) | `whatsapp` | |
| Email Utama | text | `email_primary` | |
| Email Penerimaan (PPDB) | text | `email_admission` | |
| Jam Operasional Kantor | text | `office_hours` | |
| Alamat Lengkap | textarea (3 baris) | `address` | |
| Kode Embed Google Maps | textarea (3 baris) | `maps_embed` | Isi `<iframe …>` atau URL |

**Alur:** ubah field → **Simpan Perubahan** → `api.updateContactInfo()` → toast sukses → `onSave()` (refetch). Tidak ada upload gambar di form ini.

---

## 6. Pengaturan (Tab `settings`) — Kartu per Setting, Bukan Modal

`SettingsEditor.tsx` merender **satu kartu per setting**, masing-masing punya tombol **Simpan** sendiri (menyimpan satu key, bukan semua sekaligus).

| Kolom | Tipe input | Key | Keteranean |
|-------|-----------|-----|-----------|
| Deskripsi Situs | textarea | `site_description` | Metadata SEO |
| Logo | url + upload | `logo` | Wajib URL absolut http/https; **ditolak** jika diawali `API_BASE` |
| Favicon | url + upload | `favicon` | 32×32 atau 16×16 px; aturan URL sama seperti Logo |
| Email Tujuan | email | `to_email` | Tujuan pesan form kontak |
| Pesan WhatsApp | textarea | `whatsapp_message` | Pesan default tombol chat WA |
| Teks Siapa Kami (Beranda) | textarea | `about_text` | Paragraf pengantar seksi About di beranda |
| Gambar About 1 | url + upload | `about_img_1` | Foto kiri atas (rasio 3:4) |
| Gambar About 2 | url + upload | `about_img_2` | Foto kiri bawah (rasio 4:3) |
| Gambar About 3 | url + upload | `about_img_3` | Foto kanan atas (rasio 4:3) |
| Gambar About 4 | url + upload | `about_img_4` | Foto kanan bawah (rasio 3:4) |
| Jumlah Santri (Statistik) | text | `stat_students` | Target angka santri aktif |
| Jumlah Guru (Statistik) | text | `stat_staff` | Target angka guru & staff |
| Target Juz (Statistik) | text | `stat_juz` | Target angka hafalan juz |
| Jumlah Ekstrakurikuler | text | `stat_extracurricular` | Target angka ekstrakurikuler |

**Perilaku:**
- Nilai awal = `DEFAULT_SETTING_VALUES`, ditimpa oleh data dari API.
- Card gambar menampilkan pratinjau 64×64 (`next/image`, `unoptimized`).
- Tombol **Upload Gambar** langsung mengunggah lalu **langsung menyimpan** key tersebut (tidak perlu menekan Simpan).
- Tombol **Reset** menghapus nilai key (set string kosong) lalu menyimpan.
- Validasi khusus `logo` & `favicon`: URL harus absolut `http/https` dan **bukan** URL API.
- Nilai form disinkronkan ulang saat prop `settings` berubah (pola render-phase), sehingga perubahan dari tab/tab lain yang masuk lewat SSE (`useSSE('companyprofile')`) langsung terlihat.

---

## 7. Profile Admin (`ProfileModal`)

| Bagian | Kolom | Tipe | Keteranaan |
|--------|-------|------|-----------|
| Avatar | Avatar | upload / URL | Upload → `api.uploadImage()`; URL → input `type="url"`, maks 2048 karakter |
| Avatar | URL Avatar (pratinjau) | text | Hanya ditampilkan bila URL lolos validasi |
| Identitas | Username | text | **Wajib**, maks 100 karakter |
| Identitas | Nama Lengkap | text | **Wajib**, maks 255 karakter |
| Identitas | Email | email | Maks 255 karakter; **read-only kecuali superadmin** |
| Password | Password Lama | password | `autoComplete="current-password"`, maks 128 karakter |
| Password | Password Baru | password | `autoComplete="new-password"`, maks 128 karakter |
| Password | Konfirmasi Password Baru | password | `autoComplete="new-password"`, maks 128 karakter |

**Validasi domain avatar** (hanya `https:`, dan hostname harus salah satu dari):
`dkynlzmpwndadmbqokry.supabase.co`, `supabase.co`, `res.cloudinary.com`, `images.unsplash.com`.
URL di luar daftar → pratinjau menampilkan badge **"Invalid"** dan avatar tidak dirender.

**Alur simpan:**
1. Cek `username` & `full_name` terisi → jika tidak, kolom ditandai merah + fokus ke kolom pertama + toast ringkasan.
2. Cek `new_password === confirm_password` → jika tidak, kolom konfirmasi ditandai.3. `api.updateProfile(data)` — `old_password`+`new_password` hanya dikirim bila keduanya terisi.
4. `api.getMe()` → tulis ulang `localStorage.admin_user`.
5. Toast sukses → modal ditutup.

> Password tidak pernah disimpan di `localStorage`; token tetap di HTTP-only cookie.
> Menutup modal yang isinya sudah diubah akan memunculkan konfirmasi "Perubahan belum disimpan" — jadi password yang sudah diketik tidak hilang diam-diam (lihat §11.3).

---

## 8. Konfirmasi Hapus (`AdminConfirm`)

Modal konfirmasi generik dengan konfigurasi:

| Parameter | Nilai pada tombol Hapus |
|-----------|------------------------|
| `title` | "Hapus {Nama Tab}" — mis. "Hapus Berita" |
| `message` | `Yakin ingin menghapus "{judul item}"? Tindakan ini tidak bisa dibatalkan.` |
| `confirmLabel` | "Ya, Hapus" |
| `cancelLabel` | "Batal" |
| `variant` | `danger` |

Nama item diambil dari kolom utama tabel (`title`), dengan fallback ke `slug`/`name`. Tujuannya: di tabel 25 baris, admin bisa memastikan item yang akan dihapus memang yang dimaksud.

**Alur:** klik Hapus → `await confirm(...)` → bila `true` → `handleDelete(item)` → `DELETE /companyprofile/{endpoint}/{id}` → refetch tabel → toast "Berhasil dihapus".

---

## 9. Kontrol Akses (berlaku untuk semua form)

| Level | Hak |
|-------|-----|
| `none` | Tab tidak terlihat |
| `dashboard` | Tab terlihat, form read-only |
| `read` | Tab terlihat, form read-only |
| `crud` | Tab terlihat + tombol Buat Baru / Edit / Hapus aktif |

- `canCrud = user_type === 'superadmin' || permissions.companyprofile === 'crud'`.
- Kolom **Aksi** di tabel hanya dirender jika `canCrud`.
- Tanpa `crud`, `SettingsEditor` & `ContactEditor` menonaktifkan seluruh input dan menyembunyikan tombol simpan.
- Tab yang terlihat juga difilter oleh `page_permissions` (SSE `page_permissions_changed`).
- Backend tetap menjadi pemegang keputusan; menyembunyikan tombol di frontend hanya untuk UX.

---

## 10. Referensi Cepat Endpoint

| Aksi | Endpoint |
|------|----------|
| List (paginasi 25) | `GET /companyprofile/{entity}?skip={offset}&limit={n}` |
| Detail penuh | `GET /companyprofile/{entity}/{slug\|id}` |
| Create | `POST /companyprofile/{entity}` |
| Update | `PUT /companyprofile/{entity}/{id}` |
| Delete | `DELETE /companyprofile/{entity}/{id}` |
| Upload media | `POST /companyprofile/upload` (multipart `file`) |
| Info kontak | `GET /companyprofile/contact-info` · `PUT /companyprofile/contact-info` |
| Pengaturan (daftar) | `GET /companyprofile/settings-admin` |
| Pengaturan (satu key) | `GET/PUT /companyprofile/settings/{key}` (body: `{ "value": "..." }`) |
| Profil admin | `GET /companyprofile/auth/me` · `PUT /companyprofile/auth/profile` |
| Auth | `POST /companyprofile/auth/login` · `/auth/refresh` · `/auth/logout` |

Entity: `hero-slides`, `news`, `programs`, `facilities`, `staff`, `achievements`, `gallery`, `testimonials`, `social-links`, `contact-info`, `settings`.

---

## 11. Notifikasi & Umpan Balik

Semua aksi admin yang mengubah data menghasilkan umpan balik. Mekanismenya: `toast(type, pesan)` → `eventBus` → `<AdminToast />` (dipasang di `page.tsx` dan `admin/overview/page.tsx`).

### 11.1 Peta toast

| Aksi | Jenis | Pesan |
|------|-------|-------|
| Simpan form (create) | success | "Berhasil dibuat" |
| Simpan form (edit) | success | "Berhasil disimpan" |
| Hapus item | success | "Berhasil dihapus" |
| Upload gambar utama | success | "Gambar diunggah — tekan Simpan untuk menyimpan" |
| Upload gambar galeri | success | "Gambar ditambahkan ke galeri — tekan Simpan untuk menyimpan" |
| Upload avatar | success | "Avatar diunggah — tekan Simpan untuk menyimpan" |
| Simpan pengaturan | success | "Pengaturan disimpan" / "{label} direset" / "{label} berhasil diupload" |
| Simpan info kontak | success | "Info kontak berhasil disimpan" |
| Simpan profil | success | "Profil berhasil disimpan" |
| Validasi kolom kosong | error | "Periksa lagi kolom yang ditandai merah." |
| Error backend / jaringan | error | Pesan dari API (`errorMessage`) |

> Pesan upload sengaja menyebut "tekan Simpan": upload hanya menaruh file di storage, **data baru tersimpan** saat tombol Simpan ditekan. Kalimat "berhasil diunggah" saja membuat admin mengira datanya sudah aman.

### 11.2 Validasi per kolom

Kolom yang kosong atau tidak valid **ditandai langsung di form** — bukan hanya lewat toast:

- Kolom mendapat border merah (`border-destructive`), pesan error di bawahnya, dan `aria-invalid="true"`.
- Error hilang otomatis begitu admin mulai mengisi kolom itu lagi.
- Fokus otomatis diarahkan ke **kolom pertama** yang bermasalah, jadi admin tidak perlu mencari sendiri.
- Semua kolom bermasalah ditandai sekaligus (bukan berhenti di error pertama).

### 11.3 Proteksi perubahan belum disimpan

Form yang sudah diubah **tidak bisa ditutup diam-diam**:

- Escape, tombol X, klik area gelap, maupun tombol **Batal** → muncul konfirmasi "Perubahan belum disimpan" dengan tombol **Buang Perubahan** / **Kembali ke Form**.
- Di footer modal ada penanda **"Perubahan belum disimpan"** selama form berbeda dari nilai awal.
- Berlaku untuk `CrudFormDialog` (semua tab) dan `ProfileModal` — yang terakhir penting karena admin bisa kehilangan password yang sudah diketik.
- Form yang belum disentuh ditutup tanpa konfirmasi (tidak mengganggu alur normal).

Deteksi dirty memakai `isFormDirty()` (`app/lib/form-dirty.ts`): nilai dibandingkan per kunci, `undefined` disamakan dengan string kosong, array dibandingkan isinya.

### 11.4 Aksesibilitas

| Aspek | Implementasi |
|-------|--------------|
| Notifikasi ke screen reader | Kontainer toast memakai `role="status"` + `aria-live="polite"` dan **selalu ada di DOM** (live region harus terpasang sebelum isinya masuk, kalau tidak pengumuman bisa terlewat) |
| Error diumumkan segera | Toast error memakai `role="alert"` (assertive) |
| Label terhubung ke input | Setiap kolom punya `id` + `htmlFor`, sehingga dapat dicari/difokuskan oleh screen reader dan<& oleh test |
| Fokus keyboard | `useFocusTrap` pada dialog konfirmasi; fokus otomatis ke kolom error |

### 11.5 Indikator lain

| Indikator | Arti |
|-----------|-------|
| Spinner + "Menyimpan…" pada tombol Simpan | Permintaan sedang diproses, tombol tidak bisa diklik dua kali |
| Spinner + "Mengunggah…" | File sedang diunggah |
| "Belum disimpan" (amber) di footer | Isi form berbeda dari data tersimpan |
| Badge merah + pesan di bawah kolom | Kolom wajib diisi masih kosong |
| Toast "Periksa lagi kolom yang ditandai merah." | Ringkasan validasi di pojok layar (aman untuk yang tidak melihat marka merah) |

---

## 12. Checklist Admin Saat Mengisi Modal

1. **Slug** (Berita/Program): gunakan huruf kecil + tanda hubung; akan dinormalisasi backend dan menjadi URL publik.
2. **Tanggal Berita**: wajib diisi, format `YYYY-MM-DD`.
3. **Angka** (Tahun, Urutan): wajib diisi — kolom kosong akan ditolak saat Simpan. Lihat §4.0 untuk letak penyimpanan "Urutan Tampilan" tiap entitas.
4. **Kategori / Peran**: maksimal 100 karakter.
5. **Liste** (Keunggulan, Kurikulum, Fitur, dst.): 1 item per baris, tanpa baris kosong.
6. **Gambar**: setelah upload, tekan **Simpan** — upload saja belum menyimpan data (indikator amber "Perubahan belum disimpan" di footer menandainya).
7. **Galeri Berita**: setiap gambar ditambahkan satu per satu lewat tombol `+`.
8. **Ikon**: gunakan nama ikon lucide yang valid (contoh: `Award`, `Target`, `BookOpen`).
9. **Warna Aksen** Jalur PPDB: salah satu dari `emerald`, `amber`, `sky`, `violet`, `rose`, `teal`.
10. **Teks Hero PPDB**: baris terakhir `hero_title` otomatis diberi warna aksen; pisahkan poin unggulan dengan `|`.
11. **Logo & Favicon**: gunakan URL gambar absolut (http/https), bukan URL API.
12. Setelah Simpan, data langsung tayang di situs publik dan tersinkron ke tab lain melalui SSE.
