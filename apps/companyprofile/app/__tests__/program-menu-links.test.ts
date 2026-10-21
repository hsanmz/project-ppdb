import { describe, it, expect } from 'vitest'

import { MAX_PROGRAM_MENU_LINKS, programMenuLinks, siblingProgramLinks } from '../lib/programs'
import type { Program } from '../lib/types'

const program = (slug: string, title: string): Program =>
  ({ id: `id-${slug}`, slug, icon: '', image: '', content: { title } }) as unknown as Program

describe('programMenuLinks — isi dropdown "Program" (navbar & footer)', () => {
  it('memakai judul & slug dari CMS', () => {
    const links = programMenuLinks([program('tahfidz-intensif', 'Tahfidz Intensif')])
    expect(links).toEqual([{ href: '/programs/tahfidz-intensif', label: 'Tahfidz Intensif' }])
  })

  it('menampilkan program baru yang dibuat panitia di backoffice', () => {
    const links = programMenuLinks([
      program('tahfidz', 'Tahfidz Al-Quran'),
      program('robotik', 'Robotik & AI'),
    ])
    expect(links.map((l) => l.href)).toEqual(['/programs/tahfidz', '/programs/robotik'])
    expect(links.map((l) => l.label)).toEqual(['Tahfidz Al-Quran', 'Robotik & AI'])
  })

  it('tidak lagi memunculkan program bawaan saat CMS berisi data', () => {
    const links = programMenuLinks([program('robotik', 'Robotik & AI')])
    expect(links.some((l) => l.href === '/programs/leadership')).toBe(false)
  })

  it('jatuh ke daftar bawaan saat CMS kosong', () => {
    const links = programMenuLinks([])
    expect(links.map((l) => l.href)).toEqual([
      '/programs/tahfidz-al-quran',
      '/programs/teknologi-digital',
      '/programs/bilingual',
      '/programs/akademi-kepemimpinan',
    ])
    expect(links).toHaveLength(4)
  })

  it('membatasi jumlah item dan menambah tautan "Lihat Semua Program"', () => {
    const many = Array.from({ length: MAX_PROGRAM_MENU_LINKS + 3 }, (_, i) =>
      program(`p${i}`, `Program ${i}`),
    )
    const links = programMenuLinks(many)
    expect(links).toHaveLength(MAX_PROGRAM_MENU_LINKS + 1)
    expect(links.at(-1)).toEqual({ href: '/programs', label: 'Lihat Semua Program' })
  })

  it('mengabaikan baris CMS tanpa judul, lalu jatuh ke daftar bawaan bila tidak ada yang valid', () => {
    const links = programMenuLinks([
      program('tanpa-judul', '   '),
      { id: '', slug: '', icon: '', image: '', content: { title: 'Hantu' } } as unknown as Program,
    ])
    expect(links).toEqual([
      { href: '/programs/tahfidz-al-quran', label: "Tahfidz Al-Qur'an 30 Juz & Ulumul Qur'an" },
      { href: '/programs/teknologi-digital', label: 'Rekayasa Teknologi Digital, Web & IoT' },
      { href: '/programs/bilingual', label: 'Program Bilingual (Bahasa Arab & Inggris Aktif)' },
      { href: '/programs/akademi-kepemimpinan', label: 'Akademi Kepemimpinan, Karakter & Kemandirian Santri' },
    ])
  })
})

describe('siblingProgramLinks — sidebar "Program Lainnya" di halaman detail', () => {
  it('menautkan program lain dan membuang halaman yang sedang dibuka', () => {
    const links = siblingProgramLinks(
      [program('tahfidz', 'Tahfidz Al-Quran'), program('digital', 'Teknologi Digital')],
      'tahfidz',
    )
    expect(links).toEqual([{ href: '/programs/digital', label: 'Teknologi Digital' }])
  })

  it('tidak memakai daftar cadangan bawaan supaya tidak menyesatkan', () => {
    expect(siblingProgramLinks([program('tahfidz', 'Tahfidz Al-Quran')], 'tahfidz')).toEqual([])
    expect(siblingProgramLinks([], 'tahfidz')).toEqual([])
  })

  it('mengabaikan baris CMS tanpa judul atau tanpa slug', () => {
    const links = siblingProgramLinks(
      [
        program('digital', 'Teknologi Digital'),
        program('tanpa-judul', '   '),
        { id: '', slug: '', icon: '', image: '', content: { title: 'Hantu' } } as unknown as Program,
      ],
      'tahfidz',
    )
    expect(links).toEqual([{ href: '/programs/digital', label: 'Teknologi Digital' }])
  })

  it('membatasi jumlah tautan tanpa menambahkan item "Lihat Semua Program"', () => {
    const many = Array.from({ length: MAX_PROGRAM_MENU_LINKS + 3 }, (_, i) =>
      program(`p${i}`, `Program ${i}`),
    )
    const links = siblingProgramLinks(many, 'tidak-ada')
    expect(links).toHaveLength(MAX_PROGRAM_MENU_LINKS)
    expect(links.some((l) => l.href === '/programs')).toBe(false)
  })
})
