/**
 * Logika murni form fasilitas (tanpa React) supaya mudah diuji.
 *
 * Kontrak backend yang dijaga:
 * - `POST/PUT /companyprofile/facilities` hanya menerima `category`, `image`,
 *   dan `content` (JSON string) — lihat `ENTITY_COLUMNS` di
 *   `apps/api/src/modules/companyprofile/schemas.py`.
 * - `category` WAJIB saat create dan lebarnya 100 karakter.
 * - `image` lebarnya 255 karakter.
 * - `content.features` tetap array string; `content.name`/`content.desc`
 *   string biasa. Key `content` lain milik data lama dipertahankan.
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

export const FACILITY_IMAGE_MAX_BYTES = IMAGE_MAX_BYTES
export const FACILITY_IMAGE_TYPES = IMAGE_TYPES
export const FACILITY_IMAGE_ACCEPT = IMAGE_ACCEPT

export const FACILITY_CATEGORY_MAX_LENGTH = 100
export const FACILITY_IMAGE_URL_MAX_LENGTH = IMAGE_URL_MAX_LENGTH

export interface FacilityFormValues {
  category: string
  name: string
  desc: string
  features: string[]
  image: string
}

/** Baca nilai form dari `FormState` yang dipakai dashboard. */
export function readFacilityForm(formData: FormState): FacilityFormValues {
  return {
    category: String(formData.category ?? '').trim(),
    name: String(formData._c_name ?? ''),
    desc: String(formData._c_desc ?? ''),
    features: parseFacilityFeatures(formData._c_features),
    image: String(formData.image ?? '').trim(),
  }
}

/**
 * Fitur disimpan di dashboard sebagai string satu-per-baris (format lama),
 * tetapi juga menerima array agar aman bila dipanggil dari data detail API.
 */
export function parseFacilityFeatures(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return dedupeFacilityFeatures(raw.map((item) => String(item ?? '')))
  }
  if (typeof raw !== 'string') return []
  return dedupeFacilityFeatures(raw.split('\n'))
}

/** Buang entri kosong & duplikat (tanpa membedakan kapitalisasi), pertahankan urutan. */
export function dedupeFacilityFeatures(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const value = item.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(value)
  }
  return result
}

/** Serialisasi balik ke format satu-per-baris untuk `formData._c_features`. */
export function serializeFacilityFeatures(features: string[]): string {
  return dedupeFacilityFeatures(features).join('\n')
}

/** Validasi field yang memang punya batas di backend. */
export function validateFacilityForm(values: FacilityFormValues): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!values.category) {
    errors.category = 'Kategori wajib dipilih.'
  } else if (values.category.length > FACILITY_CATEGORY_MAX_LENGTH) {
    errors.category = `Kategori maksimal ${FACILITY_CATEGORY_MAX_LENGTH} karakter.`
  }

  const imageError = validateFacilityImageUrl(values.image)
  if (imageError) errors.image = imageError

  return errors
}

/** Alias tipis ke validator gambar bersama (`app/lib/image-file.ts`). */
export const validateFacilityImageUrl = validateImageUrl
export const validateFacilityImageFile = validateImageFile
export { formatFileSize }

/**
 * Bangun payload sesuai kontrak API. `existingContent` dipertahankan supaya
 * key `content` lama (termasuk yang tidak dikenal form ini) tidak hilang saat
 * admin menyimpan perubahan.
 */
export function buildFacilityPayload(args: {
  formData: FormState
  existingContent?: Record<string, unknown> | null
}): Record<string, unknown> {
  const values = readFacilityForm(args.formData)
  const content: Record<string, unknown> = { ...(args.existingContent ?? {}) }

  content.name = values.name
  content.desc = values.desc
  content.features = values.features

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
export function facilityFieldFromServerError(message: string): 'category' | 'image' | null {
  const lower = message.toLowerCase()
  if (lower.includes('category') || lower.includes('kategori')) return 'category'
  if (lower.includes('image') || lower.includes('gambar')) return 'image'
  return null
}

/**
 * Gambar `/uploads/...` disajikan oleh API, bukan origin frontend. Untuk
 * pratinjau admin, path tersebut perlu diarahkan ke API agar tidak 404.
 * Nilai yang disimpan tetap apa adanya.
 */
export function resolveFacilityImageSrc(value: string, apiBase: string): string {
  return resolveImageSrc(value, apiBase)
}
