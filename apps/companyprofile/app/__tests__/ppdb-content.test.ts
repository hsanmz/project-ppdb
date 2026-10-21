import { describe, it, expect } from 'vitest'

import {
  ACCENT_KEYS,
  DEFAULT_PPDB_CONTENT,
  DEFAULT_PPDB_COPY,
  mergeCopy,
  pickAccent,
  resolveIconName,
  sortByOrder,
} from '../lib/ppdbContent'

describe('sortByOrder — urutan konten dari CMS', () => {
  it('mengurutkan naik berdasarkan nilai order', () => {
    const items = [
      { id: 'c', order: 3 },
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
    ]
    expect(sortByOrder(items, (i) => i.order).map((i) => i.id)).toEqual(['a', 'b', 'c'])
  })

  it('menerima angka dalam bentuk string (input form)', () => {
    const items = [{ id: 'b', order: '10' }, { id: 'a', order: '2' }]
    expect(sortByOrder(items, (i) => i.order).map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('menempatkan item tanpa order di akhir dan stabil terhadap urutan awal', () => {
    const items = [
      { id: 'no-1' },
      { id: 'ordered', order: 1 },
      { id: 'no-2' },
    ]
    expect(sortByOrder(items, (i) => i.order).map((i) => i.id)).toEqual([
      'ordered',
      'no-1',
      'no-2',
    ])
  })

  it('tidak mengubah array sumber', () => {
    const items = [{ id: 'b', order: 2 }, { id: 'a', order: 1 }]
    sortByOrder(items, (i) => i.order)
    expect(items.map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('mergeCopy — teks seksi & CTA', () => {
  it('mengembalikan default saat baris kosong/null', () => {
    expect(mergeCopy(null)).toEqual(DEFAULT_PPDB_COPY)
    expect(mergeCopy(undefined)).toEqual(DEFAULT_PPDB_COPY)
  })

  it('menimpa default hanya dengan nilai yang terisi', () => {
    const merged = mergeCopy({ cta_title: 'Judul Baru', cta_desc: '   ' })
    expect(merged.cta_title).toBe('Judul Baru')
    // whitespace-only tidak menimpa default
    expect(merged.cta_desc).toBe(DEFAULT_PPDB_COPY.cta_desc)
    expect(merged.jalur_title).toBe(DEFAULT_PPDB_COPY.jalur_title)
  })

  it('tidak membocorkan key asing dari API', () => {
    const merged = mergeCopy({ tidak_dikenal: 'x' } as never)
    expect(merged).toEqual(DEFAULT_PPDB_COPY)
  })

  it('memuat default copy hero 3D walau baris CMS belum punya field-nya', () => {
    const merged = mergeCopy({ cta_title: 'Judul Baru' })
    expect(merged.hero_title).toBe(DEFAULT_PPDB_COPY.hero_title)
    expect(merged.hero_title).toContain('Rekayasa Teknologi')
    expect(merged.hero_desc).toBeTruthy()
    expect(merged.hero_cta_href).toBe('/register')
    expect(merged.hero_register_href).toBe('/register')
  })
})

describe('resolveIconName — nama ikon lucide dari CMS', () => {
  it('cocok tanpa peduli huruf besar/kecil dan spasi', () => {
    expect(resolveIconName('award')).toBe('Award')
    expect(resolveIconName('  BOOKOPEN ')).toBe('BookOpen')
  })

  it('jatuh ke Sparkles untuk nama tak dikenal / kosong', () => {
    expect(resolveIconName('IkonAjaib')).toBe('Sparkles')
    expect(resolveIconName('')).toBe('Sparkles')
    expect(resolveIconName(null)).toBe('Sparkles')
  })
})

describe('pickAccent — warna aksen kartu jalur', () => {
  it('mengembalikan aksen yang dikenal', () => {
    for (const key of ACCENT_KEYS) {
      expect(pickAccent(key)).toBe(key)
    }
    expect(pickAccent('AMBER')).toBe('amber')
  })

  it('jatuh ke emerald untuk aksen tak dikenal', () => {
    expect(pickAccent('merah-neon')).toBe('emerald')
    expect(pickAccent(undefined)).toBe('emerald')
  })
})

describe('DEFAULT_PPDB_CONTENT — cermin seed migrasi 0042 + kit 0045', () => {
  it('memuat konten lengkap walau API tidak terjangkau', () => {
    expect(DEFAULT_PPDB_CONTENT.jalur).toHaveLength(4)
    expect(DEFAULT_PPDB_CONTENT.pillars).toHaveLength(4)
    expect(DEFAULT_PPDB_CONTENT.steps).toHaveLength(4)
    for (const step of DEFAULT_PPDB_CONTENT.steps) {
      expect(step.content?.title).toBeTruthy()
      expect(step.content?.desc).toBeTruthy()
    }
  })

  it('tidak lagi mengandung entitas HTML &apos; yang bocor', () => {
    const serialized = JSON.stringify(DEFAULT_PPDB_CONTENT)
    expect(serialized).not.toContain('&apos;')
  })
})
