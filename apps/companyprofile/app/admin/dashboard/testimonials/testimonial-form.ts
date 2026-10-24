/**
 * Logika murni form testimoni (tanpa React) supaya mudah diuji.
 *
 * Kontrak backend yang dijaga:
 * - `POST/PUT /companyprofile/testimonials` hanya menerima `name`, `child`,
 *   `image`, `order`, dan `content` (JSON string) — lihat `ENTITY_COLUMNS` di
 *   `apps/api/src/modules/companyprofile/schemas.py`.
 * - `name` dan `child` wajib saat create (lebar kolom 255 karakter).
 * - `order` adalah integer (kolom `order`, NOT NULL, default 0).
 * - `image` opsional, lebar 255 karakter.
 * - Kutipan disimpan di `content.quote`; data lama bisa memakai
 *   `content.text`, jadi fallback itu dipertahankan.
 */

import {
  IMAGE_URL_MAX_LENGTH,
  validateImageUrl,
} from '@/app/lib/image-file'
import type { FormState, RowRecord } from '../_types'

export const TESTIMONIAL_NAME_MAX_LENGTH = 255
export const TESTIMONIAL_CHILD_MAX_LENGTH = 255
export const TESTIMONIAL_IMAGE_URL_MAX_LENGTH = IMAGE_URL_MAX_LENGTH

/** Batas atas integer MySQL `INT` — cukup longgar untuk urutan tampilan. */
const MAX_ORDER_VALUE = 2_147_483_647

export interface TestimonialFormValues {
  name: string
  child: string
  /** Disimpan sebagai string agar input kosong / desimal bisa divalidasi. */
  order: string
  quote: string
  image: string
}

export type TestimonialFormErrors = Record<string, string>

/** Baca nilai form dari `FormState` yang dipakai dashboard. */
export function readTestimonialForm(formData: FormState): TestimonialFormValues {
  return {
    name: String(formData.name ?? ''),
    child: String(formData.child ?? ''),
    order:
      formData.order === undefined || formData.order === null
        ? ''
        : String(formData.order),
    quote: String(formData._c_quote ?? ''),
    image: String(formData.image ?? '').trim(),
  }
}

/**
 * Ambil kutipan dari JSON content. Data lama dapat menyimpan teks di `text`
 * (lihat `TestimonialsCarousel`), jadi keduanya dibaca.
 */
export function testimonialQuoteFromContent(
  content: Record<string, unknown> | null | undefined,
): string {
  if (!content) return ''
  const quote = content.quote
  if (typeof quote === 'string' && quote.trim()) return quote
  const text = content.text
  return typeof text === 'string' ? text : ''
}

export function parseTestimonialOrder(raw: string): {
  value: number | null
  error?: string
} {
  const text = raw.trim()
  if (!text) {
    return { value: null, error: 'Urutan tampilan wajib diisi.' }
  }
  if (!/^\d+$/.test(text)) {
    return {
      value: null,
      error: 'Gunakan angka bulat 0 atau lebih, tanpa desimal atau tanda minus.',
    }
  }
  const value = Number(text)
  if (!Number.isSafeInteger(value) || value > MAX_ORDER_VALUE) {
    return { value: null, error: 'Angka urutan terlalu besar.' }
  }
  return { value }
}

/**
 * Default urutan untuk testimoni baru: satu langkah setelah urutan terbesar
 * yang sedang dimuat. Bila belum ada data, mulai dari 0 (default kolom).
 */
export function nextTestimonialOrder(rows: RowRecord[]): number {
  let max = -1
  for (const row of rows) {
    const raw: unknown = row.order
    const parsed =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string' && raw.trim() !== ''
          ? Number(raw)
          : NaN
    if (Number.isInteger(parsed) && parsed >= 0 && parsed > max) max = parsed
  }
  return max + 1
}

/** Validasi field yang memang punya batas di backend. */
export function validateTestimonialForm(
  values: TestimonialFormValues,
): TestimonialFormErrors {
  const errors: TestimonialFormErrors = {}

  if (!values.name.trim()) {
    errors.name = 'Nama wali santri wajib diisi.'
  } else if (values.name.length > TESTIMONIAL_NAME_MAX_LENGTH) {
    errors.name = `Nama wali santri maksimal ${TESTIMONIAL_NAME_MAX_LENGTH} karakter.`
  }

  if (!values.child.trim()) {
    errors.child = 'Nama anak / santri wajib diisi.'
  } else if (values.child.length > TESTIMONIAL_CHILD_MAX_LENGTH) {
    errors.child = `Nama anak / santri maksimal ${TESTIMONIAL_CHILD_MAX_LENGTH} karakter.`
  }

  const order = parseTestimonialOrder(values.order)
  if (order.error) errors.order = order.error

  const imageError = validateImageUrl(values.image)
  if (imageError) errors.image = imageError

  return errors
}

/**
 * Bangun payload sesuai kontrak API. `existingContent` dipertahankan supaya
 * key `content` lama (termasuk `text` dan key yang tidak dikenal form ini)
 * tidak hilang saat admin menyimpan perubahan.
 */
export function buildTestimonialPayload(args: {
  formData: FormState
  existingContent?: Record<string, unknown> | null
}): Record<string, unknown> {
  const values = readTestimonialForm(args.formData)
  const order = parseTestimonialOrder(values.order)
  const content: Record<string, unknown> = { ...(args.existingContent ?? {}) }

  content.quote = values.quote

  return {
    name: values.name,
    child: values.child,
    order: order.value ?? 0,
    image: values.image,
    content: JSON.stringify(content),
  }
}

/**
 * Petakan pesan 4xx backend ke nama field form. Backend bisa menyebut lebih
 * dari satu field sekaligus (`Missing required field(s): child, name`),
 * jadi hasilnya berupa daftar.
 */
export function testimonialFieldsFromServerError(message: string): string[] {
  const lower = message.toLowerCase()
  const fields: string[] = []
  if (/\bname\b/.test(lower) || lower.includes('nama')) fields.push('name')
  if (/\bchild\b/.test(lower) || lower.includes('anak')) fields.push('child')
  if (/\border\b/.test(lower) || lower.includes('urutan')) fields.push('order')
  if (/\bimage\b/.test(lower) || lower.includes('gambar')) fields.push('image')
  if (lower.includes('content') || lower.includes('quote') || lower.includes('kutipan')) {
    fields.push('_c_quote')
  }
  return fields
}
