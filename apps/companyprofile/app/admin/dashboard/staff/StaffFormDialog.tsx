'use client'

import { useState } from 'react'
import { AlertTriangle, Save, ShieldCheck, UserCircle2 } from 'lucide-react'
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
  buildStaffPayload,
  readStaffForm,
  serializeStaffExpertise,
  staffFieldFromServerError,
  validateStaffForm,
  type StaffFormValues,
} from './staff-form'
import { StaffExpertisePicker } from './StaffExpertisePicker'
import { FacilityImageField } from '../facilities/FacilityImageField'

interface Props {
  mode: 'create' | 'edit'
  activeTab: string
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
  staffList: RowRecord[]
}

const NAME_MAX_LENGTH = 255
const POSITION_MAX_LENGTH = 255
const FIELD_CLASS =
  'h-10 rounded-xl border-[var(--border)] bg-white/90 text-sm focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

function getStaffLabel(item: RowRecord): string {
  const content = typeof item.content === 'object' && item.content !== null ? (item.content as Record<string, unknown>) : null
  if (typeof content?.name === 'string' && content.name.trim()) return content.name.trim()
  if (typeof content?.nama === 'string' && content.nama.trim()) return content.nama.trim()
  if (typeof item.name === 'string' && item.name.trim()) return item.name.trim()
  return item.id ? `Staff #${item.id.slice(0, 6)}` : 'Staff'
}

export function StaffFormDialog({
  mode, activeTab, editingItem, formData, setFormData, onClose, onSaved, staffList,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')

  // Snapshot saat mount dipakai untuk mendeteksi perubahan yang belum disimpan.
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)

  const values = readStaffForm(formData)
  const endpoint = TABS.find((tab) => tab.key === activeTab)?.endpoint ?? '/staff'

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

  function updateValues(patch: Partial<StaffFormValues>) {
    const next: Partial<FormState> = {}
    if (patch.role !== undefined) {
      next.role = patch.role
      clearFieldError('role')
    }
    if (patch.name !== undefined) next._c_name = patch.name
    if (patch.position !== undefined) next._c_position = patch.position
    if (patch.bio !== undefined) next._c_bio = patch.bio
    if (patch.expertise !== undefined) next._c_expertise = serializeStaffExpertise(patch.expertise)
    if (patch.parentId !== undefined) next._c_parentId = patch.parentId
    if (patch.order !== undefined) next._c_order = patch.order
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
      toast('error', 'Tunggu unggahan foto selesai sebelum menyimpan.')
      return
    }

    const errors = validateStaffForm(values)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setServerError('')
      const firstInvalid = Object.keys(errors)[0]
      document.getElementById(`staff-${firstInvalid}`)?.focus()
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
      const payload = buildStaffPayload({ formData, existingContent })

      if (mode === 'edit' && editingItem?.id) {
        await api.updateItem(`${endpoint}/${editingItem.id}`, payload)
      } else {
        await api.createItem(endpoint, payload)
      }

      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Staff berhasil dibuat' : 'Staff berhasil disimpan')
    } catch (e) {
      const message = errorMessage(e, 'Gagal menyimpan staff')
      const field = staffFieldFromServerError(message)
      setServerError(message)
      if (field) setFieldErrors({ [field]: message })
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  const roleId = 'staff-role'
  const nameId = 'staff-name'
  const positionId = 'staff-position'
  const bioId = 'staff-bio'
  const expertiseId = 'staff-expertise'
  const parentId = 'staff-parentId'
  const orderId = 'staff-order'
  const imageId = 'staff-image'

  const parentOptions = staffList
    .filter((item) => {
      if (mode !== 'edit' || !editingItem?.id) return true
      return item.id !== editingItem.id
    })
    .map((item) => ({ id: item.id, label: getStaffLabel(item) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'id'))

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void requestClose() }}>
      <DialogContent
        className="flex max-h-[95dvh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)]/95 p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl sm:rounded-2xl"
        aria-describedby="staff-form-description"
      >
        {/* ── Header tetap ── */}
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/50 to-[var(--accent-gold)]/10 px-5 py-3.5 sm:px-6">
          <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" />
          <div className="relative flex items-center gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]">
              <UserCircle2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]/75 uppercase">
                {mode === 'create' ? 'Tambah Staff' : 'Ubah Staff'}
              </p>
              <DialogTitle className="truncate font-heading text-base font-bold leading-snug text-[var(--text)]">
                {mode === 'edit' && values.name ? values.name : 'Data Pengurus / Pengajar'}
              </DialogTitle>
              <p id="staff-form-description" className="truncate text-[11px] text-[var(--text-muted)]">
                Peran, nama, jabatan wajib diisi. Atasan & urutan digunakan untuk Struktur Organisasi.
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
                <Field label="Peran" htmlFor={roleId} required>
                  <select
                    id={roleId}
                    value={values.role}
                    onChange={(event) => updateValues({ role: event.target.value })}
                    aria-invalid={Boolean(fieldErrors.role)}
                    className={cn(
                      FIELD_CLASS,
                      'w-full border px-3 text-[var(--text)] transition-colors focus:outline-none',
                      fieldErrors.role && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                    )}
                  >
                    <option value="">Pilih peran</option>
                    <option value="leader">leader</option>
                    <option value="teacher">teacher</option>
                  </select>
                  {fieldErrors.role && (
                    <p role="alert" className="text-[11px] font-medium text-destructive">
                      {fieldErrors.role}
                    </p>
                  )}
                </Field>

                <Field label="Nama Staff" htmlFor={nameId} required>
                  <input
                    id={nameId}
                    type="text"
                    value={values.name}
                    maxLength={NAME_MAX_LENGTH}
                    onChange={(event) => updateValues({ name: event.target.value })}
                    placeholder="Nama lengkap"
                    aria-invalid={Boolean(fieldErrors.name)}
                    className={cn(
                      FIELD_CLASS,
                      'w-full border px-3 text-[var(--text)] transition-colors placeholder:text-[var(--text-muted)] focus:outline-none',
                      fieldErrors.name && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                    )}
                  />
                  {fieldErrors.name && (
                    <p role="alert" className="text-[11px] font-medium text-destructive">
                      {fieldErrors.name}
                    </p>
                  )}
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Jabatan" htmlFor={positionId} required>
                  <input
                    id={positionId}
                    type="text"
                    value={values.position}
                    maxLength={POSITION_MAX_LENGTH}
                    onChange={(event) => updateValues({ position: event.target.value })}
                    placeholder="Contoh: Kepala Madrasah"
                    aria-invalid={Boolean(fieldErrors.position)}
                    className={cn(
                      FIELD_CLASS,
                      'w-full border px-3 text-[var(--text)] transition-colors placeholder:text-[var(--text-muted)] focus:outline-none',
                      fieldErrors.position && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                    )}
                  />
                  {fieldErrors.position && (
                    <p role="alert" className="text-[11px] font-medium text-destructive">
                      {fieldErrors.position}
                    </p>
                  )}
                </Field>

                <Field label="Atasan" htmlFor={parentId}>
                  <select
                    id={parentId}
                    value={values.parentId}
                    onChange={(event) => updateValues({ parentId: event.target.value })}
                    className={cn(FIELD_CLASS, 'w-full border px-3 text-[var(--text)] transition-colors focus:outline-none')}
                  >
                    <option value="">(Kosong = puncak)</option>
                    {parentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <Field label="Urutan Tampilan" htmlFor={orderId}>
                  <input
                    id={orderId}
                    type="number"
                    inputMode="numeric"
                    value={values.order}
                    onChange={(event) => updateValues({ order: event.target.value })}
                    placeholder="0"
                    aria-invalid={Boolean(fieldErrors.order)}
                    className={cn(
                      FIELD_CLASS,
                      'w-full border px-3 text-[var(--text)] transition-colors placeholder:text-[var(--text-muted)] focus:outline-none',
                      fieldErrors.order && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                    )}
                  />
                  {fieldErrors.order && (
                    <p role="alert" className="text-[11px] font-medium text-destructive">
                      {fieldErrors.order}
                    </p>
                  )}
                </Field>
                <div className="hidden sm:block" />
              </div>

              <Field label="Biografi" htmlFor={bioId}>
                <Textarea
                  id={bioId}
                  value={values.bio}
                  onChange={(event) => updateValues({ bio: event.target.value })}
                  rows={3}
                  placeholder="Profil singkat staff…"
                  className="min-h-[5.5rem] resize-y rounded-xl border-[var(--border)] bg-white/90 leading-relaxed focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0"
                />
              </Field>

              <StaffExpertisePicker
                id={expertiseId}
                value={values.expertise}
                onChange={(expertise) => updateValues({ expertise })}
              />
            </div>

            {/* Kolom kanan */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={imageId} className="block text-[13px] font-medium text-[var(--text-secondary)]">
                  Foto Profil
                  <span className="ml-1 text-[11px] font-normal text-[var(--text-muted)]">(opsional)</span>
                </Label>
                <span className="shrink-0 text-[10px] text-[var(--text-muted)]">Tampil di org chart</span>
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
                {saving ? 'Menyimpan…' : uploading ? 'Mengunggah…' : mode === 'create' ? 'Simpan Staff' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
