/**
 * Deteksi perubahan form yang belum disimpan.
 *
 * Dipakai `CrudFormDialog` dan `ProfileModal` untuk:
 * 1. Menandai form sebagai "belum disimpan" (indikator di footer modal).
 * 2. Menginterrupt proses tutup (Escape / tombol X / klik area gelap) dengan
 *    konfirmasi, supaya input admin tidak hilang diam-diam.
 */

/** Opsi konfirmasi "buang perubahan" — dipakai kedua form agar konsisten. */
export const UNSAVED_CHANGES_CONFIRM = {
  title: 'Perubahan belum disimpan',
  message:
    'Perubahan pada form ini belum disimpan ke server. Tutup dan buang perubahan?',
  confirmLabel: 'Buang Perubahan',
  cancelLabel: 'Kembali ke Form',
  variant: 'danger',
} as const

/**
 * True bila `current` berbeda dari `initial`.
 *
 * Nilai form pada kedua form ini selalu string, angka, atau array string.
 * `undefined` disamakan dengan string kosong supaya field yang belum pernah
 * disentuh tidak dianggap berubah.
 */
export function isFormDirty(
  current: Record<string, unknown>,
  initial: Record<string, unknown>,
): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(initial)])
  for (const key of keys) {
    const a = current[key]
    const b = initial[key]
    if (Array.isArray(a) || Array.isArray(b)) {
      if (JSON.stringify(a ?? []) !== JSON.stringify(b ?? [])) return true
      continue
    }
    if (String(a ?? '') !== String(b ?? '')) return true
  }
  return false
}
