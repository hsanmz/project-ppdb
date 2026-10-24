/**
 * Logika murni form prestasi (tanpa React) agar mudah diuji.
 *
 * Kontrak backend yang dijaga:
 * - `POST/PUT /companyprofile/achievements` menerima `year`, `image`,
 *   dan `content` (JSON string) — lihat `ENTITY_COLUMNS` di
 *   `apps/api/src/modules/companyprofile/schemas.py`.
 * - `year` WAJIB saat create dan harus bertipe integer (disimpan di kolom DB `Integer`).
 * - `image` lebarnya maksimal 255 karakter.
 * - `content.title`, `content.desc`, `content.scope` string biasa.
 *   Key `content` lain milik data lama dipertahankan saat update.
 */

import type { FormState } from '../_types'

export const ACHIEVEMENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024 // 10 MB (samakan dengan uploads.py)
export const ACHIEVEMENT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export const ACHIEVEMENT_IMAGE_ACCEPT = ACHIEVEMENT_IMAGE_TYPES.join(',')

export const ACHIEVEMENT_TITLE_MAX_LENGTH = 255
export const ACHIEVEMENT_IMAGE_URL_MAX_LENGTH = 255
export const ACHIEVEMENT_SCOPE_MAX_LENGTH = 100
export const ACHIEVEMENT_YEAR_MIN = 1900
export const ACHIEVEMENT_YEAR_MAX = 2100

/**
 * Daftar opsi baku tingkat/lingkup prestasi institusi.
 */
export const ACHIEVEMENT_SCOPES = [
  'Internasional',
  'Nasional',
  'Regional',
  'Provinsi',
  'Kabupaten',
  'Kota',
  'Kecamatan',
  'Institusi / Sekolah / Pesantren',
  'Lainnya',
] as const

export type AchievementScopePreset = (typeof ACHIEVEMENT_SCOPES)[number]

/**
 * Pemetaan alias bahasa Inggris atau variasi penulisan lama ke opsi baku.
 */
const SCOPE_ALIASES: Record<string, AchievementScopePreset> = {
  international: 'Internasional',
  internasional: 'Internasional',
  national: 'Nasional',
  nasional: 'Nasional',
  regional: 'Regional',
  provincial: 'Provinsi',
  provinsi: 'Provinsi',
  kabupaten: 'Kabupaten',
  kota: 'Kota',
  kecamatan: 'Kecamatan',
  institusi: 'Institusi / Sekolah / Pesantren',
  sekolah: 'Institusi / Sekolah / Pesantren',
  pesantren: 'Institusi / Sekolah / Pesantren',
  'institusi / sekolah / pesantren': 'Institusi / Sekolah / Pesantren',
  internal: 'Institusi / Sekolah / Pesantren',
  lainnya: 'Lainnya',
  other: 'Lainnya',
}

export interface NormalizedScopeResult {
  preset: AchievementScopePreset | 'Lainnya'
  customValue: string
  displayLabel: string
}

/**
 * Normalisasi nilai lingkup prestasi dengan mempertahankan data lama/kustom.
 */
export function normalizeAchievementScope(rawScope: unknown): NormalizedScopeResult {
  const scope = typeof rawScope === 'string' ? rawScope.trim() : ''
  if (!scope) {
    return { preset: 'Nasional', customValue: '', displayLabel: '' }
  }

  const lower = scope.toLowerCase()

  // 1. Cek kecocokan langsung ke daftar baku (case-insensitive)
  const exactPreset = ACHIEVEMENT_SCOPES.find((p) => p.toLowerCase() === lower)
  if (exactPreset) {
    return {
      preset: exactPreset,
      customValue: exactPreset === 'Lainnya' ? '' : '',
      displayLabel: exactPreset,
    }
  }

  // 2. Cek alias bahasa Inggris / variasi lama
  if (lower in SCOPE_ALIASES) {
    const matched = SCOPE_ALIASES[lower]
    return {
      preset: matched,
      customValue: matched === 'Lainnya' ? scope : '',
      displayLabel: matched === 'Lainnya' ? scope : matched,
    }
  }

  // 3. Nilai kustom dari database/input admin sebelumnya
  return {
    preset: 'Lainnya',
    customValue: scope,
    displayLabel: scope,
  }
}

export interface AchievementFormValues {
  year: number | ''
  title: string
  desc: string
  scope: string
  image: string
}

/**
 * Baca nilai form dari `FormState` dashboard.
 */
export function readAchievementForm(formData: FormState): AchievementFormValues {
  const rawYear = formData.year
  let year: number | '' = ''
  if (typeof rawYear === 'number' && Number.isFinite(rawYear)) {
    year = Math.trunc(rawYear)
  } else if (typeof rawYear === 'string' && rawYear.trim() !== '') {
    const parsed = Number(rawYear.trim())
    if (Number.isFinite(parsed)) year = Math.trunc(parsed)
  }

  return {
    year,
    title: String(formData._c_title ?? ''),
    desc: String(formData._c_desc ?? ''),
    scope: String(formData._c_scope ?? '').trim(),
    image: String(formData.image ?? '').trim(),
  }
}

/**
 * Validasi form prestasi berdasarkan aturan bisnis & kontrak backend.
 *
 * Catatan penting: Backend mewajibkan `year` pada create.
 * Kolom lain optional, namun jika diisi harus memenuhi batasan panjang/format.
 */
export function validateAchievementForm(
  values: AchievementFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {}

  // Validasi Tahun: wajib diisi & harus integer valid
  if (values.year === '' || values.year === null || values.year === undefined) {
    errors.year = 'Tahun prestasi wajib diisi.'
  } else if (!Number.isInteger(values.year)) {
    errors.year = 'Tahun harus berupa bilangan bulat.'
  } else if (values.year < ACHIEVEMENT_YEAR_MIN || values.year > ACHIEVEMENT_YEAR_MAX) {
    errors.year = `Tahun harus berada antara ${ACHIEVEMENT_YEAR_MIN} dan ${ACHIEVEMENT_YEAR_MAX}.`
  }

  // Validasi Judul
  if (values.title.length > ACHIEVEMENT_TITLE_MAX_LENGTH) {
    errors.title = `Judul prestasi maksimal ${ACHIEVEMENT_TITLE_MAX_LENGTH} karakter.`
  }

  // Validasi Lingkup
  if (values.scope.length > ACHIEVEMENT_SCOPE_MAX_LENGTH) {
    errors.scope = `Lingkup prestasi maksimal ${ACHIEVEMENT_SCOPE_MAX_LENGTH} karakter.`
  }

  // Validasi URL Gambar
  const imageError = validateAchievementImageUrl(values.image)
  if (imageError) {
    errors.image = imageError
  }

  return errors
}

/**
 * Validasi URL gambar. Mendukung URL http/https dan path lokal /uploads/...
 */
export function validateAchievementImageUrl(value: string): string | null {
  const url = value.trim()
  if (!url) return null

  if (url.length > ACHIEVEMENT_IMAGE_URL_MAX_LENGTH) {
    return `URL gambar maksimal ${ACHIEVEMENT_IMAGE_URL_MAX_LENGTH} karakter.`
  }

  if (url.startsWith('/') && !url.startsWith('//')) return null

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'URL gambar harus diawali http:// atau https://.'
    }
    return null
  } catch {
    return 'URL gambar tidak valid.'
  }
}

/**
 * Validasi file gambar sebelum diunggah ke backend.
 */
export function validateAchievementImageFile(file: File): string | null {
  if (!file) return 'Pilih file gambar terlebih dahulu.'
  if (!file.size) return 'File gambar kosong atau tidak valid.'

  if (!ACHIEVEMENT_IMAGE_TYPES.includes(file.type as (typeof ACHIEVEMENT_IMAGE_TYPES)[number])) {
    return 'Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.'
  }
  if (file.size > ACHIEVEMENT_IMAGE_MAX_BYTES) {
    return `Ukuran file terlalu besar (${formatFileSize(file.size)}). Maksimal 10 MB.`
  }
  return null
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/**
 * Bangun payload sesuai kontrak backend `apps/api/src/modules/companyprofile/schemas.py`.
 * Mempertahankan key `content` lama bila ada.
 */
export function buildAchievementPayload(args: {
  formData: FormState
  existingContent?: Record<string, unknown> | null
}): Record<string, unknown> {
  const values = readAchievementForm(args.formData)
  const content: Record<string, unknown> = { ...(args.existingContent ?? {}) }

  content.title = values.title
  content.desc = values.desc
  content.scope = values.scope

  return {
    year: typeof values.year === 'number' ? values.year : Number(values.year) || new Date().getFullYear(),
    image: values.image,
    content: JSON.stringify(content),
  }
}

/**
 * Petakan pesan error dari API ke field form agar admin langsung terarah ke input yang salah.
 */
export function achievementFieldFromServerError(message: string): 'year' | 'image' | 'title' | 'scope' | null {
  const lower = message.toLowerCase()
  if (lower.includes('year') || lower.includes('tahun')) return 'year'
  if (lower.includes('image') || lower.includes('gambar')) return 'image'
  if (lower.includes('title') || lower.includes('judul')) return 'title'
  if (lower.includes('scope') || lower.includes('lingkup')) return 'scope'
  return null
}

/**
 * Resolusi URL gambar untuk pratinjau aman jika berupa path relatif `/uploads/...`.
 */
export function resolveAchievementImageSrc(value: string, apiBase: string): string {
  const src = value.trim()
  if (!src) return ''
  if (src.startsWith('/') && !src.startsWith('//')) {
    return `${apiBase.replace(/\/+$/, '')}${src}`
  }
  return src
}

/**
 * Style / token warna untuk badge lingkup prestasi (restrained visual hierarchy).
 */
export function getScopeBadgeStyle(scope: string): { bg: string; text: string; border: string } {
  const lower = scope.trim().toLowerCase()
  if (lower.includes('internasional') || lower.includes('international')) {
    return { bg: 'bg-purple-500/10', text: 'text-purple-700', border: 'border-purple-500/25' }
  }
  if (lower.includes('nasional') || lower.includes('national')) {
    return { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-500/25' }
  }
  if (lower.includes('regional')) {
    return { bg: 'bg-teal-500/10', text: 'text-teal-700', border: 'border-teal-500/25' }
  }
  if (lower.includes('provinsi') || lower.includes('provincial')) {
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-500/25' }
  }
  if (lower.includes('kabupaten') || lower.includes('kota')) {
    return { bg: 'bg-amber-500/10', text: 'text-amber-800', border: 'border-amber-500/25' }
  }
  if (lower.includes('kecamatan')) {
    return { bg: 'bg-orange-500/10', text: 'text-orange-700', border: 'border-orange-500/25' }
  }
  if (lower.includes('institusi') || lower.includes('sekolah') || lower.includes('pesantren')) {
    return { bg: 'bg-zinc-500/10', text: 'text-zinc-700', border: 'border-zinc-500/25' }
  }
  return { bg: 'bg-slate-500/10', text: 'text-slate-700', border: 'border-slate-500/25' }
}
