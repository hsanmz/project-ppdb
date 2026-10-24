'use client'

import { CategoryPicker } from '@/app/components/ui/CategoryPicker'
import {
  GALLERY_CATEGORY_OPTIONS,
  GALLERY_CATEGORY_OTHER,
} from '@/app/lib/gallery-categories'
import { GALLERY_CATEGORY_MAX_LENGTH } from './gallery-form'

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  error?: string
}

/**
 * Pemilih kategori galeri — konfigurasi dari `app/lib/gallery-categories.ts`.
 *
 * Panel inline & dukungan keyboard identik dengan pemilih kategori fasilitas
 * (satu komponen inti bersama). Kategori lama yang tidak ada di daftar tetap
 * tampil sebagai "Kustom" dan tidak dibuang diam-diam.
 */
export function GalleryCategoryPicker({ id, value, onChange, error }: Props) {
  return (
    <CategoryPicker
      id={id}
      value={value}
      onChange={onChange}
      error={error}
      options={GALLERY_CATEGORY_OPTIONS}
      otherValue={GALLERY_CATEGORY_OTHER}
      maxLength={GALLERY_CATEGORY_MAX_LENGTH}
      required
      label="Kategori"
      triggerPlaceholder="Pilih kategori galeri"
      listboxAriaLabel="Pilihan kategori galeri"
      searchAriaLabel="Cari kategori"
      searchPlaceholder="Cari kategori…"
      helpText="Kategori membantu mengelompokkan dokumentasi kegiatan di galeri."
      customLabel="Kategori Lainnya"
      customPlaceholder="Contoh: Pelepasan Santri Baru"
      customHelpText="Kategori khusus disimpan apa adanya dan tetap dapat diedit nanti."
      paneClassName="gallery-form-pane"
    />
  )
}
