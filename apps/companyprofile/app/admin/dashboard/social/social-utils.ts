/**
 * Utilitas murni modul Tautan Sosial.
 *
 * Kontrak data backend (`apps/api/src/modules/companyprofile/schemas.py`):
 * - Whitelist kolom `social-links` = { label, href, path }.
 * - `label` & `href`: String(255), wajib (non-kosong) saat create.
 * - `path`: kolom Text — berisi **data path SVG** (isi atribut `d`),
 *   BUKAN markup `<svg>` lengkap. Renderer publik (Footer, ContactClient)
 *   selalu merender lewat `<svg viewBox="0 0 24 24"><path d={path} /></svg>`,
 *   jadi utilitas ini menyamakan ekspektasi format dengan format itu.
 *
 * Semua fungsi di sini murni (tanpa React/DOM) agar mudah dites.
 */

import { SOCIAL_PRESETS } from '../_constants'

export interface SocialPreset {
  label: string
  path: string
  hint?: string
}

/** Whitespace apa pun (spasi, tab, baris baru) — admin sering paste multiline. */
const WHITESPACE_RE = /\s/

/**
 * Karakter yang valid dalam data atribut `d` SVG.
 *
 * Defender against markup berisi tag/event handler: data path yang sah hanya
 * memuat huruf komando, digit, dan pemisah. Karakter di luar daftar ini
 * (mis. `<`, `"`, `&`, `(`) TIDAK ditemui pada path SVG yang benar, sehingga
 * kemunculannya berarti admin menempel markup/teks lain.
 */
const PATH_ALLOWED_CHARS_RE = /^[MmLlHhVvCcSsQqTtAaZz0-9eE\s,\.\-\+]$/
/** Huruf komando path — path tanpa satu pun komando tidak mungkin dirender. */
const PATH_COMMAND_RE = /[MmLlHhVvCcSsQqTtAaZz]/

/** Batas nyaman utk textarea path; backend menampung jauh lebih besar (Text). */
export const SOCIAL_PATH_MAX_LENGTH = 10_000

/**
 * Cocokkan `path` dengan salah satu preset ikon. Pencocokan string persis —
 * data preset selalu tersimpan bulat oleh form ini, jadi persis cukup.
 */
export function matchSocialPreset(path: unknown): SocialPreset | undefined {
  const value = typeof path === 'string' ? path.trim() : ''
  if (!value) return undefined
  return SOCIAL_PRESETS.find((preset) => preset.path === value)
}

/** True bila `path` adalah path bawaan salah satu preset. */
export function isSocialPresetPath(path: unknown): boolean {
  return matchSocialPreset(path) !== undefined
}

/**
 * True bila `path` dapat dirender oleh renderer publik (`<path d>`):
 * memuat huruf komando dan seluruh karakternya legal.
 */
export function isRenderableSocialPath(path: unknown): boolean {
  const value = typeof path === 'string' ? path.trim() : ''
  if (!value) return false
  if (!PATH_COMMAND_RE.test(value)) return false
  // Seluruh karakter harus legal — satu karakter asing berarti markup/teks.
  return buildPathCharErrors(value).length === 0
}
/** NG karakter ilegal pertama dalam data path, untuk pesan error yang presisi. */
function buildPathCharErrors(value: string): string[] {
  const errors: string[] = []
  for (const char of value) {
    if (!PATH_ALLOWED_CHARS_RE.test(char) && !WHITESPACE_RE.test(char)) {
      errors.push(char)
      if (errors.length >= 3) break
    }
  }
  return errors
}

export interface SocialPathValidation {
  error?: string
  /** True bila ikon bisa dirender publik. */
  renderable: boolean
}

/**
 * Validasi data path SVG (isi atribut `d`). Pesan error membimbing admin
 * non-teknis; format yang sah tetap fleksibel (subpath ganda, koma, spasi).
 */
export function validateSocialPath(
  path: unknown,
  opts: { required?: boolean; maxLength?: number } = {},
): SocialPathValidation {
  const { required = true, maxLength = SOCIAL_PATH_MAX_LENGTH } = opts
  const value = typeof path === 'string' ? path.trim() : ''

  if (!value) {
    return {
      error: required
        ? 'Ikon masih kosong. Pilih salah satu preset di atas, isi path kustom di bawahnya.'
        : undefined,
      renderable: false,
    }
  }
  if (value.length > maxLength) {
    return {
      error: `Path terlalu panjang (maksimal ${maxLength.toLocaleString('id-ID')} karakter).`,
      renderable: false,
    }
  }
  if (value.includes('<') || value.includes('>')) {
    return {
      error:
        'Data path, bukan markup. Hapus rangka <svg>—</svg> dan tempel hanya isi atribut d-nya.',
      renderable: false,
    }
  }
  if (!PATH_COMMAND_RE.test(value)) {
    return {
      error:
        'Path belum valid. Isi harus diawali huruf komando seperti M (contoh: M12 2c2.71 0 3.05).',
      renderable: false,
    }
  }
  const badChars = buildPathCharErrors(value)
  if (badChars.length > 0) {
    return {
      error: `Path memuat karakter yang tidak dikenal (${badChars.join(' ')}). Periksa kembali isi path.`,
      renderable: false,
    }
  }
  return { error: undefined, renderable: true }
}

/** Skema yang aman dijadikan `href` tautan sosial. */
const SAFE_HREF_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:'])

const HREF_MAX_LENGTH = 255 // String(255) pada kolom `social_links.href`.

/**
 * Validasi URL tautan sosial.
 *
 * Sengaja tidak membatasi domain: semua situs diterima
 * (`https://instagram.com/...`, `https://tiktok.com/@...`, dsb.). URL lama
 * yang sudah tersimpan apapun bentuknya tidak diblokir oleh caller — lihat
 * `SocialFormDialog` yang hanya menegakkan validasi utk nilai yang diubah.
 * Skema `javascript:` / `data:` ditolak karena berbahaya jadi href publik.
 */
export function validateSocialHref(
  href: unknown,
  opts: { required?: boolean; maxLength?: number } = {},
): string | undefined {
  const { required = true, maxLength = HREF_MAX_LENGTH } = opts
  const value = typeof href === 'string' ? href.trim() : ''

  if (!value) {
    if (required) return 'URL wajib diisi — kolom ini menentukan tujuan ikon saat diklik.'
    return undefined
  }
  if (value.length > maxLength) {
    return `URL terlalu panjang (maksimal ${maxLength} karakter).`
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return 'URL belum lengkap. Gunakan format https://domain — contoh: https://instagram.com/username.'
  }

  if (!SAFE_HREF_SCHEMES.has(parsed.protocol)) {
    return 'Skema tautan tidak didukung. Gunakan http://, https://, mailto:, atau tel:.'
  }
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    if (!parsed.hostname) {
      return 'URL belum memuat nama domain — periksa kembali tautannya.'
    }
  }
  return undefined
}

/**
 * Label domain utk daftar admin: `https://instagram.com/username` →
 * `instagram.com`. Tidak mengubah data, hanya tampilan ringkas.
 */
export function socialDomainLabel(href: unknown): string {
  const value = typeof href === 'string' ? href.trim() : ''
  if (!value) return ''
  try {
    const parsed = new URL(value)
    return parsed.hostname.replace(/^www\./i, '') || value
  } catch {
    // URL lama tanpa skema tetap ditampilkan apa adanya, dipangkas ringan.
    return value.replace(/^https?:\/\//i, '').split('/')[0] || value
  }
}
