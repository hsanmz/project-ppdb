import { describe, it, expect } from 'vitest'

import {
  SOCIAL_PATH_MAX_LENGTH,
  isRenderableSocialPath,
  isSocialPresetPath,
  matchSocialPreset,
  socialDomainLabel,
  validateSocialHref,
  validateSocialPath,
} from '../admin/dashboard/social/social-utils'
import { SOCIAL_PRESETS } from '../admin/dashboard/_constants'

const INSTAGRAM_PATH = SOCIAL_PRESETS.find((p) => p.label === 'Instagram')!.path
const CUSTOM_PATH = 'M2 2L20 20'

describe('matchSocialPreset / isSocialPresetPath', () => {
  it('mengenali path preset persis', () => {
    expect(matchSocialPreset(INSTAGRAM_PATH)?.label).toBe('Instagram')
    expect(isSocialPresetPath(INSTAGRAM_PATH)).toBe(true)
  })

  it('path kustom tidak dianggap preset', () => {
    expect(matchSocialPreset(CUSTOM_PATH)).toBeUndefined()
    expect(isSocialPresetPath(CUSTOM_PATH)).toBe(false)
  })

  it('nilai kosong bukan preset', () => {
    expect(matchSocialPreset('')).toBeUndefined()
    expect(matchSocialPreset(null)).toBeUndefined()
    expect(isSocialPresetPath('   ')).toBe(false)
  })
})

describe('validateSocialPath', () => {
  it('path kosong wajib diisi (kolom `path` NOT NULL di backend)', () => {
    const result = validateSocialPath('', { required: true })
    expect(result.renderable).toBe(false)
    expect(result.error).toContain('Ikon')
  })

  it('path kosong dengan required:false tidak error', () => {
    expect(validateSocialPath('   ', { required: false }).error).toBeUndefined()
  })

  it('markup svg lengkap ditolak dengan pesan yang membimbing', () => {
    const result = validateSocialPath('<svg viewBox="0 0 24 24"><path d="M2 2L20 20"/></svg>')
    expect(result.error).toContain('markup')
    expect(result.renderable).toBe(false)
  })

  it('teks tanpa huruf komando ditolak', () => {
    const result = validateSocialPath('0 0 24 24')
    expect(result.error).toContain('komando')
  })

  it('karakter bukan path (mis. tanda kutip) ditolak', () => {
    const result = validateSocialPath('M2 "2"L20 20')
    expect(result.error).toContain('tidak dikenal')
  })

  it('path sah (subpath, spasi, koma, negatif) diterima', () => {
    expect(validateSocialPath(CUSTOM_PATH).renderable).toBe(true)
    expect(validateSocialPath('M2 2 L20 20 M4 4c1.5 0,3 -0.5 4 2z').renderable).toBe(true)
  })

  it('path atas preset bawaan adalah renderable', () => {
    expect(validateSocialPath(INSTAGRAM_PATH).renderable).toBe(true)
  })

  it('path melebihi batas ditolak', () => {
    const longPath = 'M' + '1'.repeat(SOCIAL_PATH_MAX_LENGTH)
    expect(validateSocialPath(longPath).error).toContain('terlalu panjang')
  })
})

describe('isRenderableSocialPath', () => {
  it('true untuk path preset & kustom sah, false untuk markup/kosong', () => {
    expect(isRenderableSocialPath(INSTAGRAM_PATH)).toBe(true)
    expect(isRenderableSocialPath(CUSTOM_PATH)).toBe(true)
    expect(isRenderableSocialPath('<svg/>')).toBe(false)
    expect(isRenderableSocialPath('')).toBe(false)
  })
})

describe('validateSocialHref', () => {
  it('URL lama boleh tanpa skema tidak diblokir saat required:false (data lama)', () => {
    // Validasi ketat pada nilai lama tidak boleh menghalangi penyimpanan:
    // caller menggeser `required:false` & memeriksa perubahan di tempat lain.
    expect(validateSocialHref('', { required: false })).toBeUndefined()
  })

  it('URL wajib diisi saat required', () => {
    expect(validateSocialHref('', { required: true })).toContain('wajib')
  })

  it('teks tanpa skema ditolak dengan contoh format', () => {
    expect(validateSocialHref('instagram.com/username')).toContain('https://')
  })

  it('skema berbahaya ditolak', () => {
    expect(validateSocialHref('javascript:alert(1)')).toContain('Skema')
    expect(validateSocialHref('data:text/html,hi')).toContain('Skema')
  })

  it('semua domain bebas dipakai selama skema aman — tanpa whitelist domain', () => {
    expect(validateSocialHref('https://instagram.com/username')).toBeUndefined()
    expect(validateSocialHref('https://subdomain.kampus.ac.id/page#x=1')).toBeUndefined()
    expect(validateSocialHref('http://localhost:3000/path')).toBeUndefined()
    expect(validateSocialHref('mailto:info@ptdarrahman.sch.id')).toBeUndefined()
    expect(validateSocialHref('tel:+6281234567890')).toBeUndefined()
  })

  it('URL melebihi 255 karakter ditolak (String(255) kolom href)', () => {
    expect(validateSocialHref(`https://x.co/${'a'.repeat(260)}`)).toContain('255')
  })
})

describe('socialDomainLabel', () => {
  it('menampilkan domain ringkas tanpa www', () => {
    expect(socialDomainLabel('https://www.instagram.com/username')).toBe('instagram.com')
  })

  it('URL lama tanpa skema tetap tampil apa adanya, dipangkas ringan', () => {
    expect(socialDomainLabel('wa.me/628123')).toBe('wa.me')
  })

  it('tidak error pada data kosong', () => {
    expect(socialDomainLabel('')).toBe('')
    expect(socialDomainLabel(null)).toBe('')
  })
})
