import { describe, it, expect } from 'vitest'

import {
  ACCENT_KEYS,
  STATIC_PPDB_CONTENT,
  STATIC_PPDB_COPY,
  pickAccent,
  resolveIconName,
} from '../lib/ppdbContent'

describe('resolveIconName — nama ikon lucide', () => {
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

describe('STATIC_PPDB_CONTENT — konten statis halaman /ppdb', () => {
  it('memuat konten lengkap tanpa bergantung pada CMS/API', () => {
    expect(STATIC_PPDB_CONTENT.jalur).toHaveLength(4)
    expect(STATIC_PPDB_CONTENT.pillars).toHaveLength(4)
    expect(STATIC_PPDB_CONTENT.steps).toHaveLength(4)
    for (const step of STATIC_PPDB_CONTENT.steps) {
      expect(step.content?.title).toBeTruthy()
      expect(step.content?.desc).toBeTruthy()
    }
  })

  it('urutan item statis sudah naik dan konsisten', () => {
    for (const group of [STATIC_PPDB_CONTENT.jalur, STATIC_PPDB_CONTENT.pillars, STATIC_PPDB_CONTENT.steps]) {
      for (let i = 0; i < group.length; i += 1) {
        expect(group[i].content?.order).toBe(i + 1)
      }
    }
  })

  it('setiap jalur punya judul, deskripsi, dan CTA menuju /register', () => {
    for (const card of STATIC_PPDB_CONTENT.jalur) {
      expect(card.content?.title).toBeTruthy()
      expect(card.content?.desc).toBeTruthy()
      expect(card.content?.cta_href).toBe('/register')
    }
  })

  it('tidak lagi mengandung entitas HTML &apos; yang bocor', () => {
    const serialized = JSON.stringify(STATIC_PPDB_CONTENT)
    expect(serialized).not.toContain('&apos;')
  })
})

describe('STATIC_PPDB_COPY — teks seksi & CTA', () => {
  it('memuat copy hero 3D lengkap', () => {
    expect(STATIC_PPDB_COPY.hero_title).toContain('Rekayasa Teknologi')
    expect(STATIC_PPDB_COPY.hero_desc).toBeTruthy()
    expect(STATIC_PPDB_COPY.hero_cta_href).toBe('/register')
    expect(STATIC_PPDB_COPY.hero_register_href).toBe('/register')
  })
})
