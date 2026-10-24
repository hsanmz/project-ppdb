import { describe, expect, it } from 'vitest'
import {
  buildTestimonialPayload,
  nextTestimonialOrder,
  parseTestimonialOrder,
  readTestimonialForm,
  testimonialFieldsFromServerError,
  testimonialQuoteFromContent,
  validateTestimonialForm,
} from '../admin/dashboard/testimonials/testimonial-form'
import type { RowRecord } from '../admin/dashboard/_types'

const VALID = {
  name: 'Bapak Ahmad Fauzi',
  child: 'Muhammad Rizki',
  order: '3',
  quote: 'Anak saya tumbuh percaya diri.',
  image: '',
}

describe('parseTestimonialOrder', () => {
  it('menerima bilangan bulat nol atau lebih', () => {
    expect(parseTestimonialOrder('0')).toEqual({ value: 0 })
    expect(parseTestimonialOrder(' 12 ')).toEqual({ value: 12 })
  })

  it('menolak kosong, desimal, minus, dan teks', () => {
    for (const raw of ['', '  ', '1.5', '-2', '1e3', 'abc']) {
      expect(parseTestimonialOrder(raw).error).toBeTruthy()
    }
  })

  it('menolak angka di luar batas integer MySQL', () => {
    expect(parseTestimonialOrder('2147483648').error).toBe('Angka urutan terlalu besar.')
  })
})

describe('readTestimonialForm', () => {
  it('mengubah nilai form menjadi string dan memangkas URL foto', () => {
    expect(
      readTestimonialForm({
        name: 'Ibu Siti',
        child: 'Aisyah',
        order: 7,
        _c_quote: 'Kutipan',
        image: '  https://cdn.example.com/a.jpg  ',
      }),
    ).toEqual({
      name: 'Ibu Siti',
      child: 'Aisyah',
      order: '7',
      quote: 'Kutipan',
      image: 'https://cdn.example.com/a.jpg',
    })
  })
})

describe('testimonialQuoteFromContent', () => {
  it('memprioritaskan quote dan memakai text lama sebagai fallback', () => {
    expect(testimonialQuoteFromContent({ quote: 'Baru', text: 'Lama' })).toBe('Baru')
    expect(testimonialQuoteFromContent({ quote: '   ', text: 'Lama' })).toBe('Lama')
    expect(testimonialQuoteFromContent({ text: 'Lama' })).toBe('Lama')
    expect(testimonialQuoteFromContent(null)).toBe('')
  })
})

describe('nextTestimonialOrder', () => {
  it('mengambil satu langkah setelah urutan terbesar', () => {
    const rows = [{ order: 2 }, { order: 9 }, { order: 4 }] as RowRecord[]
    expect(nextTestimonialOrder(rows)).toBe(10)
  })

  it('mengabaikan nilai tidak valid dan mulai dari 0 bila kosong', () => {
    expect(nextTestimonialOrder([])).toBe(0)
    const rows = [{}, { order: 'abc' }, { order: 1.5 }, { order: 3 }] as RowRecord[]
    expect(nextTestimonialOrder(rows)).toBe(4)
  })
})

describe('validateTestimonialForm', () => {
  it('mewajibkan nama wali dan nama anak', () => {
    const errors = validateTestimonialForm({ ...VALID, name: '  ', child: '' })
    expect(errors.name).toBe('Nama wali santri wajib diisi.')
    expect(errors.child).toBe('Nama anak / santri wajib diisi.')
  })

  it('tidak mewajibkan kutipan maupun foto', () => {
    expect(validateTestimonialForm({ ...VALID, quote: '', image: '' })).toEqual({})
  })

  it('menolak URL foto yang tidak valid tanpa memblokir data lain', () => {
    expect(validateTestimonialForm({ ...VALID, image: 'bukan-url' }).image).toBeTruthy()
    expect(validateTestimonialForm({ ...VALID, image: '/uploads/foto.jpg' })).toEqual({})
  })
})

describe('buildTestimonialPayload', () => {
  it('mengirim kontrak API dan menyimpan kutipan di content.quote', () => {
    const payload = buildTestimonialPayload({
      formData: {
        name: 'Bapak Ahmad Fauzi',
        child: 'Muhammad Rizki',
        order: '2',
        _c_quote: 'Pengalaman yang baik.',
        image: '/uploads/wali.jpg',
      },
    })

    expect(Object.keys(payload).sort()).toEqual(['child', 'content', 'image', 'name', 'order'])
    expect(payload).toMatchObject({
      name: 'Bapak Ahmad Fauzi',
      child: 'Muhammad Rizki',
      order: 2,
      image: '/uploads/wali.jpg',
    })
    expect(JSON.parse(String(payload.content))).toEqual({ quote: 'Pengalaman yang baik.' })
  })

  it('mempertahankan key content lama saat edit', () => {
    const payload = buildTestimonialPayload({
      formData: { ...VALID, _c_quote: 'Kutipan baru' },
      existingContent: { text: 'Kutipan lama', badge: 'Alumni' },
    })
    expect(JSON.parse(String(payload.content))).toEqual({
      text: 'Kutipan lama',
      badge: 'Alumni',
      quote: 'Kutipan baru',
    })
  })
})

describe('testimonialFieldsFromServerError', () => {
  it('memetakan pesan backend ke field form', () => {
    expect(testimonialFieldsFromServerError("Missing required field(s) for 'testimonials': child, name")).toEqual([
      'name',
      'child',
    ])
    expect(testimonialFieldsFromServerError('Nilai urutan tidak valid')).toEqual(['order'])
    expect(testimonialFieldsFromServerError('Kesalahan tak dikenal')).toEqual([])
  })
})
