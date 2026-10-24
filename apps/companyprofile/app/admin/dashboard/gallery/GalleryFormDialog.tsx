'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  FileText,
  Images,
  Save,
  ShieldCheck,
  Tag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
  buildGalleryPayload,
  galleryFieldFromServerError,
  readGalleryForm,
  validateGalleryForm,
  type GalleryFormValues,
} from './gallery-form'
import { GalleryCategoryPicker } from './GalleryCategoryPicker'
import { GalleryImageField } from './GalleryImageField'

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
  'h-11 w-full rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm text-[var(--text)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none'

const DESC_CLASS =
  'resize-y rounded-xl border-[var(--border)] bg-white/90 leading-relaxed placeholder:text-[var(--text-muted)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

const FIELD_IDS: Record<string, string> = {
  category: 'gallery-category',
  _c_title: 'gallery-title',
  _c_desc: 'gallery-desc',
  image: 'gallery-image',
}

/**
 * Modal CRUD Galeri dengan DUA WADAH GULIR MANDIRI (Two Independent Scroll
 * Containers) — pola yang sama dengan modal Prestasi.
 *
 * Struktur:
 * 1. Header tetap: judul/deskripsi modal selalu terlihat.
 * 2. Isi dua kolom di desktop:
 *    - Kiri  : Informasi galeri (Kategori, Judul Foto, Deskripsi) — scroll sendiri.
 *    - Kanan : Gambar galeri (dropzone 4:3, ganti, hapus, panduan) — scroll sendiri.
 *    Menggulir satu kolom tidak menggerakkan kolom lain, header, atau footer
 *    (`min-h-0` + `lg:overflow-y-auto` per kolom; body hanya fallback scroll
 *    saat layar pendek / satu kolom di ponsel).
 * 3. Footer tetap: indikator belum disimpan, Batal, Simpan Foto.
 *
 * Kontrak API dijaga `gallery-form.ts`: hanya `category`, `image`, dan
 * `content` (JSON `title` + `desc`) yang dikirim; `content` lama dipertahankan.
 */
export function GalleryFormDialog({
  mode, activeTab, editingItem, formData, setFormData, onClose, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  // Snapshot nilai form saat modal dibuka untuk deteksi perubahan (anti-loss).
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)

  const values = readGalleryForm(formData)
  const endpoint = TABS.find((tab) => tab.key === activeTab)?.endpoint ?? '/gallery'

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

  function updateValues(patch: Partial<GalleryFormValues>) {
    const next: Partial<FormState> = {}
    if (patch.category !== undefined) {
      next.category = patch.category
      clearFieldError('category')
    }
    if (patch.title !== undefined) next._c_title = patch.title
    if (patch.desc !== undefined) next._c_desc = patch.desc
    if (patch.image !== undefined) {
      next.image = patch.image
      clearFieldError('image')
    }
    update(next)
  }

  function focusField(name: string) {
    const id = FIELD_IDS[name]
    if (id) document.getElementById(id)?.focus()
  }

  async function requestClose() {
    if (saving || uploading) return
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

    const errors = validateGalleryForm(values)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setServerError('')
      focusField(Object.keys(errors)[0])
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
      const payload = buildGalleryPayload({ formData, existingContent })

      if (mode === 'edit' && editingItem?.id) {
        await api.updateItem(`${endpoint}/${editingItem.id}`, payload)
      } else {
        await api.createItem(endpoint, payload)
      }

      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Foto galeri berhasil ditambahkan' : 'Foto galeri berhasil disimpan')
    } catch (e) {
      const message = errorMessage(e, 'Gagal menyimpan foto galeri')
      setServerError(message)
      const field = galleryFieldFromServerError(message)
      if (field) {
        setFieldErrors((prev) => ({ ...prev, [field]: message }))
        focusField(field)
      }
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  const titleId = FIELD_IDS._c_title
  const descId = FIELD_IDS._c_desc

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
      <DialogContent
        className="flex h-[88dvh] max-h-[900px] w-[calc(100vw-2rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)] p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl sm:rounded-2xl"
        aria-describedby="gallery-form-description"
      >
        {/* ── 1. HEADER TETAP (Fixed Modal Header) ── */}
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/60 to-[var(--accent-gold)]/10 px-6 py-4">
          <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" />
          <div className="relative flex items-center gap-3.5 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]">
              <Images className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate font-heading text-lg font-bold leading-tight text-[var(--text)]">
                {mode === 'create' ? 'Tambah Foto Galeri' : 'Edit Foto Galeri'}
              </DialogTitle>
              <p
                id="gallery-form-description"
                className="mt-0.5 truncate text-xs text-[var(--text-secondary)]"
              >
                {mode === 'create'
                  ? 'Tambahkan dokumentasi kegiatan dan informasi foto.'
                  : 'Perbarui informasi dan gambar dokumentasi.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. AREA DUA KOLOM DENGAN SCROLL MANDIRI ── */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]/35 lg:overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] lg:divide-x lg:divide-[var(--border)]/70">

            {/* ── KOLOM KIRI: Informasi galeri (scroll mandiri) ── */}
            <div className="gallery-form-pane h-auto min-w-0 bg-white/40 px-5 py-5 sm:px-6 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:py-6">
              <div className="mx-auto flex max-w-xl flex-col gap-5">
                <FormBlock
                  icon={Tag}
                  title="Kategori & Judul"
                  description="Pilih kategori baku, lalu beri judul yang menggambarkan momennya."
                >
                  <GalleryCategoryPicker
                    id={FIELD_IDS.category}
                    value={values.category}
                    onChange={(category) => updateValues({ category })}
                    error={fieldErrors.category}
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label
                        htmlFor={titleId}
                        className="text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase"
                      >
                        Judul Foto
                        <span className="ml-1.5 text-[10px] font-normal normal-case text-[var(--text-muted)]">
                          (opsional)
                        </span>
                      </Label>
                    </div>
                    <input
                      id={titleId}
                      type="text"
                      autoComplete="off"
                      value={values.title}
                      onChange={(event) => updateValues({ title: event.target.value })}
                      placeholder="Contoh: Kegiatan Santri dalam Pembelajaran Tahfidz"
                      className={cn(
                        FIELD_CLASS,
                        fieldErrors._c_title && 'border-destructive focus:border-destructive focus:ring-destructive/20',
                      )}
                    />
                    {fieldErrors._c_title ? (
                      <p role="alert" className="text-[11px] font-medium text-destructive">
                        {fieldErrors._c_title}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Tampil sebagai caption foto di halaman galeri publik.
                      </p>
                    )}
                  </div>
                </FormBlock>

                <FormBlock
                  icon={FileText}
                  title="Deskripsi Foto"
                  description="Lengkapi konteks kegiatan, waktu, atau lokasi. Kosongkan bila tidak perlu."
                >
                  <div className="space-y-1.5">
                    <Textarea
                      id={descId}
                      className={cn(
                        DESC_CLASS,
                        'min-h-[10rem]',
                        fieldErrors._c_desc && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                      )}
                      value={values.desc}
                      onChange={(event) => updateValues({ desc: event.target.value })}
                      rows={6}
                      placeholder="Tambahkan informasi mengenai kegiatan, waktu pelaksanaan, lokasi, atau konteks foto ini..."
                      aria-label="Deskripsi Foto"
                      aria-describedby={`${descId}-help`}
                    />
                    {fieldErrors._c_desc ? (
                      <p role="alert" className="text-[11px] font-medium text-destructive">
                        {fieldErrors._c_desc}
                      </p>
                    ) : (
                      <p id={`${descId}-help`} className="text-[11px] text-[var(--text-muted)]">
                        Baris baru dipertahankan saat ditampilkan di halaman publik.
                      </p>
                    )}
                  </div>
                </FormBlock>
              </div>
            </div>

            {/* ── KOLOM KANAN: Gambar galeri (scroll mandiri) ── */}
            <aside className="gallery-form-pane h-auto min-w-0 bg-white/55 px-5 py-5 sm:px-6 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:py-6">
              <div className="mx-auto flex max-w-xl flex-col gap-5">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-gold)]/15 text-[#A67C2E]">
                    <Images className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text)]">
                      Gambar Galeri
                      <span className="ml-1.5 text-[10px] font-normal text-[var(--text-muted)]">(opsional)</span>
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                      Foto utama yang tampil di carousel dan pratinjau galeri publik.
                    </p>
                  </div>
                </div>

                <GalleryImageField
                  id={FIELD_IDS.image}
                  value={values.image}
                  onChange={(image) => updateValues({ image })}
                  onUploadingChange={setUploading}
                  error={fieldErrors.image}
                />

                <div className="space-y-2 rounded-xl border border-[var(--border)]/60 bg-white/60 p-3">
                  <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
                    Panduan singkat
                  </p>
                  <ul className="space-y-1.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    <li>Gunakan foto kegiatan yang tajam dengan pencahayaan cukup.</li>
                    <li>Rasio lanskap 4:3 memberikan hasil paling rapi di galeri.</li>
                    <li>Pratinjau lokal tampil segera; tekan Simpan untuk menyimpan.</li>
                  </ul>
                  <p className="border-t border-[var(--border)]/60 pt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
                    URL gambar maksimal 255 karakter. Tanpa gambar, entri tetap tersimpan
                    dan memakai placeholder di galeri publik.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* ── 3. FOOTER TETAP ── */}
        <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/80 px-5 py-3.5 backdrop-blur sm:px-6">
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
                className="h-10 min-w-[150px] gap-2 rounded-xl"
              >
                {!saving && <Save className="h-4 w-4" />}
                {saving
                  ? 'Menyimpan…'
                  : uploading
                    ? 'Mengunggah…'
                    : mode === 'create'
                      ? 'Simpan Foto'
                      : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FormBlock({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}
