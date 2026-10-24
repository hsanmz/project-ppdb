import { describe, it, expect } from 'vitest'
import type { FormState } from '../admin/dashboard/_types'
import {
  ACHIEVEMENT_IMAGE_MAX_BYTES,
  ACHIEVEMENT_TITLE_MAX_LENGTH,
  ACHIEVEMENT_YEAR_MAX,
  ACHIEVEMENT_YEAR_MIN,
  achievementFieldFromServerError,
  buildAchievementPayload,
  getScopeBadgeStyle,
  normalizeAchievementScope,
  readAchievementForm,
  resolveAchievementImageSrc,
  validateAchievementForm,
  validateAchievementImageFile,
  validateAchievementImageUrl,
} from '../admin/dashboard/achievements/achievement-form'

describe('readAchievementForm', () => {
  it('membaca data numerik tahun, judul, deskripsi, lingkup, dan gambar dari FormState', () => {
    const state: FormState = {
      year: 2025,
      _c_title: 'Juara 1 MHQ Nasional',
      _c_desc: 'Diselenggarakan oleh Kemenag RI.',
      _c_scope: 'Nasional',
      image: 'https://cdn.example.com/sertifikat.jpg',
    }
    const result = readAchievementForm(state)
    expect(result).toEqual({
      year: 2025,
      title: 'Juara 1 MHQ Nasional',
      desc: 'Diselenggarakan oleh Kemenag RI.',
      scope: 'Nasional',
      image: 'https://cdn.example.com/sertifikat.jpg',
    })
  })

  it('mengkonversi string tahun menjadi integer bulat dan memangkas spasi', () => {
    const state: FormState = {
      year: ' 2024 ',
      _c_title: '  Juara Robotik  ',
      _c_desc: 'Baris 1\nBaris 2',
      _c_scope: ' Provinsi ',
      image: ' /uploads/cert.png ',
    }
    const result = readAchievementForm(state)
    expect(result.year).toBe(2024)
    expect(result.scope).toBe('Provinsi')
    expect(result.image).toBe('/uploads/cert.png')
    expect(result.desc).toBe('Baris 1\nBaris 2')
  })

  it('mengembalikan year kosong jika nilai tahun null, undefined, atau invalid', () => {
    expect(readAchievementForm({}).year).toBe('')
    expect(readAchievementForm({ year: '' }).year).toBe('')
    expect(readAchievementForm({ year: 'invalid' }).year).toBe('')
  })
})

describe('normalizeAchievementScope', () => {
  it('mengenali opsi baku secara presisi', () => {
    expect(normalizeAchievementScope('Internasional')).toEqual({
      preset: 'Internasional',
      customValue: '',
      displayLabel: 'Internasional',
    })
    expect(normalizeAchievementScope('Nasional')).toEqual({
      preset: 'Nasional',
      customValue: '',
      displayLabel: 'Nasional',
    })
    expect(normalizeAchievementScope('Provinsi')).toEqual({
      preset: 'Provinsi',
      customValue: '',
      displayLabel: 'Provinsi',
    })
  })

  it('memetakan alias bahasa Inggris ke opsi baku Indonesia', () => {
    expect(normalizeAchievementScope('International').preset).toBe('Internasional')
    expect(normalizeAchievementScope('national').preset).toBe('Nasional')
    expect(normalizeAchievementScope('provincial').preset).toBe('Provinsi')
    expect(normalizeAchievementScope('pesantren').preset).toBe('Institusi / Sekolah / Pesantren')
  })

  it('mempertahankan nilai kustom yang tidak ada di preset sebagai Lainnya', () => {
    const res = normalizeAchievementScope('Tingkat Se-Jawa & Bali')
    expect(res.preset).toBe('Lainnya')
    expect(res.customValue).toBe('Tingkat Se-Jawa & Bali')
    expect(res.displayLabel).toBe('Tingkat Se-Jawa & Bali')
  })

  it('memberikan default saat string kosong', () => {
    const res = normalizeAchievementScope('')
    expect(res.preset).toBe('Nasional')
    expect(res.displayLabel).toBe('')
  })
})

describe('validateAchievementForm', () => {
  it('valid jika tahun diisi integer dalam rentang valid', () => {
    const valid = {
      year: 2026,
      title: 'Juara 1 Web Design',
      desc: 'Tingkat Nasional',
      scope: 'Nasional',
      image: '',
    }
    expect(validateAchievementForm(valid)).toEqual({})
  })

  it('menghasilkan error jika tahun kosong atau bukan integer', () => {
    const invalidYear = {
      year: '' as unknown as number,
      title: 'Juara 1',
      desc: '',
      scope: 'Nasional',
      image: '',
    }
    const errors = validateAchievementForm(invalidYear)
    expect(errors.year).toBe('Tahun prestasi wajib diisi.')
  })

  it('menghasilkan error jika tahun di luar batas yang masuk akal', () => {
    const outOfBounds = {
      year: 1800,
      title: 'Juara 1',
      desc: '',
      scope: 'Nasional',
      image: '',
    }
    const errors = validateAchievementForm(outOfBounds)
    expect(errors.year).toContain(`Tahun harus berada antara ${ACHIEVEMENT_YEAR_MIN} dan ${ACHIEVEMENT_YEAR_MAX}`)
  })

  it('menghasilkan error jika judul melebihi batas maksimal', () => {
    const longTitle = {
      year: 2026,
      title: 'a'.repeat(ACHIEVEMENT_TITLE_MAX_LENGTH + 1),
      desc: '',
      scope: 'Nasional',
      image: '',
    }
    const errors = validateAchievementForm(longTitle)
    expect(errors.title).toContain(`Judul prestasi maksimal ${ACHIEVEMENT_TITLE_MAX_LENGTH} karakter`)
  })
})

describe('validateAchievementImageUrl & validateAchievementImageFile', () => {
  it('menerima URL absolut http/https dan path lokal /uploads/...', () => {
    expect(validateAchievementImageUrl('')).toBeNull()
    expect(validateAchievementImageUrl('https://example.com/cert.jpg')).toBeNull()
    expect(validateAchievementImageUrl('/uploads/sertifikat-2026.png')).toBeNull()
  })

  it('menolak URL yang tidak diawali protokol valid atau terlalu panjang', () => {
    expect(validateAchievementImageUrl('ftp://invalid.com')).toContain('http:// atau https://')
    expect(validateAchievementImageUrl('a'.repeat(300))).toContain('maksimal 255 karakter')
  })

  it('memvalidasi format file gambar', () => {
    const validFile = new File(['dummy'], 'cert.jpg', { type: 'image/jpeg' })
    expect(validateAchievementImageFile(validFile)).toBeNull()

    const pdfFile = new File(['dummy'], 'cert.pdf', { type: 'application/pdf' })
    expect(validateAchievementImageFile(pdfFile)).toContain('Format gambar tidak didukung')
  })

  it('memvalidasi ukuran file gambar maksimal 10 MB', () => {
    const oversizedFile = new File([new Uint8Array(ACHIEVEMENT_IMAGE_MAX_BYTES + 1024)], 'cert.png', {
      type: 'image/png',
    })
    expect(validateAchievementImageFile(oversizedFile)).toContain('Ukuran file terlalu besar')
  })
})

describe('buildAchievementPayload', () => {
  it('membangun payload backend sesuai kontrak API dengan JSON stringify content', () => {
    const formData: FormState = {
      year: 2026,
      image: 'https://cdn.example.com/cert.jpg',
      _c_title: 'Juara 1 Kaligrafi',
      _c_desc: 'Tingkat Jawa Timur',
      _c_scope: 'Provinsi',
    }

    const payload = buildAchievementPayload({ formData })
    expect(payload.year).toBe(2026)
    expect(payload.image).toBe('https://cdn.example.com/cert.jpg')

    const parsedContent = JSON.parse(payload.content as string)
    expect(parsedContent).toEqual({
      title: 'Juara 1 Kaligrafi',
      desc: 'Tingkat Jawa Timur',
      scope: 'Provinsi',
    })
  })

  it('mempertahankan field content lama yang ada di existingContent', () => {
    const formData: FormState = {
      year: 2025,
      image: '',
      _c_title: 'Juara Pidato',
      _c_desc: '',
      _c_scope: 'Kota',
    }
    const existingContent = {
      legacyField: 'nilai-lama',
      views: 120,
    }

    const payload = buildAchievementPayload({ formData, existingContent })
    const parsed = JSON.parse(payload.content as string)
    expect(parsed.legacyField).toBe('nilai-lama')
    expect(parsed.views).toBe(120)
    expect(parsed.title).toBe('Juara Pidato')
  })
})

describe('achievementFieldFromServerError & resolveAchievementImageSrc', () => {
  it('memetakan pesan server ke field yang relevan', () => {
    expect(achievementFieldFromServerError('Column year is required')).toBe('year')
    expect(achievementFieldFromServerError('Format gambar tidak diizinkan')).toBe('image')
    expect(achievementFieldFromServerError('Judul prestasi terlalu panjang')).toBe('title')
    expect(achievementFieldFromServerError('Terjadi kesalahan database')).toBeNull()
  })

  it('mengatasi resolusi path gambar relatif terhadap API_BASE', () => {
    expect(resolveAchievementImageSrc('/uploads/foto.jpg', 'https://api.example.com')).toBe(
      'https://api.example.com/uploads/foto.jpg',
    )
    expect(resolveAchievementImageSrc('https://cloudinary.com/foto.jpg', 'https://api.example.com')).toBe(
      'https://cloudinary.com/foto.jpg',
    )
    expect(resolveAchievementImageSrc('', 'https://api.example.com')).toBe('')
  })

  it('mengembalikan warna badge yang sesuai dengan tingkat lingkup prestasi', () => {
    expect(getScopeBadgeStyle('Internasional').text).toContain('purple')
    expect(getScopeBadgeStyle('Nasional').text).toContain('blue')
    expect(getScopeBadgeStyle('Provinsi').text).toContain('emerald')
    expect(getScopeBadgeStyle('Kota').text).toContain('amber')
  })
})
