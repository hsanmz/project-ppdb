'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  Award,
  Calendar,
  FileText,
  Save,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Label } from '@/app/components/ui/Label'
import { Textarea } from '@/app/components/ui/Textarea'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/Dialog'
import { TABS } from '../_constants'
import { errorMessage } from '../_types'
import type { FormState, RowRecord } from '../_types'
import {
  ACHIEVEMENT_TITLE_MAX_LENGTH,
  ACHIEVEMENT_YEAR_MAX,
  ACHIEVEMENT_YEAR_MIN,
  achievementFieldFromServerError,
  buildAchievementPayload,
  readAchievementForm,
  validateAchievementForm,
  type AchievementFormValues,
} from './achievement-form'
import { AchievementScopePicker } from './AchievementScopePicker'
import { AchievementImageField } from './AchievementImageField'
import { AchievementCertificateModal } from './AchievementCertificateModal'

interface Props {
  mode: 'create' | 'edit'
  activeTab: string
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
}

const FIELD_CLASS =
  'h-11 rounded-xl border-[var(--border)] bg-white/95 text-sm focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0 transition-colors'

/**
 * Modal CRUD Prestasi (Achievements) dengan Dua Wadah Gulir Mandiri (Two Independent Scroll Containers).
 *
 * Arsitektur UX:
 * 1. Fixed Header: Judul modal, deskripsi, ikon Trophy, dan tombol tutup tetap terlihat.
 * 2. Dua Kolom Mandiri di Desktop (lg:):
 *    - Kolom Kiri: Informasi data prestasi (Tahun, Judul, Lingkup, Deskripsi) dengan scroll vertikal independen.
 *    - Kolom Kanan: Pengunggah & pratinjau sertifikat (Certificate-First) dengan scroll vertikal independen.
 *    - Menggulir kolom kiri TIDAK menggerakkan kolom kanan, dan sebaliknya.
 * 3. Fixed Footer: Peringatan perubahan belum disimpan, tombol Batal, dan tombol Simpan tetap terlihat di bawah.
 */
export function AchievementFormDialog({
  mode,
  activeTab,
  editingItem,
  formData,
  setFormData,
  onClose,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [inspectUrl, setInspectUrl] = useState<string | null>(null)

  // Snapshot form saat dibuka untuk mendeteksi perubahan yang belum disimpan (anti-loss UX)
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)

  const values = readAchievementForm(formData)
  const endpoint = TABS.find((tab) => tab.key === activeTab)?.endpoint ?? '/achievements'

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

  function updateValues(patch: Partial<AchievementFormValues>) {
    const next: Partial<FormState> = {}

    if (patch.year !== undefined) {
      next.year = patch.year
      clearFieldError('year')
    }
    if (patch.title !== undefined) {
      next._c_title = patch.title
      clearFieldError('title')
    }
    if (patch.desc !== undefined) {
      next._c_desc = patch.desc
      clearFieldError('desc')
    }
    if (patch.scope !== undefined) {
      next._c_scope = patch.scope
      clearFieldError('scope')
    }
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
      toast('error', 'Tunggu proses pengunggahan sertifikat selesai sebelum menyimpan.')
      return
    }

    const errors = validateAchievementForm(values)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setServerError('')
      const firstInvalid = Object.keys(errors)[0]
      document.getElementById(`achievement-${firstInvalid}`)?.focus()
      toast('error', 'Periksa kolom yang ditandai merah.')
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

      const payload = buildAchievementPayload({ formData, existingContent })

      if (mode === 'edit' && editingItem?.id) {
        await api.updateItem(`${endpoint}/${editingItem.id}`, payload)
      } else {
        await api.createItem(endpoint, payload)
      }

      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Prestasi berhasil dicatat' : 'Prestasi berhasil diperbarui')
    } catch (e) {
      const message = errorMessage(e, 'Gagal menyimpan prestasi')
      const field = achievementFieldFromServerError(message)
      setServerError(message)
      if (field) setFieldErrors({ [field]: message })
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  const yearId = 'achievement-year'
  const titleId = 'achievement-title'
  const descId = 'achievement-desc'
  const scopeId = 'achievement-scope'
  const imageId = 'achievement-image'

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
        <DialogContent
          className="flex h-[88dvh] max-h-[850px] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)] p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl sm:rounded-2xl"
          aria-describedby="achievement-form-description"
        >
          {/* ── 1. HEADER TETAP (Fixed Modal Header) ── */}
          <div className="relative shrink-0 border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/70 to-[var(--accent-gold)]/15 px-6 py-4">
            <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]">
                  <Trophy className="h-5 w-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="truncate font-heading text-lg font-bold leading-tight text-[var(--text)]">
                    {mode === 'create' ? 'Tambah Prestasi' : 'Edit Prestasi'}
                  </DialogTitle>
                  <p id="achievement-form-description" className="truncate text-xs text-[var(--text-secondary)]">
                    {mode === 'create'
                      ? 'Catat pencapaian dan dokumentasi prestasi institusi.'
                      : 'Perbarui informasi dan dokumentasi prestasi.'}
                  </p>
                </div>
              </div>

              {/* Status Badge Ringkas */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <Award className="h-3.5 w-3.5 text-amber-600" />
                  Prestasi Santri
                </span>
              </div>
            </div>
          </div>

          {/* ── 2. AREA DUA KOLOM DENGAN SCROLL MANDIRI (Two Independent Scroll Containers) ── */}
          <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
            <div className="grid h-full grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] lg:divide-x lg:divide-[var(--border)]/70">

              {/* KOLOM KIRI: Informasi Data Prestasi (Scroll Vertikal Mandiri) */}
              <div className="h-auto lg:h-full lg:min-h-0 lg:overflow-y-auto px-6 py-5 space-y-5 bg-white/40">

                {/* Tahun Prestasi (Input Numerik Kokoh) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={yearId} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      <Calendar className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                      Tahun Prestasi
                      <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {ACHIEVEMENT_YEAR_MIN} – {ACHIEVEMENT_YEAR_MAX}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id={yearId}
                      type="number"
                      min={ACHIEVEMENT_YEAR_MIN}
                      max={ACHIEVEMENT_YEAR_MAX}
                      step={1}
                      value={values.year}
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === '') {
                          updateValues({ year: '' })
                        } else {
                          const parsed = parseInt(val, 10)
                          if (!Number.isNaN(parsed)) updateValues({ year: parsed })
                        }
                      }}
                      placeholder="Contoh: 2026"
                      className={cn(
                        FIELD_CLASS,
                        'w-full border px-3 font-mono font-semibold text-[var(--text)] placeholder:font-sans placeholder:font-normal placeholder:text-[var(--text-muted)] focus:outline-none',
                        fieldErrors.year ? 'border-destructive focus-visible:border-destructive' : 'border-[var(--border)]',
                      )}
                    />
                    <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-500/20 font-mono">
                      TAHUN
                    </div>
                  </div>

                  {fieldErrors.year ? (
                    <p className="text-[11px] font-medium text-destructive">{fieldErrors.year}</p>
                  ) : (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Tahun diraihnya penghargaan atau perlombaan.
                    </p>
                  )}
                </div>

                {/* Judul Prestasi (Input Teks Nyaman) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={titleId} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      <Trophy className="h-3.5 w-3.5 text-[var(--accent)]" />
                      Judul Prestasi
                      <span className="text-xs font-normal text-[var(--text-muted)]">(opsional)</span>
                    </Label>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {values.title.length}/{ACHIEVEMENT_TITLE_MAX_LENGTH}
                    </span>
                  </div>

                  <input
                    id={titleId}
                    type="text"
                    maxLength={ACHIEVEMENT_TITLE_MAX_LENGTH}
                    value={values.title}
                    onChange={(e) => updateValues({ title: e.target.value })}
                    placeholder="Contoh: Juara 1 Musabaqah Hifdzil Qur'an 30 Juz Tingkat Nasional"
                    className={cn(
                      FIELD_CLASS,
                      'w-full border px-3 text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none',
                      fieldErrors.title ? 'border-destructive focus-visible:border-destructive' : 'border-[var(--border)]',
                    )}
                  />

                  {fieldErrors.title ? (
                    <p className="text-[11px] font-medium text-destructive">{fieldErrors.title}</p>
                  ) : null}
                </div>

                {/* Lingkup / Tingkat Prestasi (Pemilih Terpusat Berstandar) */}
                <AchievementScopePicker
                  id={scopeId}
                  value={values.scope}
                  onChange={(scope) => updateValues({ scope })}
                  error={fieldErrors.scope}
                />

                {/* Deskripsi Prestasi (Textarea Nyaman) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={descId} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      <FileText className="h-3.5 w-3.5 text-[var(--accent)]" />
                      Deskripsi Prestasi
                      <span className="text-xs font-normal text-[var(--text-muted)]">(opsional)</span>
                    </Label>
                    <span className="text-[10px] text-[var(--text-muted)]">Mendukung baris baru</span>
                  </div>

                  <Textarea
                    id={descId}
                    value={values.desc}
                    onChange={(e) => updateValues({ desc: e.target.value })}
                    rows={4}
                    placeholder="Jelaskan pencapaian, penyelenggara, kategori lomba, atau informasi tambahan mengenai prestasi ini..."
                    className={cn(
                      'min-h-[110px] resize-y rounded-xl border border-[var(--border)] bg-white/95 leading-relaxed text-sm text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0',
                      fieldErrors.desc ? 'border-destructive focus-visible:border-destructive' : '',
                    )}
                  />
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Keterangan penyelenggara, kategori, dan detail apresiasi santri.
                  </p>
                </div>

              </div>

              {/* KOLOM KANAN: Gambar / Sertifikat Prestasi (Scroll Vertikal Mandiri) */}
              <div className="h-auto lg:h-full lg:min-h-0 lg:overflow-y-auto px-6 py-5 bg-[var(--bg-secondary)]/30">
                <AchievementImageField
                  id={imageId}
                  value={values.image}
                  onChange={(image) => updateValues({ image })}
                  onUploadingChange={setUploading}
                  onInspectImage={(url) => setInspectUrl(url)}
                  error={fieldErrors.image}
                />
              </div>

            </div>
          </div>

          {/* ── 3. FOOTER TETAP (Fixed Modal Footer) ── */}
          <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/95 px-6 py-3.5 backdrop-blur">
            {serverError && (
              <p
                role="alert"
                className="mb-2.5 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600"
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
                  Tahun prestasi wajib diisi. Dokumen tersimpan aman.
                </p>
              )}

              <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => void requestClose()}
                  className="h-10 rounded-xl text-[var(--text-secondary)]"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  loading={saving}
                  disabled={saving || uploading}
                  className="h-10 min-w-[150px] gap-2 rounded-xl bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 shadow-sm"
                >
                  {!saving && <Save className="h-4 w-4" />}
                  {saving
                    ? 'Menyimpan…'
                    : uploading
                      ? 'Mengunggah…'
                      : mode === 'create'
                        ? 'Simpan Prestasi'
                        : 'Simpan Perubahan'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox / Pratinjau Sertifikat Penuh */}
      {inspectUrl && (
        <AchievementCertificateModal
          data={{
            imageUrl: inspectUrl,
            title: values.title || 'Sertifikat Prestasi',
            year: values.year,
            scope: values.scope,
          }}
          onClose={() => setInspectUrl(null)}
        />
      )}
    </>
  )
}
