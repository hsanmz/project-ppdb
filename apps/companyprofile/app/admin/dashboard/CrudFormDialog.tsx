'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import Image from 'next/image'
import {
  AlertTriangle, CalendarDays, FileText, Image as ImageIcon, Images, ListChecks, Link2, Loader2,
  Plus, Save, ShieldCheck, Trash2, Upload, X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { looksLikeHtml, sanitizeRichHtml } from '@/app/lib/rich-text'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import { Label } from '@/app/components/ui/Label'
import { RichTextEditor } from '@/app/components/ui/RichTextEditor'
import {
  Dialog, DialogContent, DialogTitle,
} from '@/app/components/ui/Dialog'
import {
  TABS, FORM_FIELDS, CONTENT_FIELDS, HAS_CONTENT, maxLengthFor,
} from './_constants'
import type { RowRecord, FormState } from './_types'
import { errorMessage } from './_types'

interface Props {
  mode: 'create' | 'edit'
  activeTab: string
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
}

// Gaya field disamakan untuk semua input/textarea di dialog: sudut lebih
// lembut, fokus ring emerald, latar putih agar kontras di atas panel abu.
const FIELD_CLASS =
  'h-11 rounded-xl border-[var(--border)] bg-white/90 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

const TEXTAREA_CLASS =
  'rounded-xl border-[var(--border)] bg-white/90 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

// Border error ditambahkan SETELAH `FIELD_CLASS` lewat `cn()`, karena
// tailwind-merge membuang kelas border yang lebih awal — kalau tidak, merah
// dari `Input`'s `error` prop ikut tertimpa border abu-abu.
const FIELD_ERROR_CLASS =
  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'

const SELECT_CLASS =
  'h-11 w-full rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none'

export function CrudFormDialog({
  mode, activeTab, editingItem, formData, setFormData, onClose, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false)

  // Error validasi per kolom, dibaca dari `errorMessage` backend maupun dari
  // pengecekan sendiri. Kuncinya adalah nama field (bukan index) supaya bisa
  // dipetakan ke input yang tepat.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>>({})

  // Snapshot nilai form saat modal dibuka. Dialog dirender kondisional, jadi
  // setiap pembukaan = mount baru → initializer `useState` menangkap nilai
  // awal yang benar. State (bukan ref) karena nilainya dibaca saat render.
  const [initialFormData] = useState<FormState>(formData)
  const isDirty = isFormDirty(formData, initialFormData)

  const tab = TABS.find((t) => t.key === activeTab)!

  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string; position: string }[]>([])
  useEffect(() => {
    if (activeTab !== 'staff') return
    let cancelled = false
    api.getStaff()
      .then((list) => {
        if (cancelled) return
        setStaffOptions(
          list
            .filter((s) => s.id !== editingItem?.id)
            .map((s) => ({ id: s.id, name: s.content?.name ?? '(tanpa nama)', position: s.content?.position ?? '' })),
        )
      })
      .catch(() => setStaffOptions([]))
    return () => { cancelled = true }
  }, [activeTab, editingItem?.id])

  function buildContent(): Record<string, unknown> {
    const fields = CONTENT_FIELDS[activeTab] || []
    const base: Record<string, unknown> =
      mode === 'edit' && editingItem && typeof editingItem.content === 'object' && editingItem.content !== null
        ? { ...(editingItem.content as Record<string, unknown>) }
        : {}
    const content: Record<string, unknown> = { ...base }
    for (const f of fields) {
      const raw = formData[`_c_${f.name}`] ?? ''
      if (f.type === 'list') {
        content[f.name] = String(raw).split('\n').map((s) => s.trim()).filter(Boolean)
      } else if (f.type === 'number') {
        content[f.name] = raw === '' || raw === null ? undefined : Number(raw)
      } else if (f.type === 'parent') {
        if (raw) content[f.name] = String(raw)
        else delete content[f.name]
      } else if (f.name === 'content' && activeTab === 'news') {
        // Isi berita ditulis lewat editor WYSIWYG. Bersihkan sekali lagi saat
        // menyimpan: paste dari Word/web atau payload lama tidak boleh
        // menyelipkan tag/atribut berbahaya. Artikel teks polos lama
        // dibiarkan apa adanya agar tetap dirender oleh RichContent.
        const text = String(raw)
        content[f.name] = looksLikeHtml(text) ? sanitizeRichHtml(text) : text
      } else {
        content[f.name] = raw
      }
    }
    return content
  }

  async function handleSave() {
    // Penjaga anti-kehilangan-data: saat mode edit, `editingItem.content` wajib
    // ada. Kalau null, form ini kemungkinan diisi dari baris list yang `content`
    //‑nya sudah dilucuti backend — Menyimpan akan menimpa isi artikel & galeri
    // dengan string kosong. Better ditolak daripada dihapus.
    if (mode === 'edit' && HAS_CONTENT.includes(activeTab) && !editingItem?.content) {
      toast('error', 'Data artikel tidak lengkap dimuat. Tutup form dan buka kembali, atau muat ulang halaman.')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {}
      // Validasi dikumpulkan dulu (bukan berhenti di error pertama) supaya
      // semua kolom bermasalah ditandai sekaligus, lalu fokus ke kolom
      // pertama yang bermasalah.
      const errors: Record<string, string> = {}
      for (const f of FORM_FIELDS[activeTab] || []) {
        const val = formData[f.name]
        if (f.type === 'number') {
          if (val === '' || val === null || val === undefined) {
            errors[f.name] = `${f.label} wajib diisi`
          } else {
            payload[f.name] = Number(val)
          }
        } else {
          if (f.required && String(val ?? '').trim() === '') {
            errors[f.name] = `${f.label} wajib diisi`
          }
          payload[f.name] = val
        }
      }
      // Judul berita dipakai backend untuk membuat slug otomatis, dan tanpa
      // judul artikel tidak berarti apa pun di halaman publik.
      if (activeTab === 'news' && String(formData['_c_title'] ?? '').trim() === '') {
        errors['_c_title'] = 'Judul Berita wajib diisi'
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        const firstInvalid = Object.keys(errors)[0]
        fieldRefs.current[firstInvalid]?.focus()
        toast('error', 'Periksa lagi kolom yang ditandai merah.')
        setSaving(false)
        return
      }
      setFieldErrors({})
      payload.image = formData.image || ''
      if (activeTab === 'news') payload.gallery = JSON.stringify(formData.gallery ?? [])
      if (HAS_CONTENT.includes(activeTab)) {
        payload.content = JSON.stringify(buildContent())
      }

      if (mode === 'edit' && editingItem) {
        await api.updateItem(`${tab.endpoint}/${editingItem.id}`, payload)
      } else {
        await api.createItem(tab.endpoint, payload)
      }
      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Berhasil dibuat' : 'Berhasil disimpan')
    } catch (e) {
      // Error dari backend (422) biasanya menyebut nama kolomnya. Coba
      // tandai kolom itu supaya admin tahu persis mana yang ditolak.
      const message = errorMessage(e, 'Gagal menyimpan')
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Tutup modal, tapi minta konfirmasi dulu kalau ada perubahan yang belum
   * disimpan. Dipanggil dari Escape / tombol X / area gelap / tombol Batal.
   */
  async function requestClose() {
    if (saving) return
    if (!isDirty) {
      onClose()
      return
    }
    const discard = await confirm(UNSAVED_CHANGES_CONFIRM)
    if (discard) onClose()
  }

  /** Hapus penanda error sebuah kolom begitu admin mulai mengisinya lagi. */
  function clearFieldError(name: string) {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const fields = FORM_FIELDS[activeTab] || []
  const hasRequired = fields.some((f) => f.required)

  // ── Berita: layout dua kolom ───────────────────────────────────────────────
  // Isi artikel adalah konten utama, jadi mendapat kolom kanan yang lebar
  // dengan editor WYSIWYG. Data pendukung (judul, kategori, tanggal, penulis,
  // ringkasan, gambar, galeri) menempati kolom kiri.
  const isNews = activeTab === 'news'
  const newsInfoFields = isNews
    ? (CONTENT_FIELDS.news || []).filter((f) => f.name !== 'content')
    : []

  // Id stabil per kolom supaya <label> bisa dihubungkan ke input-nya
  // (`htmlFor`/`id`). Tanpa itu pembaca layar hanya membaca label tanpa
  // tahu kolom mana yang dimaksud, dan fokus ke kolom error jadi Difficulty.
  const fieldId = (name: string) => `field-${activeTab}-${name}`
  const contentFieldId = (name: string) => `field-${activeTab}-c-${name}`

  // Susunan baris grid tanpa lubang: field pendek dipasangkan berdua, field
  // panjang membentang penuh, dan field pendek yang sendirian dibuat penuh
  // supaya tidak ada setengah baris yang kosong (lihat computeSpans).
  const contentFields = CONTENT_FIELDS[activeTab] || []
  const contentSpans = computeSpans(contentFields, (f) => f.type === 'textarea' || f.type === 'list' || f.type === 'parent')
  // Tidak ada lagi field "\"menembang\"" (wide) di dialog generik — tab social
  // yang dulu butuh itu kini memakai `SocialFormDialog` tersendiri. Perilaku
  // pairing grid (field terakhir dari run ganjil membentang) tetap berlaku.
  const infoSpans = computeSpans(fields, () => false)

  return (
    <Dialog open onOpenChange={(val) => { if (!val) void requestClose() }}>
      <DialogContent
        className={cn(
          'flex max-h-[92vh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)]/95 p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl sm:rounded-2xl',
          isNews ? 'max-w-6xl h-[92vh]' : 'max-w-2xl',
        )}
      >
        {/* ── Header ── */}
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/50 to-[var(--accent-gold)]/10 px-5 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" />
          <div className="relative flex items-center gap-3.5 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]">
              <tab.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]/75 uppercase">
                {mode === 'create' ? 'Tambah Data' : 'Ubah Data'}
              </p>
              <DialogTitle className="mt-0.5 truncate font-heading text-lg font-bold leading-snug text-[var(--text)]">
                {tab.label}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div
          className={cn(
            'flex-1 min-h-0 bg-[var(--bg-secondary)]/35',
            isNews
              ? 'overflow-y-auto lg:overflow-hidden p-4 sm:p-5 lg:p-6'
              : 'modal-scroll overflow-y-auto space-y-5 px-5 py-5 sm:px-6',
          )}
        >
          {isNews ? (
            // Berita: data pendukung di kiri (scroll sendiri), isi artikel di kanan (editor independen).
            <div className="grid h-full min-h-0 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
              {/* Kolom kiri: data pendukung + gambar utama + galeri foto */}
              <div className="news-scroll-pane h-full min-h-0 space-y-5 overflow-y-auto overscroll-contain pr-2">
                <FormSection label="Informasi Berita" icon={ListChecks}>
                  <div className="space-y-4">
                    {newsInfoFields.map((f) => {
                      const key = `_c_${f.name}`
                      const error = fieldErrors[key]
                      return (
                        <Field
                          key={f.name}
                          label={f.label}
                          htmlFor={contentFieldId(f.name)}
                          required={f.name === 'title'}
                          wide
                        >
                          {f.type === 'textarea' ? (
                            <Textarea
                              id={contentFieldId(f.name)}
                              ref={(el) => { fieldRefs.current[key] = el }}
                              className={cn(TEXTAREA_CLASS, error && FIELD_ERROR_CLASS)}
                              error={error}
                              value={String(formData[key] ?? '')}
                              onChange={(e) => {
                                setFormData({ ...formData, [key]: e.target.value })
                                clearFieldError(key)
                              }}
                              rows={4}
                            />
                          ) : (
                            <Input
                              id={contentFieldId(f.name)}
                              ref={(el) => { fieldRefs.current[key] = el }}
                              className={cn(FIELD_CLASS, error && FIELD_ERROR_CLASS)}
                              error={error}
                              type="text"
                              value={String(formData[key] ?? '')}
                              onChange={(e) => {
                                setFormData({ ...formData, [key]: e.target.value })
                                clearFieldError(key)
                              }}
                            />
                          )}
                        </Field>
                      )
                    })}
                  </div>
                </FormSection>

                <FormSection label="Publikasi" icon={CalendarDays}>
                  <div className="space-y-4">
                    {fields.map((f) => (
                      <Field
                        key={f.name}
                        label={f.label}
                        htmlFor={fieldId(f.name)}
                        required={f.required}
                        wide
                      >
                        {f.type === 'select' ? (
                          <select
                            id={fieldId(f.name)}
                            ref={(el) => { fieldRefs.current[f.name] = el }}
                            aria-invalid={!!fieldErrors[f.name]}
                            className={cn(SELECT_CLASS, fieldErrors[f.name] && FIELD_ERROR_CLASS)}
                            value={String(formData[f.name] ?? '')}
                            onChange={(e) => {
                              setFormData({ ...formData, [f.name]: e.target.value })
                              clearFieldError(f.name)
                            }}
                          >
                            <option value="">— Pilih {f.label} —</option>
                            {(f.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                            {/* Kategori lama di luar daftar statis tetap
                                ditampilkan agar tidak hilang saat disunting. */}
                            {(() => {
                              const current = String(formData[f.name] ?? '')
                              return current && !(f.options ?? []).includes(current)
                                ? <option value={current}>{current}</option>
                                : null
                            })()}
                          </select>
                        ) : (
                          <Input
                            id={fieldId(f.name)}
                            ref={(el) => { fieldRefs.current[f.name] = el }}
                            className={cn(FIELD_CLASS, fieldErrors[f.name] && FIELD_ERROR_CLASS)}
                            error={fieldErrors[f.name]}
                            type={f.type === 'date' ? 'date' : 'text'}
                            maxLength={maxLengthFor(f.name)}
                            value={String(formData[f.name] ?? '')}
                            onChange={(e) => {
                              setFormData({ ...formData, [f.name]: e.target.value })
                              clearFieldError(f.name)
                            }}
                          />
                        )}
                        {f.type === 'select' && fieldErrors[f.name] && (
                          <p className="mt-1.5 text-xs font-medium text-destructive">{fieldErrors[f.name]}</p>
                        )}
                      </Field>
                    ))}
                  </div>
                </FormSection>

                <ImageSection
                  value={formData.image ?? ''}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                />

                <GallerySection
                  value={formData.gallery ?? []}
                  onChange={(urls) => setFormData({ ...formData, gallery: urls })}
                />
              </div>

              {/* Kolom kanan: editor berita independen (Toolbar & Header diam, hanya area tulis yang scroll jika melebihi tinggi) */}
              <div className="h-full min-h-0 flex flex-col overflow-hidden">
                <FormSection
                  label="Isi Berita"
                  icon={FileText}
                  hint="Editor teks kaya"
                  className="h-full flex flex-col min-h-0"
                  contentClassName="flex-1 min-h-0 flex flex-col p-3 sm:p-4"
                >
                  <RichTextEditor
                    id={contentFieldId('content')}
                    value={String(formData['_c_content'] ?? '')}
                    onChange={(html) => setFormData({ ...formData, _c_content: html })}
                    placeholder="Tulis isi berita di sini…"
                    className="h-full flex flex-col min-h-0"
                  />
                </FormSection>
              </div>
            </div>
          ) : (
            <>
          {/* ── Detail Konten ── */}
          {HAS_CONTENT.includes(activeTab) && (
            <FormSection label="Detail Konten" icon={FileText}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {contentFields.map((f, idx) => (
                  <Field
                    key={f.name}
                    label={f.label}
                    htmlFor={contentFieldId(f.name)}
                    wide={contentSpans[idx]}
                  >
                    {f.type === 'list' || f.type === 'textarea' ? (
                      <Textarea
                        id={contentFieldId(f.name)}
                        className={TEXTAREA_CLASS}
                        value={String(formData[`_c_${f.name}`] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [`_c_${f.name}`]: e.target.value })}
                        rows={f.type === 'textarea' ? 5 : 4}
                      />
                    ) : f.type === 'number' ? (
                      <Input
                        id={contentFieldId(f.name)}
                        className={FIELD_CLASS}
                        type="number"
                        value={String(formData[`_c_${f.name}`] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [`_c_${f.name}`]: e.target.value })}
                      />
                    ) : f.type === 'parent' ? (
                      <select
                        id={contentFieldId(f.name)}
                        className="h-11 w-full rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none"
                        value={String(formData[`_c_${f.name}`] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [`_c_${f.name}`]: e.target.value })}
                      >
                        <option value="">— Tidak ada (posisi puncak) —</option>
                        {staffOptions.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}{s.position ? ` — ${s.position}` : ''}</option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={contentFieldId(f.name)}
                        className={FIELD_CLASS}
                        type="text"
                        value={String(formData[`_c_${f.name}`] ?? '')}
                        onChange={(e) => setFormData({ ...formData, [`_c_${f.name}`]: e.target.value })}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </FormSection>
          )}

          {/* ── Gambar ── */}
          <ImageSection
            value={formData.image ?? ''}
            onChange={(url) => setFormData({ ...formData, image: url })}
          />

          {/* ── Galeri ── */}
          {activeTab === 'news' && (
            <GallerySection
              value={formData.gallery ?? []}
              onChange={(urls) => setFormData({ ...formData, gallery: urls })}
            />
          )}

          {/* ── Informasi Utama ── */}
          {fields.length > 0 && (
            <FormSection label="Informasi Utama" icon={ListChecks}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {fields.map((f, idx) => (
                  <Field
                    key={f.name}
                    label={f.label}
                    htmlFor={fieldId(f.name)}
                    required={f.required}
                    wide={infoSpans[idx]}
                  >
                    {f.type === 'textarea' ? (
                      <Textarea
                        id={fieldId(f.name)}
                        ref={(el) => { fieldRefs.current[f.name] = el }}
                        className={cn(TEXTAREA_CLASS, fieldErrors[f.name] && FIELD_ERROR_CLASS)}
                        error={fieldErrors[f.name]}
                        value={String(formData[f.name] ?? '')}
                        onChange={(e) => {
                          setFormData({ ...formData, [f.name]: e.target.value })
                          clearFieldError(f.name)
                        }}
                        rows={4}
                        maxLength={10000}
                      />
                    ) : f.type === 'select' ? (
                      <select
                        id={fieldId(f.name)}
                        ref={(el) => { fieldRefs.current[f.name] = el }}
                        aria-invalid={!!fieldErrors[f.name]}
                        className={cn(SELECT_CLASS, fieldErrors[f.name] && FIELD_ERROR_CLASS)}
                        value={String(formData[f.name] ?? '')}
                        onChange={(e) => {
                          setFormData({ ...formData, [f.name]: e.target.value })
                          clearFieldError(f.name)
                        }}
                      >
                        <option value="">— Pilih {f.label} —</option>
                        {(f.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        {(() => {
                          const current = String(formData[f.name] ?? '')
                          return current && !(f.options ?? []).includes(current)
                            ? <option value={current}>{current}</option>
                            : null
                        })()}
                      </select>
                    ) : (
                      <Input
                        id={fieldId(f.name)}
                        ref={(el) => { fieldRefs.current[f.name] = el }}
                        className={cn(FIELD_CLASS, fieldErrors[f.name] && FIELD_ERROR_CLASS)}
                        error={fieldErrors[f.name]}
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        maxLength={maxLengthFor(f.name)}
                        value={String(formData[f.name] ?? '')}
                        onChange={(e) => {
                          setFormData({ ...formData, [f.name]: e.target.value })
                          clearFieldError(f.name)
                        }}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </FormSection>
          )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/80 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {isDirty ? (
              // Penanda eksplisit bahwa isi form belum sampai ke server. Tanpa
              // ini admin bisa mengira upload/teksannya sudah tersimpan.
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Perubahan belum disimpan
              </p>
            ) : (
              <p className="hidden items-center gap-1.5 text-xs text-[var(--text-muted)] sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                {hasRequired ? '* Wajib diisi' : 'Perubahan langsung tersinkron ke situs publik.'}
              </p>
            )}
            <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
              <Button variant="ghost" onClick={() => void requestClose()} className="rounded-xl text-[var(--text-secondary)]">
                Batal
              </Button>
              <Button onClick={handleSave} loading={saving} className="min-w-[120px] gap-2 rounded-xl">
                {!saving && <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan…' : mode === 'create' ? 'Simpan' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Small helpers ──────────────────────────────────────────────────────────────

/**
 * Bagi field ke baris grid 2 kolom tanpa setengah baris kosong: field yang
 * ditandai `isWide` selalu membentang penuh, field pendek dipasangkan berdua,
 * dan bila rentetan field pendek berjumlah ganjil maka field terakhir dibuat
 * penuh. Return: `true` = field membentang dua kolom.
 */
function computeSpans<T>(items: T[], isWide: (item: T) => boolean): boolean[] {
  const spans = items.map(isWide)
  let runStart = -1

  const closeRun = (end: number) => {
    if (runStart >= 0 && (end - runStart) % 2 === 1) spans[end - 1] = true
    runStart = -1
  }

  items.forEach((item, i) => {
    if (isWide(item)) closeRun(i)
    else if (runStart < 0) runStart = i
  })
  closeRun(items.length)

  return spans
}

export function FormSection({
  label, icon: Icon, tone = 'emerald', hint, className, contentClassName, children,
}: {
  label: string
  icon: LucideIcon
  tone?: 'emerald' | 'gold'
  hint?: string
  className?: string
  contentClassName?: string
  children: ReactNode
}) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-[var(--border)]/70 bg-white/85 shadow-[0_1px_3px_rgba(15,60,40,0.05)]', className)}>
      <div className="shrink-0 flex items-center gap-2.5 border-b border-[var(--border)]/60 bg-[var(--bg-secondary)]/45 px-4 py-2.5">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-lg',
            tone === 'gold' ? 'bg-[var(--accent-gold)]/15 text-[#A67C2E]' : 'bg-[var(--accent-subtle)] text-[var(--accent)]',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-semibold tracking-[0.14em] text-[var(--text-secondary)] uppercase">{label}</span>
        {hint && <span className="ml-auto text-[11px] text-[var(--text-muted)]">{hint}</span>}
      </div>
      <div className={cn('p-4 sm:p-5', contentClassName)}>{children}</div>
    </section>
  )
}

export function Field({
  label, htmlFor, required, wide, children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', wide && 'sm:col-span-2')}>
      {/* Label dijaga satu baris (truncate + tooltip) supaya input yang
          sebaris selalu rata atas-bawah walau labelnya panjang. */}
      <Label
        htmlFor={htmlFor}
        title={label}
        className="block truncate text-[13px] font-medium text-[var(--text-secondary)]"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true"> *</span>}
      </Label>
      {children}
    </div>
  )
}

function ModeToggle({
  mode, onMode,
}: { mode: 'upload' | 'url'; onMode: (m: 'upload' | 'url') => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-[var(--bg-secondary)] p-1">
      {(['upload', 'url'] as const).map((m) => (
        <button
          key={m} type="button" onClick={() => onMode(m)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
            mode === m
              ? 'bg-white text-[var(--text)] shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text)]',
          )}
        >
          {m === 'upload' ? <Upload className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          {m === 'upload' ? 'Upload' : 'URL'}
        </button>
      ))}
    </div>
  )
}

/**
 * Unggah/pilih satu gambar utama. Upload hanya menaruh file di storage;
 * datanya baru tersimpan saat admin menekan "Simpan" (lihat pesan toast).
 */
function ImageSection({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.uploadImage(file)
      onChange(url)
      toast('success', 'Gambar diunggah — tekan Simpan untuk menyimpan')
    } catch (e) {
      toast('error', 'Upload gagal: ' + errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <FormSection label="Gambar Utama" icon={ImageIcon} tone="gold">
      <div className="space-y-3.5">
        <ModeToggle mode={mode} onMode={setMode} />

        {mode === 'upload' ? (
          <label className="group flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[var(--border)] bg-white/60 px-4 py-7 text-center transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)]/60">
            <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] transition-transform group-hover:scale-105">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            </span>
            <span className="text-sm font-semibold text-[var(--text)]">
              {uploading ? 'Mengunggah…' : 'Klik untuk pilih gambar'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">PNG, JPG, atau WEBP</span>
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        ) : (
          <div className="relative">
            <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              className={cn(FIELD_CLASS, 'pl-9')}
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        )}

        {value && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-[var(--border)]/70 bg-white/70 p-3">
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
              <Image
                src={value} alt="Pratinjau gambar" width={96} height={64}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">Pratinjau</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed break-all text-[var(--text-secondary)]">{value}</p>
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-500"
              aria-label="Hapus URL gambar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </FormSection>
  )
}

/** Galeri tambahan artikel berita (upload banyak gambar atau tempel URL). */
function GallerySection({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const [mode, setMode] = useState<'upload' | 'url'>('upload')
  const [inputValue, setInputValue] = useState('')
  const [uploading, setUploading] = useState(false)

  const images = Array.isArray(value) ? value : []

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.uploadImage(file)
      onChange([...images, url])
      toast('success', 'Gambar ditambahkan ke galeri — tekan Simpan untuk menyimpan')
    } catch (e) {
      toast('error', 'Upload gagal: ' + errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  function addItem(url: string) {
    if (!url.trim()) return
    onChange([...images, url.trim()])
    setInputValue('')
  }

  function removeItem(index: number) {
    const updated = [...images]
    updated.splice(index, 1)
    onChange(updated)
  }

  return (
    <FormSection
      label="Galeri Foto Berita"
      icon={Images}
      tone="gold"
      hint={images.length > 0 ? `${images.length} gambar` : 'Belum ada gambar'}
    >
      <div className="space-y-3.5">
        {images.length > 0 && (
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
            {images.map((url, idx) => (
              <div key={`${url}-${idx}`} className="group relative aspect-4/3 overflow-hidden rounded-xl border border-[var(--border)]/70 bg-[var(--bg-secondary)]">
                <Image
                  src={url} alt={`Galeri ${idx + 1}`} width={160} height={120}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <button
                  type="button" onClick={() => removeItem(idx)}
                  className="absolute top-1.5 right-1.5 rounded-lg bg-white/90 p-1.5 text-[var(--text-secondary)] shadow-sm transition-all hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  aria-label={`Hapus gambar ${idx + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <ModeToggle mode={mode} onMode={setMode} />
        {mode === 'upload' ? (
          <label className="group inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-[var(--border)] bg-white/60 px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)]/60 hover:text-[var(--text)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </span>
            {uploading ? 'Mengunggah…' : 'Tambah dari file'}
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                className={cn(FIELD_CLASS, 'pl-9')}
                type="url" value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <button
              type="button"
              onClick={() => addItem(inputValue)}
              disabled={!inputValue.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-sm transition-all hover:bg-[var(--accent)]/90 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Tambah galeri"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </FormSection>
  )
}
