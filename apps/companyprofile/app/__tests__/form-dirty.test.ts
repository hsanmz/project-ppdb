import { describe, it, expect } from 'vitest'

import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '../lib/form-dirty'

describe('isFormDirty — deteksi perubahan belum disimpan', () => {
  it('form yang sama dianggap tidak berubah', () => {
    expect(isFormDirty({ a: 'x', b: '' }, { a: 'x', b: '' })).toBe(false)
  })

  it('nilai berbeda dianggap berubah', () => {
    expect(isFormDirty({ a: 'x' }, { a: 'y' })).toBe(true)
  })

  it('undefined disamakan dengan string kosong', () => {
    expect(isFormDirty({ a: undefined }, { a: '' })).toBe(false)
    expect(isFormDirty({ a: '' }, { a: undefined })).toBe(false)
  })

  it('kunci yang hanya ada di salah satu sisi dianggap berubah', () => {
    expect(isFormDirty({ a: '1', b: '2' }, { a: '1' })).toBe(true)
    expect(isFormDirty({ a: '1' }, { a: '1', b: '' })).toBe(false)
  })

  it('array dibandingkan isinya, bukan identitasnya', () => {
    expect(isFormDirty({ g: ['a', 'b'] }, { g: ['a', 'b'] })).toBe(false)
    expect(isFormDirty({ g: ['a', 'b'] }, { g: ['a'] })).toBe(true)
    expect(isFormDirty({ g: [] }, { g: undefined })).toBe(false)
  })

  it('angka 0 dianggap berbeda dari string kosong', () => {
    expect(isFormDirty({ n: 0 }, { n: '' })).toBe(true)
  })
})

describe('UNSAVED_CHANGES_CONFIRM — opsi konfirmasi buang perubahan', () => {
  it('menyediakan label yang jelas dan berisiko', () => {
    expect(UNSAVED_CHANGES_CONFIRM.title).toBe('Perubahan belum disimpan')
    expect(UNSAVED_CHANGES_CONFIRM.confirmLabel).toBe('Buang Perubahan')
    expect(UNSAVED_CHANGES_CONFIRM.cancelLabel).toBe('Kembali ke Form')
    expect(UNSAVED_CHANGES_CONFIRM.variant).toBe('danger')
  })
})
