import { describe, it, expect } from 'vitest'

import { ORDER_SOURCE, sortRowsByOrder } from '../admin/dashboard/_constants'
import type { RowRecord } from '../admin/dashboard/_types'

/**
 * Tab PPDB & staff menyimpan urutan di dalam JSON `content` (tabelnya tidak
 * punya kolom `order`), jadi backend tidak bisa mengurutkannya. Tabel admin
 * harus mengurutkan sendiri supaya urutannya sama dengan situs publik.
 */
describe('sortRowsByOrder — urutan baris tabel dashboard', () => {
  it('mengurutkan entitas ber-kolom order berdasarkan kolomnya', () => {
    const rows: RowRecord[] = [
      { id: 'c', order: 3 },
      { id: 'a', order: 1 },
      { id: 'b', order: 2 },
    ]
    expect(sortRowsByOrder('programs', rows).map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('mengurutkan entitas PPDB berdasarkan content.order', () => {
    const rows: RowRecord[] = [
      { id: 'c', content: { order: 3 } },
      { id: 'a', content: { order: 1 } },
      { id: 'b', content: { order: 2 } },
    ]
    expect(sortRowsByOrder('ppdb-steps', rows).map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('menerima angka dalam bentuk string (input form)', () => {
    const rows: RowRecord[] = [
      { id: 'b', content: { order: '10' } },
      { id: 'a', content: { order: '2' } },
    ]
    expect(sortRowsByOrder('ppdb-jalur', rows).map((r) => r.id)).toEqual(['a', 'b'])
  })

  it('menempatkan baris tanpa nilai urutan di akhir secara stabil', () => {
    const rows: RowRecord[] = [
      { id: 'no-1' },
      { id: 'ordered', content: { order: 1 } },
      { id: 'no-2' },
    ]
    expect(sortRowsByOrder('ppdb-pillars', rows).map((r) => r.id)).toEqual([
      'ordered',
      'no-1',
      'no-2',
    ])
  })

  it('tidak menyentuh entitas tanpa konsep urutan', () => {
    const rows: RowRecord[] = [{ id: 'x' }, { id: 'y' }]
    expect(sortRowsByOrder('news', rows).map((r) => r.id)).toEqual(['x', 'y'])
    expect(sortRowsByOrder('gallery', rows)).toBe(rows)
  })

  it('mencakup seluruh entitas yang punya konsep urutan', () => {
    expect(Object.keys(ORDER_SOURCE).sort()).toEqual([
      'hero',
      'ppdb-jalur',
      'ppdb-pillars',
      'ppdb-steps',
      'programs',
      'staff',
      'testimonials',
    ])
  })
})
