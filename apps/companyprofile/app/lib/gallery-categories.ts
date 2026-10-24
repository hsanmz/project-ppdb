/**
 * Konfigurasi kategori galeri (satu-satunya sumber kebenaran).
 *
 * Kolom `category` galeri menyimpan string teks (kolom `String(100)` — lihat
 * `GalleryItem` di `apps/api/src/models/content.py`). Nilai opsi memakai
 * teks label yang sama sehingga yang tersimpan langsung terbaca manusia di
 * halaman publik maupun tabel admin, tanpa mapping tersembunyi.
 *
 * Aturan kompatibilitas:
 * - Nilai lama yang tidak ada di daftar ini TIDAK diubah atau dibuang;
 *   ia tetap tampil sebagai "Kustom" dan bisa diedit ke kategori standar.
 * - "Lainnya" membuka input khusus; kategori kustom disimpan apa adanya.
 *
 * Jangan menyebar daftar kategori ke file lain — tambah/ubah di sini saja.
 */

export interface GalleryCategoryOption {
  value: string
  label: string
}

export const GALLERY_CATEGORY_OTHER = 'Lainnya'

export const GALLERY_CATEGORY_OPTIONS: GalleryCategoryOption[] = [
  { value: 'Kegiatan Santri', label: 'Kegiatan Santri' },
  { value: 'Kegiatan Akademik', label: 'Kegiatan Akademik' },
  { value: "Kegiatan Tahfidz & Al-Qur'an", label: "Kegiatan Tahfidz & Al-Qur'an" },
  { value: 'Kegiatan Keagamaan', label: 'Kegiatan Keagamaan' },
  { value: 'Kegiatan Pesantren', label: 'Kegiatan Pesantren' },
  { value: 'Kegiatan Sekolah', label: 'Kegiatan Sekolah' },
  { value: 'Kegiatan Organisasi', label: 'Kegiatan Organisasi' },
  { value: 'Kegiatan Ekstrakurikuler', label: 'Kegiatan Ekstrakurikuler' },
  { value: 'Olahraga & Kebugaran', label: 'Olahraga & Kebugaran' },
  { value: 'Seni & Kreativitas', label: 'Seni & Kreativitas' },
  { value: 'Perlombaan & Prestasi', label: 'Perlombaan & Prestasi' },
  { value: 'Wisuda & Kelulusan', label: 'Wisuda & Kelulusan' },
  { value: 'Kunjungan & Studi Banding', label: 'Kunjungan & Studi Banding' },
  { value: 'Penerimaan Santri Baru', label: 'Penerimaan Santri Baru' },
  { value: 'Kehidupan Asrama', label: 'Kehidupan Asrama' },
  { value: 'Fasilitas & Lingkungan', label: 'Fasilitas & Lingkungan' },
  { value: 'Acara & Perayaan', label: 'Acara & Perayaan' },
  { value: 'Dokumentasi Umum', label: 'Dokumentasi Umum' },
  { value: GALLERY_CATEGORY_OTHER, label: GALLERY_CATEGORY_OTHER },
]

/** Cari opsi standar dari nilai tersimpan (pencocokan tepat atau label). */
export function findGalleryCategory(
  value: string | null | undefined,
): GalleryCategoryOption | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const direct = GALLERY_CATEGORY_OPTIONS.find((option) => option.value === raw)
  if (direct) return direct

  return (
    GALLERY_CATEGORY_OPTIONS.find(
      (option) => option.label.toLowerCase() === raw.toLowerCase(),
    ) ?? null
  )
}

/** True bila nilai persis kunci standar (bukan kategori kustom). */
export function isStandardGalleryCategory(value: string | null | undefined): boolean {
  const raw = String(value ?? '').trim()
  return GALLERY_CATEGORY_OPTIONS.some((option) => option.value === raw)
}

/**
 * Label yang ramah dibaca untuk nilai kategori apa pun.
 * Nilai kustom yang tidak dikenal dikembalikan apa adanya (tidak dibuang).
 */
export function galleryCategoryLabel(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return findGalleryCategory(raw)?.label ?? raw
}

/** Apakah nilai termasuk varian "Lainnya". */
export function isOtherGalleryCategory(value: string | null | undefined): boolean {
  return findGalleryCategory(value)?.value === GALLERY_CATEGORY_OTHER
}
