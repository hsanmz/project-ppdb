/**
 * Logika murni form galeri (tanpa React) supaya mudah diuji.
 *
 * Kontrak backend yang dijaga:
 * - `POST/PUT /companyprofile/gallery` hanya menerima `category`, `image`,
 *   dan `content` (JSON string) — lihat `ENTITY_COLUMNS` di
 *   `apps/api/src/modules/companyprofile/schemas.py`.
 * - `category` WAJIB saat create (kolom `String(100)` NOT NULL — lihat
 *   `REQUIRED_FIELDS` / `GalleryItem`).
 * - `image` lebarnya 255 karakter (boleh kosong — kolom nullable).
 * - `content.title`/`content.desc` string biasa (kolom `content` bertipe
 *   Text, jadi tidak ada batas karakter bermakna yang bisa dicantumkan).
 *   Key `content` lain milik data lama dipertahankan.
 */

import {
  IMAGE_ACCEPT,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  IMAGE_URL_MAX_LENGTH,
  formatFileSize,
  resolveImageSrc,
  validateImageFile,
  validateImageUrl,
} from '@/app/lib/image-file'
import type { FormState } from '../_types'

export const GALLERY_IMAGE_MAX_BYTES = IMAGE_MAX_BYTES
export const GALLERY_IMAGE_TYPES = IMAGE_TYPES
export const GALLERY_IMAGE_ACCEPT = IMAGE_ACCEPT

export const GALLERY_CATEGORY_MAX_LENGTH = 100
export const GALLERY_IMAGE_URL_MAX_LENGTH = IMAGE_URL_MAX_LENGTH

export interface GalleryFormValues {
  category: string
  title: string
  desc: string
  image: string
}

/** Baca nilai form dari `FormState` yang dipakai dashboard. */
export function readGalleryForm(formData: FormState): GalleryFormValues {
  return {
    category: String(formData.category ?? '').trim(),
    title: String(formData._c_title ?? ''),
    desc: String(formData._c_desc ?? ''),
    image: String(formData.image ?? '').trim(),
  }
}

/**
 * Validasi hanya untuk field yang benar-benar punya batasan di backend.
 * `category` wajib karena kolomnya NOT NULL + REQUIRED_FIELDS (create
 * ditolak bila kosong). `image`, judul, dan deskripsi opsional — jangan
 * dipaksa wajib di sisi form.
 */
export function validateGalleryForm(values: GalleryFormValues): Record<string, string> {
  const errors: Record<string, string> = {}

  const category = values.category.trim()
  if (!category) {
    errors.category = 'Kategori wajib dipilih.'
  }
  // "Lainnya" polos (tanpa teks khusus) tetap sah — perilaku sama dengan
  // pemilih kategori fasilitas, sehingga data bisa disimpan lalu ditulis.

  if (category.length > GALLERY_CATEGORY_MAX_LENGTH) {
    errors.category = `Kategori maksimal ${GALLERY_CATEGORY_MAX_LENGTH} karakter.`
  }

  const imageError = validateGalleryImageUrl(values.image)
  if (imageError) errors.image = imageError

  return errors
}

/** Alias tipis ke validator gambar bersama (`app/lib/image-file.ts`). */
export const validateGalleryImageUrl = validateImageUrl
export const validateGalleryImageFile = validateImageFile
export { formatFileSize }
export {
  createObjectPreviewUrl,
  disposeObjectPreviewUrl,
} from '@/app/lib/image-file'

/**
 * Bangun payload sesuai kontrak API. `existingContent` dipertahankan supaya
 * key `content` lama (termasuk yang tidak dikenal form ini) tidak hilang
 * saat admin menyimpan perubahan.
 */
export function buildGalleryPayload(args: {
  formData: FormState
  existingContent?: Record<string, unknown> | null
}): Record<string, unknown> {
  const values = readGalleryForm(args.formData)
  const content: Record<string, unknown> = { ...(args.existingContent ?? {}) }

  content.title = values.title
  content.desc = values.desc

  return {
    category: values.category,
    image: values.image,
    content: JSON.stringify(content),
  }
}

/**
 * Petakan pesan 4xx backend ke nama field form agar admin langsung tahu
 * kolom mana yang perlu diperbaiki. Tidak menebak bila pesan tidak jelas.
 */
export function galleryFieldFromServerError(
  message: string,
): 'category' | 'image' | '_c_title' | '_c_desc' | null {
  const lower = message.toLowerCase()
  if (lower.includes('category') || lower.includes('kategori')) return 'category'
  if (lower.includes('image') || lower.includes('gambar')) return 'image'
  if (lower.includes('title') || lower.includes('judul')) return '_c_title'
  if (lower.includes('desc') || lower.includes('deskripsi')) return '_c_desc'
  return null
}

/**
 * Gambar `/uploads/...` disajikan oleh API, bukan origin frontend. Untuk
 * pratinjau admin, path tersebut perlu diarahkan ke API agar tidak 404.
 * Nilai yang disimpan tetap apa adanya.
 */
export function resolveGalleryImageSrc(value: string, apiBase: string): string {
  return resolveImageSrc(value, apiBase)
}
