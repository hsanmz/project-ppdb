'use client'

import { useState } from 'react'
import { AlertTriangle, Building2, Save, ShieldCheck } from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Label } from '@/app/components/ui/Label'
import { Textarea } from '@/app/components/ui/Textarea'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/Dialog'
import { Field } from '../CrudFormDialog'
import { TABS } from '../_constants'
import { errorMessage } from '../_types'
import type { FormState, RowRecord } from '../_types'
import {
  buildFacilityPayload,
  facilityFieldFromServerError,
  readFacilityForm,
  serializeFacilityFeatures,
  validateFacilityForm,
  type FacilityFormValues,
} from './facility-form'
import { FacilityCategoryPicker } from './FacilityCategoryPicker'
import { FacilityFeaturesPicker } from './FacilityFeaturesPicker'
import { FacilityImageField } from './FacilityImageField'

interface Props {
  mode: 'create' | 'edit'
  activeTab: string
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
}

const NAME_MAX_LENGTH = 255
const FIELD_CLASS =
  'h-10 rounded-xl border-[var(--border)] bg-white/90 text-sm focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

/**
 * Modal CRUD khusus Fasilitas.
 *
 * Semua isian disusun agar muat dalam satu layar tanpa scroll: dua kolom di
 * desktop (form di kiri, gambar di kanan), header dan footer tetap. Tidak ada
 * blok ringkasan/pratinjau terpisah yang menduplikasi isian. Bila layar benar-
 * benar pendek, hanya body modal yang menggulir sebagai jaring pengaman.
 *
 * Kontrak backend dijaga oleh `facility-form.ts`: hanya `category`, `image`,
 * dan `content` yang dikirim; key `content` lama tidak dibuang.
 */
export function FacilityFormDialog({
  mode, activeTab, editingItem, formData, setFormData, onClose, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  // Snapshot saat mount dipakai untuk mendeteksi perubahan yang belum disimpan.
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)

  const values = readFacilityForm(formData)
  const endpoint = TABS.find((tab) => tab.key === activeTab)?.endpoint ?? '/facilities'

  function update(patch: Partial<FormState>) {
    setFormData({ ...formData, ...patch })
    if (serverError) setServerError('')
  }

  function clearFieldError(name: string) {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function updateValues(patch: Partial<FacilityFormValues>) {
    const next: Partial<FormState> = {}
    if (patch.category !== undefined) {
      next.category = patch.category
      clearFieldError('category')
    }
    if (patch.name !== undefined) next._c_name = patch.name
    if (patch.desc !== undefined) next._c_desc = patch.desc
    if (patch.features !== undefined) next._c_features = serializeFacilityFeatures(patch.features)
    if (patch.image !== undefined) {
      next.image = patch.image
      clearFieldError('image')
    }
    update(next)
  }

  async function requestClose() {
    if (saving) return
    if (!isDirty) {
      onClose()
      return
    }
    const discard = await confirm(UNSAVED_CHANGES_CONFIRM)
    if (discard) onClose()
  }

  async function handleSave() {
    if (saving) return
    if (uploading) {
      toast('error', 'Tunggu unggahan gambar selesai sebelum menyimpan.')
      return
    }

    const errors = validateFacilityForm(values)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setServerError('')
      const firstInvalid = Object.keys(errors)[0]
      document.getElementById(`facility-${firstInvalid}`)?.focus()
      toast('error', 'Periksa lagi kolom yang ditandai merah.')
      return
    }

    setFieldErrors({})
    setServerError('')
    setSaving(true)
    try {
      const existingContent =
        editingItem && typeof editingItem.content === 'object' && editingItem.content !== null
          ? (editingItem.content as Record<string, unknown>)
          : null
      const payload = buildFacilityPayload({ formData, existingContent })

      if (mode === 'edit' && editingItem?.id) {
        await api.updateItem(`${endpoint}/${editingItem.id}`, payload)
      } else {
        await api.createItem(endpoint, payload)
      }

      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Fasilitas berhasil dibuat' : 'Fasilitas berhasil disimpan')
    } catch (e) {
      const message = errorMessage(e, 'Gagal menyimpan fasilitas')
      const field = facilityFieldFromServerError(message)
      setServerError(message)
      if (field) setFieldErrors({ [field]: message })
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  const categoryId = 'facility-category'
  const nameId = 'facility-name'
  const descId = 'facility-desc'
  const featuresId = 'facility-features'
  const imageId = 'facility-image'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
      <DialogContent
        className="flex max-h-[95dvh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)]/95 p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl sm:rounded-2xl"
        aria-describedby="facility-form-description"
      >
        {/* ── Header tetap ── */}
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/50 to-[var(--accent-gold)]/10 px-5 py-3.5 sm:px-6">
          <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" />
          <div className="relative flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]/75 uppercase">
                {mode === 'create' ? 'Tambah Fasilitas' : 'Ubah Fasilitas'}
              </p>
              <DialogTitle className="truncate font-heading text-base font-bold leading-snug text-[var(--text)]">
                {mode === 'edit' && values.name ? values.name : 'Fasilitas Pesantren'}
              </DialogTitle>
              <p id="facility-form-description" className="truncate text-[11px] text-[var(--text-muted)]">
                Hanya kategori yang wajib. Perubahan tampil di halaman publik setelah disimpan.
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]/35 px-5 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
            {/* Kolom kiri */}
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <FacilityCategoryPicker
                  id={categoryId}
                  value={values.category}
                  onChange={(category) => updateValues({ category })}
                  error={fieldErrors.category}
                />

                <Field label="Nama fasilitas" htmlFor={nameId}>
                  <input
                    id={nameId}
                    type="text"
                    value={values.name}
                    maxLength={NAME_MAX_LENGTH}
                    onChange={(event) => updateValues({ name: event.target.value })}
                    placeholder="Contoh: Perpustakaan Digital"
                    className={cn(FIELD_CLASS, 'w-full border px-3 text-[var(--text)] transition-colors placeholder:text-[var(--text-muted)] focus:outline-none')}
                  />
                </Field>
              </div>

              <Field label="Deskripsi" htmlFor={descId}>
                <Textarea
                  id={descId}
                  value={values.desc}
                  onChange={(event) => updateValues({ desc: event.target.value })}
                  rows={4}
                  placeholder="Ceritakan fungsi, suasana, dan hal menarik dari fasilitas ini…"
                  className="min-h-[6.5rem] resize-y rounded-xl border-[var(--border)] bg-white/90 leading-relaxed focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0"
                />
                <p className="text-[10px] text-[var(--text-muted)]">
                  Baris baru dipertahankan saat ditampilkan di halaman publik.
                </p>
              </Field>

              <FacilityFeaturesPicker
                id={featuresId}
                value={values.features}
                onChange={(features) => updateValues({ features })}
                category={values.category}
              />
            </div>

            {/* Kolom kanan */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={imageId} className="block text-[13px] font-medium text-[var(--text-secondary)]">
                  Gambar utama
                  <span className="ml-1 text-[11px] font-normal text-[var(--text-muted)]">(opsional)</span>
                </Label>
                <span className="shrink-0 text-[10px] text-[var(--text-muted)]">Tampil di kartu publik</span>
              </div>
              <FacilityImageField
                id={imageId}
                value={values.image}
                onChange={(image) => updateValues({ image })}
                onUploadingChange={setUploading}
                error={fieldErrors.image}
              />
            </div>
          </div>
        </div>

        {/* ── Footer tetap ── */}
        <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/80 px-5 py-3 backdrop-blur sm:px-6">
          {serverError && (
            <p
              role="alert"
              className="mb-2.5 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-600"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {serverError}
            </p>
          )}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {isDirty ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Perubahan belum disimpan
              </p>
            ) : (
              <p className="hidden items-center gap-1.5 text-xs text-[var(--text-muted)] sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                Kolom bertanda <span className="text-red-500">*</span> wajib diisi.
              </p>
            )}
            <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
              <Button
                variant="ghost"
                onClick={() => void requestClose()}
                className="h-10 rounded-xl text-[var(--text-secondary)]"
              >
                Batal
              </Button>
              <Button
                onClick={() => void handleSave()}
                loading={saving}
                disabled={saving || uploading}
                className="h-10 min-w-[140px] gap-2 rounded-xl"
              >
                {!saving && <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan…' : uploading ? 'Mengunggah…' : mode === 'create' ? 'Simpan Fasilitas' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
