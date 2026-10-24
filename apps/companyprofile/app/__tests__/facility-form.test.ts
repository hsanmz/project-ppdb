import { describe, it, expect } from 'vitest'
import type { FormState } from '../admin/dashboard/_types'
import {
  buildFacilityPayload,
  dedupeFacilityFeatures,
  facilityFieldFromServerError,
  formatFileSize,
  parseFacilityFeatures,
  readFacilityForm,
  resolveFacilityImageSrc,
  serializeFacilityFeatures,
  validateFacilityForm,
  validateFacilityImageFile,
  validateFacilityImageUrl,
  FACILITY_IMAGE_MAX_BYTES,
} from '../admin/dashboard/facilities/facility-form'

const BASE_FORM: FormState = {
  category: 'perpustakaan-literasi',
  image: 'https://cdn.example.com/perpustakaan.jpg',
  _c_name: 'Perpustakaan Digital',
  _c_desc: 'Lantai satu untuk buku.\nLantai dua untuk diskusi.',
  _c_features: 'Rak Buku\nMeja Baca',
}

describe('readFacilityForm', () => {
  it('membaca nilai form dashboard tanpa mengubah baris baru deskripsi', () => {
    const values = readFacilityForm(BASE_FORM)
    expect(values.category).toBe('perpustakaan-literasi')
    expect(values.name).toBe('Perpustakaan Digital')
    expect(values.desc).toBe('Lantai satu untuk buku.\nLantai dua untuk diskusi.')
    expect(values.features).toEqual(['Rak Buku', 'Meja Baca'])
  })

  it('memangkas spasi di kategori dan gambar', () => {
    const values = readFacilityForm({
      category: '  laboratorium  ',
      image: '  /uploads/foto.jpg  ',
      _c_name: '',
      _c_desc: '',
      _c_features: '',
    })
    expect(values.category).toBe('laboratorium')
    expect(values.image).toBe('/uploads/foto.jpg')
  })
})

describe('fitur fasilitas', () => {
  it('menerima string satu-per-baris maupun array', () => {
    expect(parseFacilityFeatures('AC\nWiFi\n\nAC')).toEqual(['AC', 'WiFi'])
    expect(parseFacilityFeatures(['AC', 'WiFi'])).toEqual(['AC', 'WiFi'])
    expect(parseFacilityFeatures(null)).toEqual([])
  })

  it('membuang duplikat tanpa membedakan kapitalisasi dan mempertahankan urutan', () => {
    expect(dedupeFacilityFeatures(['AC', 'ac', ' WiFi ', '', 'Wifi'])).toEqual(['AC', 'WiFi'])
  })

  it('serialisasi balik ke format satu-per-baris dashboard', () => {
    expect(serializeFacilityFeatures(['AC', 'ac', 'WiFi'])).toBe('AC\nWiFi')
  })
})

describe('validateFacilityForm', () => {
  it('tidak menandai field opsional yang kosong', () => {
    expect(validateFacilityForm({ category: 'lainnya', name: '', desc: '', features: [], image: '' })).toEqual({})
  })

  it('mewajibkan kategori karena backend menolak create tanpa kategori', () => {
    const errors = validateFacilityForm({ category: '', name: 'Aula', desc: '', features: [], image: '' })
    expect(errors.category).toMatch(/wajib/i)
  })

  it('menolak kategori yang melebihi lebar kolom 100 karakter', () => {
    const errors = validateFacilityForm({
      category: 'x'.repeat(101),
      name: '',
      desc: '',
      features: [],
      image: '',
    })
    expect(errors.category).toMatch(/100/)
  })

  it('menolak URL gambar yang tidak valid tetapi menerima path unggahan lokal', () => {
    const withBadUrl = validateFacilityForm({
      category: 'lainnya', name: '', desc: '', features: [], image: 'bukan-url',
    })
    expect(withBadUrl.image).toMatch(/tidak valid/i)

    const withLocalPath = validateFacilityForm({
      category: 'lainnya', name: '', desc: '', features: [], image: '/uploads/abc.jpg',
    })
    expect(withLocalPath.image).toBeUndefined()
  })
})

describe('validateFacilityImageUrl', () => {
  it('menerima http/https dan path absolut', () => {
    expect(validateFacilityImageUrl('')).toBeNull()
    expect(validateFacilityImageUrl('https://cdn.example.com/a.jpg')).toBeNull()
    expect(validateFacilityImageUrl('http://localhost:8000/uploads/a.jpg')).toBeNull()
    expect(validateFacilityImageUrl('/uploads/a.jpg')).toBeNull()
  })

  it('menolak protokol selain http/https dan URL protocol-relative', () => {
    expect(validateFacilityImageUrl('ftp://cdn.example.com/a.jpg')).toMatch(/http/i)
    expect(validateFacilityImageUrl('javascript:alert(1)')).toMatch(/http/i)
    expect(validateFacilityImageUrl('//cdn.example.com/a.jpg')).toMatch(/tidak valid/i)
  })

  it('menolak URL yang melebihi lebar kolom 255 karakter', () => {
    expect(validateFacilityImageUrl(`https://a.com/${'x'.repeat(250)}`)).toMatch(/255/)
  })
})

describe('validateFacilityImageFile', () => {
  it('menerima gambar dengan tipe dan ukuran yang didukung', () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' })
    expect(validateFacilityImageFile(file)).toBeNull()
  })

  it('menolak tipe file yang tidak diizinkan backend', () => {
    const file = new File(['x'], 'dokumen.pdf', { type: 'application/pdf' })
    expect(validateFacilityImageFile(file)).toMatch(/format/i)
  })

  it('menolak file di atas 10 MB', () => {
    const file = new File([new ArrayBuffer(FACILITY_IMAGE_MAX_BYTES + 1)], 'besar.jpg', {
      type: 'image/jpeg',
    })
    expect(validateFacilityImageFile(file)).toMatch(/10 MB/)
  })

  it('menolak file kosong', () => {
    const file = new File([], 'kosong.jpg', { type: 'image/jpeg' })
    expect(validateFacilityImageFile(file)).toMatch(/kosong/i)
  })

  it('memformat ukuran file untuk pesan bantuan', () => {
    expect(formatFileSize(0)).toBe('0 KB')
    expect(formatFileSize(2048)).toBe('2 KB')
    expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB')
  })
})

describe('buildFacilityPayload', () => {
  it('mengirim hanya kolom yang di-whitelist backend', () => {
    const payload = buildFacilityPayload({ formData: BASE_FORM })
    expect(Object.keys(payload).sort()).toEqual(['category', 'content', 'image'])
    expect(payload.category).toBe('perpustakaan-literasi')
    expect(payload.image).toBe('https://cdn.example.com/perpustakaan.jpg')

    const content = JSON.parse(String(payload.content))
    expect(content.name).toBe('Perpustakaan Digital')
    expect(content.desc).toContain('\n')
    expect(content.features).toEqual(['Rak Buku', 'Meja Baca'])
  })

  it('mempertahankan key content lama yang tidak dikelola form', () => {
    const payload = buildFacilityPayload({
      formData: BASE_FORM,
      existingContent: { name: 'Lama', kapasitas: 40, catatan: 'jangan hilang' },
    })
    const content = JSON.parse(String(payload.content))
    expect(content.kapasitas).toBe(40)
    expect(content.catatan).toBe('jangan hilang')
    expect(content.name).toBe('Perpustakaan Digital')
  })

  it('menyimpan fitur sebagai array kosong bila tidak ada', () => {
    const payload = buildFacilityPayload({
      formData: { ...BASE_FORM, _c_features: '' },
    })
    expect(JSON.parse(String(payload.content)).features).toEqual([])
  })
})

describe('facilityFieldFromServerError', () => {
  it('memetakan pesan backend ke field yang tepat', () => {
    expect(facilityFieldFromServerError('category: field required')).toBe('category')
    expect(facilityFieldFromServerError('Kategori terlalu panjang')).toBe('category')
    expect(facilityFieldFromServerError('image too long')).toBe('image')
    expect(facilityFieldFromServerError('Server sedang sibuk')).toBeNull()
  })
})

describe('resolveFacilityImageSrc', () => {
  it('mengarahkan path unggahan lokal ke origin API', () => {
    expect(resolveFacilityImageSrc('/uploads/a.jpg', 'http://localhost:8000/')).toBe(
      'http://localhost:8000/uploads/a.jpg',
    )
  })

  it('membiarkan URL absolut dan nilai kosong apa adanya', () => {
    expect(resolveFacilityImageSrc('https://cdn.example.com/a.jpg', 'http://localhost:8000')).toBe(
      'https://cdn.example.com/a.jpg',
    )
    expect(resolveFacilityImageSrc('', 'http://localhost:8000')).toBe('')
  })
})
