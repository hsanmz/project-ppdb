/**
 * Util bersama untuk memproses nilai kolom `maps_embed` (tabel `contact_info`).
 *
 * Dikonsumsi oleh dua tempat:
 * 1. `ContactEditor` (tab Info Kontak di dashboard admin) — pratinjau + feedback.
 * 2. `ContactClient` (halaman publik `/contact`) — render iframe peta.
 *
 * Format nilai yang sudah dipakai sistem sejak awal (kontrak data TIDAK
 * diubah, tetap string mentah):
 * 1. URL embed langsung — `https://www.google.com/maps?q=...&output=embed`
 *    atau `https://www.google.com/maps/embed?pb=...`
 * 2. Kode `<iframe src="..." ...></iframe>` hasil "Bagikan → Sematkan peta".
 *
 * Keamanan: HTML mentah dari kode iframe TIDAK PERNAH disuntikkan ke DOM.
 * Yang diambil hanya atribut `src`, lalu divalidasi URL + allowlist host
 * Google Maps, dan dirender lewat `<iframe>` buatan sendiri.
 */

export type MapsEmbedStatus = 'empty' | 'valid' | 'invalid'

export interface MapsEmbedResolved {
  status: MapsEmbedStatus
  /** URL https siap dipakai sebagai `src` iframe — hanya saat status `valid`. */
  src: string | null
  /** Pesan feedback untuk admin saat status `invalid`, selain itu `null`. */
  message: string | null
}

/**
 * Allowlist host Google Maps.
 *
 * Menerima `google.com` beserta subdomainnya (`www.`, `maps.`) dan domain
 * regional (`google.co.id`, `google.de`, `google.com.au`, dst.). Host lain —
 * mis. domain peniruan seperti `notgoogle.com` — selalu ditolak.
 */
export function isAllowedMapsHost(rawHost: string): boolean {
  const host = rawHost.trim().toLowerCase()
  if (!host) return false
  const parts = host.split('.').filter(Boolean)
  if (parts.length < 2) return false
  const last2 = parts.slice(-2).join('.')
  const last3 = parts.slice(-3).join('.')
  // google.com + semua subdomain (www.google.com, maps.google.com, ...)
  if (last2 === 'google.com' || last3 === 'google.com') return true
  // domain regional: google.de / google.fr / google.co.id / google.com.au / ...
  return (
    /^google\.(co|com)\.[a-z]{2}$/.test(last2) ||
    /^google\.(co|com)\.[a-z]{2}$/.test(last3) ||
    /^google\.[a-z]{2}$/.test(last2)
  )
}

/** Validasi & normalisasi satu kandidat URL embed. `null` berarti ditolak. */
function normalizeEmbedUrl(candidate: string): string | null {
  const trimmed = candidate.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  try {
    const url = new URL(trimmed)
    if (!isAllowedMapsHost(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

const IFRAME_SRC_PATTERN = /\bsrc\s*=\s*["']([^"']+)["']/i

/**
 * Selesaikan nilai `maps_embed` mentah dari backend menjadi status yang aman.
 *
 * - `empty`  : belum diisi (halaman publik memakai peta cadangan alamat).
 * - `valid`  : URL `src` yang lolos allowlist, siap dirender sebagai iframe.
 * - `invalid`: berisi teks tapi tidak bisa dipercaya — jangan dirender.
 */
export function resolveMapsEmbed(raw: string | null | undefined): MapsEmbedResolved {
  const value = (raw ?? '').trim()
  if (!value) return { status: 'empty', src: null, message: null }

  // Kode <iframe …>: ambil hanya atribut src-nya. Atribut lain (onclick,
  // event handler, class, dll.) tidak ikut — html tidak disuntikkan.
  if (/<\s*iframe/i.test(value)) {
    const match = value.match(IFRAME_SRC_PATTERN)
    if (!match) {
      return {
        status: 'invalid',
        src: null,
        message:
          'Tag <iframe> tidak memiliki atribut src. Salin ulang kode embed dari menu "Bagikan → Sematkan peta" Google Maps.',
      }
    }
    const src = normalizeEmbedUrl(match[1])
    if (!src) {
      return {
        status: 'invalid',
        src: null,
        message:
          'Atribut src pada <iframe> bukan URL Google Maps yang valid. Gunakan URL https:// dari google.com.',
      }
    }
    return { status: 'valid', src, message: null }
  }

  // URL langsung.
  const src = normalizeEmbedUrl(value)
  if (!src) {
    return {
      status: 'invalid',
      src: null,
      message:
        'Masukkan URL embed Google Maps (https://www.google.com/maps/…) atau kode <iframe> embed-nya.',
    }
  }
  return { status: 'valid', src, message: null }
}

/**
 * URL peta cadangan bila embed kosong/tidak valid — tampilan yang sama
 * dipakai halaman publik: pencarian berdasarkan alamat pesantren.
 */
export function mapsFallbackUrl(address: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(address || 'Bekasi, Indonesia')}&output=embed`
}

/** Tautan "Buka di Google Maps" (bukan iframe, hanya pencarian alamat). */
export function mapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Bekasi, Indonesia')}`
}
