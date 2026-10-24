import { describe, it, expect } from 'vitest'
import {
  FACILITY_CATEGORY_OPTIONS,
  FACILITY_CATEGORY_ALIASES,
  COMMON_FACILITY_FEATURES,
  facilityCategoryKey,
  facilityCategoryLabel,
  findFacilityCategory,
  isOtherFacilityCategory,
  isStandardFacilityCategory,
  suggestedFacilityFeatures,
} from '../lib/facility-categories'

describe('facility-categories — pemetaan nilai tersimpan', () => {
  it('mengembalikan label standar untuk kunci standar', () => {
    expect(facilityCategoryLabel('akademik-pendidikan')).toBe('Akademik & Pendidikan')
    expect(facilityCategoryLabel('ibadah-keagamaan')).toBe('Ibadah & Keagamaan')
  })

  it('memetakan alias lama ke label standar tanpa mengubah nilai', () => {
    expect(facilityCategoryLabel('tech')).toBe('Teknologi & Digital')
    expect(facilityCategoryLabel('worship')).toBe('Ibadah & Keagamaan')
    expect(facilityCategoryKey('tech')).toBe('teknologi-digital')
    // Nilai asli tetap yang dipakai backend; helper tidak menormalkan data.
    expect(findFacilityCategory('tech')?.value).toBe('teknologi-digital')
  })

  it('menerima label yang tersimpan sebagai nilai kategori', () => {
    expect(facilityCategoryKey('Akademik & Pendidikan')).toBe('akademik-pendidikan')
  })

  it('mempertahankan kategori kustom yang tidak dikenal apa adanya', () => {
    expect(facilityCategoryLabel('Ruang Server')).toBe('Ruang Server')
    expect(facilityCategoryKey('Ruang Server')).toBe('ruang server')
    expect(isStandardFacilityCategory('Ruang Server')).toBe(false)
  })

  it('mengenali varian "Lainnya" dan menandainya sebagai kategori lain', () => {
    expect(isOtherFacilityCategory('lainnya')).toBe(true)
    expect(isOtherFacilityCategory('Lainnya')).toBe(true)
    expect(isOtherFacilityCategory('other')).toBe(true)
    expect(isOtherFacilityCategory('laboratorium')).toBe(false)
  })

  it('menangani nilai kosong tanpa melempar error', () => {
    expect(facilityCategoryLabel('')).toBe('')
    expect(facilityCategoryKey(null)).toBe('')
    expect(findFacilityCategory(undefined)).toBeNull()
  })
})

describe('facility-categories — konfigurasi', () => {
  it('tidak punya nilai kategori duplikat', () => {
    const values = FACILITY_CATEGORY_OPTIONS.map((option) => option.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('setiap alias menunjuk ke kategori yang benar-benar ada', () => {
    const values = new Set(FACILITY_CATEGORY_OPTIONS.map((option) => option.value))
    for (const target of Object.values(FACILITY_CATEGORY_ALIASES)) {
      expect(values.has(target)).toBe(true)
    }
  })

  it('saran kontekstual didahulukan dan tidak diulang di saran umum', () => {
    const { contextual, common } = suggestedFacilityFeatures('perpustakaan-literasi')
    expect(contextual.length).toBeGreaterThan(0)
    expect(contextual).toContain('Rak Buku')
    const commonKeys = common.map((feature) => feature.toLowerCase())
    for (const feature of contextual) {
      expect(commonKeys).not.toContain(feature.toLowerCase())
    }
    expect(common.length).toBeGreaterThan(0)
  })

  it('kategori tanpa fitur khusus tetap mendapat saran umum', () => {
    const { contextual, common } = suggestedFacilityFeatures('lainnya')
    expect(contextual).toEqual([])
    expect(common.length).toBe(COMMON_FACILITY_FEATURES.length)
  })
})
