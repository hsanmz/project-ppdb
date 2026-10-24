'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Eye,
  Image as ImageIcon,
  MessageSquareQuote,
  Quote,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import { Label } from '@/app/components/ui/Label'
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/Dialog'
import { Field } from '../CrudFormDialog'
import { TESTIMONIAL_IMAGE_URL_MAX_LENGTH } from './testimonial-form'
import type { FormState, RowRecord } from '../_types'
import { errorMessage } from '../_types'
import {
  buildTestimonialPayload,
  readTestimonialForm,
  testimonialFieldsFromServerError,
  validateTestimonialForm,
  type TestimonialFormValues,
} from './testimonial-form'
import { TestimonialPhotoField } from './TestimonialPhotoField'
import { TestimonialPreview } from './TestimonialPreview'

interface Props {
  mode: 'create' | 'edit'
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
}

const FIELD_CLASS =
  'h-11 rounded-xl border-[var(--border)] bg-white/90 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

const TEXTAREA_CLASS =
  'min-h-[220px] max-h-[26rem] resize-y rounded-xl border-[var(--border)] bg-white/90 leading-relaxed focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

const ORDER_CLASS =
  'h-11 w-full rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm text-[var(--text)] tabular-nums transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none'

const FIELD_IDS: Record<string, string> = {
  name: 'testimonial-name',
  child: 'testimonial-child',
  order: 'testimonial-order',
  _c_quote: 'testimonial-quote',
  image: 'testimonial-image',
}

/**
 * Modal tambah/edit testimoni.
 *
 * Tata letak desktop: header & footer tetap, isi terbagi dua kolom dengan
 * scroll INDEPENDEN — informasi di kiri, foto di kanan. Pada layar kecil kolom
 * bertumpuk menjadi satu aliran dan hanya body modal yang menggulir, sehingga
 * tidak ada dua scrollbar yang saling berebut di layar sempit.
 *
 * Kontrak API dijaga `testimonial-form.ts`; `content` lama dipertahankan agar
 * data yang tidak dikelola form ini tidak hilang.
 */
export function TestimonialFormDialog({
  mode, editingItem, formData, setFormData, onClose, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  // Snapshot saat mount dipakai untuk mendeteksi perubahan yang belum disimpan.
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)

  const values = readTestimonialForm(formData)

  function update(patch: Partial<FormState>) {
    setFormData({ ...formData, ...patch })
    if (serverError) setServerError('')
  }

  function updateValues(patch: Partial<TestimonialFormValues>) {
    const next: Partial<FormState> = {}
    if (patch.name !== undefined) {
      next.name = patch.name
      clearFieldError('name')
    }
    if (patch.child !== undefined) {
      next.child = patch.child
      clearFieldError('child')
    }
    if (patch.order !== undefined) {
      next.order = patch.order
      clearFieldError('order')
    }
    if (patch.quote !== undefined) next._c_quote = patch.quote
    if (patch.image !== undefined) {
      next.image = patch.image
      clearFieldError('image')
    }
    update(next)
  }

  function clearFieldError(name: string) {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function focusField(name: string) {
    const id = FIELD_IDS[name]
    if (id) document.getElementById(id)?.focus()
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
      toast('error', 'Tunggu unggahan foto selesai sebelum menyimpan.')
      return
    }

    const errors = validateTestimonialForm(values)
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
      const payload = buildTestimonialPayload({ formData, existingContent })

      if (mode === 'edit' && editingItem?.id) {
        await api.updateItem(`/testimonials/${editingItem.id}`, payload)
      } else {
        await api.createItem('/testimonials', payload)
      }

      onClose()
      onSaved()
      toast(
        'success',
        mode === 'create' ? 'Testimoni berhasil ditambahkan' : 'Testimoni berhasil disimpan',
      )
    } catch (e) {
      const message = errorMessage(e, 'Gagal menyimpan testimoni')
      setServerError(message)
      const fields = testimonialFieldsFromServerError(message)
      if (fields.length > 0) {
        setFieldErrors(
          Object.fromEntries(fields.map((field) => [field, message])),
        )
      }
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
      <DialogContent
        className="flex h-[min(90dvh,900px)] max-h-[90dvh] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)]/95 p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl sm:w-[calc(100vw-1.5rem)] sm:rounded-2xl"
        aria-describedby="testimonial-form-description"
      >
        {/* ── Header tetap ── */}
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/50 to-[var(--accent-gold)]/10 px-5 py-4 pr-14 sm:px-6">
          <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" />
          <div className="relative flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]">
              <MessageSquareQuote className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]/75 uppercase">
                {mode === 'create' ? 'Konten Baru' : 'Perbarui Konten'}
              </p>
              <DialogTitle className="mt-0.5 truncate font-heading text-lg font-bold leading-snug text-[var(--text)]">
                {mode === 'create' ? 'Tambah Testimoni' : 'Edit Testimoni'}
              </DialogTitle>
              <p
                id="testimonial-form-description"
                className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]"
              >
                {mode === 'create'
                  ? 'Tambahkan pengalaman wali santri sebagai bagian dari cerita PTD Ar-Rahman.'
                  : 'Perbarui informasi dan kutipan testimoni.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Body: dua kolom, scroll independen di desktop ── */}
        <div className="testimonial-form-pane min-h-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]/35 lg:overflow-hidden">
          <div className="grid min-h-0 grid-cols-1 lg:h-full lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Kolom kiri — informasi & kutipan */}
            <div className="testimonial-form-pane min-w-0 space-y-5 px-5 py-5 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:py-6">
              <FormBlock
                icon={UserRound}
                title="Informasi Wali & Santri"
                description="Nama yang tampil di kartu testimoni halaman publik."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nama Wali Santri" htmlFor={FIELD_IDS.name} required>
                    <Input
                      id={FIELD_IDS.name}
                      className={cn(FIELD_CLASS, fieldErrors.name && 'border-destructive')}
                      error={fieldErrors.name}
                      type="text"
                      maxLength={255}
                      autoComplete="off"
                      value={values.name}
                      onChange={(event) => updateValues({ name: event.target.value })}
                      placeholder="Contoh: Bapak Ahmad Fauzi"
                    />
                  </Field>

                  <Field label="Nama Anak / Santri" htmlFor={FIELD_IDS.child} required>
                    <Input
                      id={FIELD_IDS.child}
                      className={cn(FIELD_CLASS, fieldErrors.child && 'border-destructive')}
                      error={fieldErrors.child}
                      type="text"
                      maxLength={255}
                      autoComplete="off"
                      value={values.child}
                      onChange={(event) => updateValues({ child: event.target.value })}
                      placeholder="Contoh: Muhammad Rizki"
                    />
                    <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                      Nama anak yang menjadi santri di PTD Ar-Rahman.
                    </p>
                  </Field>
                </div>

                <div className="max-w-[15rem] space-y-1.5">
                  <Field label="Urutan Tampilan" htmlFor={FIELD_IDS.order} required>
                    <input
                      id={FIELD_IDS.order}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={values.order}
                      onChange={(event) => updateValues({ order: event.target.value })}
                      placeholder="1"
                      aria-invalid={Boolean(fieldErrors.order)}
                      aria-describedby={`${FIELD_IDS.order}-help`}
                      className={cn(
                        ORDER_CLASS,
                        fieldErrors.order && 'border-destructive focus:border-destructive focus:ring-destructive/20',
                      )}
                    />
                  </Field>
                  {fieldErrors.order ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {fieldErrors.order}
                    </p>
                  ) : null}
                  <p id={`${FIELD_IDS.order}-help`} className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                    Angka lebih kecil akan ditampilkan lebih dahulu.
                  </p>
                </div>
              </FormBlock>

              <FormBlock
                icon={Quote}
                title="Kutipan Testimoni"
                description="Tulis dengan tenang. Baris baru dan tanda baca dipertahankan apa adanya."
              >
                <div className="space-y-1.5">
                  <Label
                    htmlFor={FIELD_IDS['_c_quote']}
                    className="block text-[13px] font-medium text-[var(--text-secondary)]"
                  >
                    Kutipan Testimoni
                  </Label>
                  <Textarea
                    id={FIELD_IDS['_c_quote']}
                    className={TEXTAREA_CLASS}
                    value={values.quote}
                    onChange={(event) => updateValues({ quote: event.target.value })}
                    rows={12}
                    placeholder="Ceritakan pengalaman Bapak/Ibu selama mendampingi anak belajar dan berkembang di PTD Ar-Rahman..."
                    aria-describedby={`${FIELD_IDS['_c_quote']}-help`}
                  />
                  <div className="flex items-start justify-between gap-3">
                    <p
                      id={`${FIELD_IDS['_c_quote']}-help`}
                      className="text-[11px] leading-relaxed text-[var(--text-muted)]"
                    >
                      Tidak perlu menambahkan tanda kutip sendiri — situs publik menampilkannya otomatis.
                    </p>
                    <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-muted)]">
                      {values.quote.length} karakter
                    </span>
                  </div>
                </div>
              </FormBlock>

              <FormBlock
                icon={Eye}
                title="Pratinjau"
                description="Ringkasan bagaimana testimoni akan terlihat setelah disimpan."
              >
                <TestimonialPreview
                  name={values.name}
                  child={values.child}
                  quote={values.quote}
                  image={values.image}
                />
              </FormBlock>
            </div>

            {/* Kolom kanan — foto, scroll independen */}
            <aside className="testimonial-form-pane min-w-0 border-t border-[var(--border)]/70 bg-[var(--bg-secondary)]/45 px-5 py-5 sm:px-6 lg:min-h-0 lg:overflow-y-auto lg:border-t-0 lg:border-l lg:py-6">
              <div className="mb-3 flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-gold)]/15 text-[#A67C2E]">
                  <ImageIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--text)]">Foto Wali Santri</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    Ditampilkan sebagai foto bulat di detail testimoni dan foto potret di kartu carousel.
                  </p>
                </div>
              </div>

              <TestimonialPhotoField
                id={FIELD_IDS.image}
                value={values.image}
                onChange={(image) => updateValues({ image })}
                onUploadingChange={setUploading}
                error={fieldErrors.image}
              />

              <div className="mt-5 space-y-2 rounded-xl border border-[var(--border)]/60 bg-white/60 p-3">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">
                  Panduan singkat
                </p>
                <ul className="space-y-1.5 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                  <li>Gunakan foto wajah yang jelas dan pencahayaan cukup.</li>
                  <li>Rasio potret 4:5 memberi hasil paling rapi di kartu publik.</li>
                  <li>Tanpa foto, kartu memakai inisial nama wali — bukan ikon rusak.</li>
                </ul>
                <p className="border-t border-[var(--border)]/60 pt-2 text-[10px] leading-relaxed text-[var(--text-muted)]">
                  URL foto maksimal {TESTIMONIAL_IMAGE_URL_MAX_LENGTH} karakter. Foto boleh dikosongkan.
                </p>
              </div>
            </aside>
          </div>
        </div>

        {/* ── Footer tetap ── */}
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
                Perubahan langsung tersinkron ke situs publik setelah disimpan.
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
                      ? 'Simpan Testimoni'
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
    <section className="space-y-3.5">
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
