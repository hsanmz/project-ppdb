'use client'

import { CategoryPicker } from '@/app/components/ui/CategoryPicker'
import { FACILITY_CATEGORY_OPTIONS } from '@/app/lib/facility-categories'
import { FACILITY_CATEGORY_MAX_LENGTH } from './facility-form'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
}

/**
 * Pemilih kategori fasilitas.
 *
 * Panel pilihan dirender inline (bukan popover mengambang) supaya tidak
 * terpotong oleh kolom form yang punya `overflow-y: auto` sendiri. Pencarian
 * tetap tersedia untuk 18 kategori, dan kategori lama/kustom tidak pernah
 * dibuang diam-diam.
 *
 * Logikanya kini tinggal satu (CategoryPicker bersama); komponen ini hanya
 * memetakan konfigurasi khusus fasilitas ke pemilih tersebut supaya teks yang
 * dilihat admin dan data yang terkirim tidak berubah sama sekali.
 */
export function FacilityCategoryPicker({ id, value, onChange, error }: Props) {
  // Alias lama (mis. "tech") diterjemahkan ke label standar di dalam
  // CategoryPicker, tetapi nilai tersimpan tidak diubah sampai admin
  // memilih kategori baru.
  return (
    <CategoryPicker
      id={id}
      value={value}
      onChange={onChange}
      error={error}
      options={FACILITY_CATEGORY_OPTIONS}
      otherValue="lainnya"
      maxLength={FACILITY_CATEGORY_MAX_LENGTH}
      label="Kategori"
      triggerPlaceholder="Pilih kategori fasilitas"
      listboxAriaLabel="Pilihan kategori fasilitas"
      searchAriaLabel="Cari kategori"
      searchPlaceholder="Cari kategori…"
      helpText="Kategori dipakai untuk filter fasilitas di halaman publik."
      customLabel="Nama kategori khusus"
      customPlaceholder="Contoh: Ruang Server"
      customHelpText="Kategori ini disimpan apa adanya dan tetap dapat diedit nanti."
      paneClassName="facility-form-pane"
      searchMinOptions={0}
    />
  )
}
