'use client'

import { useState, useRef } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronDown, Link2, Save, ShieldCheck, Sparkles, XCircle,
} from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from '@/app/components/ui/AdminToast'
import { confirm } from '@/app/components/ui/AdminConfirm'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/app/components/ui/Dialog'
import { FormSection, Field } from '../CrudFormDialog'
import { TABS, SOCIAL_PRESETS } from '../_constants'
import type { FormState, RowRecord } from '../_types'
import { errorMessage } from '../_types'
import { SocialIcon } from './SocialIcon'
import {
  SOCIAL_PATH_MAX_LENGTH,
  isSocialPresetPath,
  matchSocialPreset,
  validateSocialHref,
  validateSocialPath,
} from './social-utils'
import type { SocialPreset } from './social-utils'

interface Props {
  mode: 'create' | 'edit'
  activeTab: string
  editingItem: RowRecord | null
  formData: FormState
  setFormData: (fd: FormState) => void
  onClose: () => void
  onSaved: () => void
}

// Pesan wajib sesuai kontrak backend: `label`, `href`, dan `path` memang NOT
// NULL — REQUIRED_FIELDS['social-links'] menolak create tanpa ketiganya (422).
const LABEL_REQUIRED_MESSAGE = 'Label wajib diisi — ini nama tampilan di situs publik.'
const HREF_REQUIRED_MESSAGE = 'URL wajib diisi — kolom ini menentukan tujuan ikon saat diklik.'
const PATH_REQUIRED_MESSAGE = 'Ikon wajib dipilih — pilih preset atau isi path kustom.'

// Gaya field mengikuti CrudFormDialog supaya seluruh form dashboard terasa satu
// design system: sudut lembut, fokus ring zamrud, permukaan putih.
const FIELD_CLASS =
  'h-11 rounded-xl border-[var(--border)] bg-white/90 focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

const FIELD_ERROR_CLASS =
  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'

const PATH_TEXTAREA_CLASS =
  'rounded-xl border-[var(--border)] bg-white/90 font-mono text-xs leading-relaxed focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * Modal Tambah/Edit Tautan Sosial dua kolom:
 *
 * - Kolom kiri = form (Label, URL, preset ikon, SVG Path kustom) dengan scroll
 *   vertikal independen.
 * - Kolom kanan = pratinjau live yang merepresentasikan renderer situs publik
 *   (Footer = ikon 20px, Halaman Kontak = ikon 28px) + ringkasan data.
 * - Header/footer fixed (tidak ikut scroll) — pola sama dengan
 *   TestimonialFormDialog: `flex flex-col` + `min-h-0` + `overflow-y-auto`
 *   hanya pada pane.
 *
 * Kontrak data (jangan diubah): payload HANYA { label, href, path } —
 * whitelist backend menolak kunci lain. Path = data atribut `d` SVG.
 */
export function SocialFormDialog({
  mode, activeTab, editingItem, formData, setFormData, onClose, onSaved,
}: Props) {
  const tab = TABS.find((t) => t.key === activeTab)!
  const TabIcon = tab.icon

  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  // Error format URL baru muncul setelah admin melepas fokus/klik simpan —
  // tidak mengganggu saat masih mengetik.
  const [touchedHref, setTouchedHref] = useState(false)
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({})

  // Snapshot saat mount (dialog dirender kondisional → mount baru per buka).
  const [initialFormData] = useState<FormState>(formData)
  const initialLabel = asString(initialFormData.label)
  const initialHref = asString(initialFormData.href)
  const initialPath = asString(initialFormData.path)
  const isDirty = isFormDirty(formData, initialFormData)

  // Penanda apakah Label pernah diketik manual pada sesi ini. Dipakai untuk
  // memutuskan boleh tidaknya preset mengisi Label otomatis — nilai kustom
  // admin TIDAK PERNAH ditimpa diam-diam oleh perubahan preset.
  // Edit entri lama → Label datanya tersentuh walau sama dengan preset.
  const [labelCustom, setLabelCustom] = useState(() => Boolean(initialLabel.trim()))

  // Notice "path kustom tertimpa preset" — berisi nilai lama + tombol pemulihan.
  const [replacedCustom, setReplacedCustom] = useState<
    { path: string; presetLabel: string } | null
  >(null)

  // Panel path kustom: terbuka otomatis saat membuka entri ber-ikon kustom.
  const [customOpen, setCustomOpen] = useState(
    Boolean(initialPath.trim()) && !isSocialPresetPath(initialPath),
  )
  const [customExpanded, setCustomExpanded] = useState(false)

  // Nilai form (sumber kebenaran tetap `formData` milik parent — pola sama
  // dengan dialog-dashboard lain, controlled w/ setFormData).
  const label = asString(formData.label)
  const href = asString(formData.href)
  const path = asString(formData.path)

  const selectedPreset = path.trim() ? matchSocialPreset(path) : undefined
  const isCustomIcon = Boolean(path.trim()) && !selectedPreset

  /** Error kolom hilang begitu admin mulai mengisi ulang kolom itu. */
  function clearFieldError(name: string) {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function updateField(name: string, value: string) {
    setFormData({ ...formData, [name]: value })
  }

  function handleChangeLabel(value: string) {
    setLabelCustom(true)
    updateField('label', value)
    clearFieldError('label')
  }

  function handleChangeHref(value: string) {
    updateField('href', value)
    clearFieldError('href')
  }

  function handleChangePath(value: string) {
    updateField('path', value)
    clearFieldError('path')
  }

  /**
   * Pilih preset ikon.
   *
   * Aturan anti-kehilangan-data:
   * - Label otomatis HANYA bila belum pernah diketik manual dan (kosong atau
   *   masih berisi nama preset sebelumnya).
   * - Path kustom yang tertimpa tidak hilang: disimpan pada notice + tombol
   *   "Pulihkan" eksplisit.
   */
  function pickPreset(preset: SocialPreset) {
    const currentPath = path
    if (currentPath === preset.path) return

    const next: FormState = { ...formData, path: preset.path }
    const labelIsAutoFillable =
      !labelCustom &&
      (label.trim() === '' || SOCIAL_PRESETS.some((p) => p.label === label.trim()))
    if (labelIsAutoFillable) {
      next.label = preset.label
      setFieldErrors((prev) => {
        if (!('label' in prev)) return prev
        const rest = { ...prev }
        delete rest.label
        return rest
      })
    }
    setFormData(next)
    clearFieldError('path')

    if (currentPath.trim() && !isSocialPresetPath(currentPath)) {
      setReplacedCustom({ path: currentPath, presetLabel: preset.label })
    }
  }

  /** Kembalikan path kustom yang tertimpa oleh pilihan preset. */
  function restoreReplacedCustom() {
    if (!replacedCustom) return
    setFormData({ ...formData, path: replacedCustom.path })
    setReplacedCustom(null)
    setCustomOpen(true)
    clearFieldError('path')
  }

  // ── Validasi tampilan ─────────────────────────────────────────────────────
  // Ketat HANYA untuk nilai yang diubah admin pada sesi ini; data lama yang
  // tidak disentuh selalu bisa disimpan tanpa kehilangan nilai.

  const hrefLiveIssue = validateSocialHref(href, { required: false })
  const pathLive = validateSocialPath(path, { required: true })

  const labelError =
    fieldErrors.label ??
    (submitted && label.trim() === '' ? LABEL_REQUIRED_MESSAGE : undefined)
  const hrefError =
    fieldErrors.href ??
    (submitted && href.trim() === '' ? HREF_REQUIRED_MESSAGE : undefined) ??
    (hrefLiveIssue && (touchedHref || submitted) && href !== initialHref
      ? hrefLiveIssue
      : undefined)
  const pathError =
    fieldErrors.path ??
    (pathLive.error && (path !== initialPath || submitted) ? pathLive.error : undefined)

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    const labelVal = asString(formData.label)
    const hrefVal = asString(formData.href)
    const pathVal = asString(formData.path)

    const errors: Record<string, string> = {}
    if (labelVal.trim() === '') errors.label = LABEL_REQUIRED_MESSAGE
    if (hrefVal.trim() === '') {
      errors.href = HREF_REQUIRED_MESSAGE
    } else if (hrefVal !== initialHref) {
      const issue = validateSocialHref(hrefVal, { required: false })
      if (issue) errors.href = issue
    }
    if (pathVal.trim() === '') {
      errors.path = PATH_REQUIRED_MESSAGE
    } else if (pathVal !== initialPath) {
      const verdict = validateSocialPath(pathVal, { required: false })
      if (verdict.error) errors.path = verdict.error
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setSubmitted(true)
      const firstInvalid = ['label', 'href', 'path'].find((k) => k in errors)
      if (firstInvalid) fieldRefs.current[firstInvalid]?.focus()
      toast('error', 'Periksa lagi kolom yang ditandai merah.')
      return
    }

    setFieldErrors({})
    setSaving(true)
    try {
      // Payload HANYA kolom yang diwhitelist backend `social-links` —
      // kunci lain (mis. `image`) ditolak backend dengan 400.
      const payload = { label: labelVal, href: hrefVal, path: pathVal }
      if (mode === 'edit' && editingItem) {
        await api.updateItem(`${tab.endpoint}/${editingItem.id}`, payload)
      } else {
        await api.createItem(tab.endpoint, payload)
      }
      onClose()
      onSaved()
      toast('success', mode === 'create' ? 'Tautan sosial ditambahkan' : 'Tautan sosial disimpan')
    } catch (e) {
      const message = errorMessage(e, 'Gagal menyimpan tautan sosial')
      // 422 backend menyebut nama kolom, mis. "Field 'href' is required" —
      // petakan ke error kolomnya supaya admin tahu persis mana yang ditolak.
      const match = /['"](\w+)['"]/.exec(message)
      if (match && ['label', 'href', 'path'].includes(match[1])) {
        setFieldErrors({ [match[1]]: message })
        fieldRefs.current[match[1]]?.focus()
      }
      toast('error', message)
    } finally {
      setSaving(false)
    }
  }

  /**
   * Tutup modal, minta konfirmasi bila ada perubahan yang belum disimpan.
   * Dipakai Escape / tombol X built-in Radix / area gelap / tombol Batal.
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

  // ── Status kesiapan pratinjau ─────────────────────────────────────────────
  const renderable = pathLive.renderable
  const hrefEmpty = href.trim() === ''
  const readiness: { tone: 'ok' | 'warn' | 'bad'; text: string; Icon: typeof CheckCircle2 }[] = []
  if (hrefEmpty) {
    readiness.push({ tone: 'bad', text: 'URL kosong — tautan tidak akan tampil di situs publik.', Icon: XCircle })
  } else if (hrefLiveIssue) {
    readiness.push({ tone: 'warn', text: `URL perlu diperiksa: ${hrefLiveIssue}`, Icon: AlertTriangle })
  }
  if (path.trim() === '') {
    readiness.push({ tone: 'bad', text: 'Ikon belum dipilih — pilih salah satu preset.', Icon: XCircle })
  } else if (!renderable) {
    readiness.push({ tone: 'bad', text: 'Path ikon tidak dapat dirender — periksa formatnya.', Icon: XCircle })
  }
  if (readiness.length === 0) {
    readiness.push({ tone: 'ok', text: 'Siap tampil di footer dan halaman Kontak.', Icon: CheckCircle2 })
  }

  const hrefPlaceholder = selectedPreset?.hint ?? 'https://instagram.com/username'

  return (
    <Dialog open onOpenChange={(val) => { if (!val) void requestClose() }}>
      <DialogContent
        className={cn(
          'flex h-[min(92dvh,780px)] max-h-[92dvh] w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-white/70 bg-[var(--bg-elevated)]/95 p-0 shadow-[0_24px_80px_-24px_rgba(15,60,40,0.45)] backdrop-blur-xl sm:w-[calc(100vw-1.5rem)] sm:rounded-2xl',
          'max-w-3xl lg:max-w-4xl',
        )}
      >
        {/* ── Header (fixed — tidak ikut scroll) ── */}
        <div className="relative shrink-0 overflow-hidden border-b border-[var(--border)]/70 bg-gradient-to-r from-[var(--accent-subtle)] via-white/50 to-[var(--accent-gold)]/10 px-5 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -top-10 -right-8 h-28 w-28 rounded-full bg-[var(--accent-gold)]/20 blur-2xl" />
          <div className="relative flex items-center gap-3.5 pr-10">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[#145337] text-white shadow-[0_10px_24px_-8px_rgba(26,107,71,0.55)]">
              <TabIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]/75 uppercase">
                {mode === 'create' ? 'Tambah Tautan Sosial' : 'Edit Tautan Sosial'}
              </p>
              <DialogTitle className="mt-0.5 truncate font-heading text-lg font-bold leading-snug text-[var(--text)]">
                {tab.label}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                Ikon dan tautan ini tampil di footer dan halaman Kontak website.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* ── Body (grid dua kolom; scroll independen mulai md+) ── */}
        <div className="social-form-pane min-h-0 flex-1 overflow-y-auto bg-[var(--bg-secondary)]/35 md:overflow-hidden">
          <div className="grid min-h-0 grid-cols-1 md:h-full md:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-cols-[minmax(0,1fr)_20rem]">
            {/* ── Kolom kiri: form (scroll vertikal independen) ── */}
            <div className="social-form-pane min-w-0 space-y-5 px-5 py-5 sm:px-6 md:min-h-0 md:overflow-y-auto md:py-5 lg:py-6">
              <FormSection label="Platform & Tautan" icon={Link2}>
                <div className="space-y-5">
                  <Field label="Label Platform" htmlFor="field-social-label" required>
                    <Input
                      id="field-social-label"
                      ref={(el) => { fieldRefs.current.label = el }}
                      className={cn(FIELD_CLASS, labelError && FIELD_ERROR_CLASS)}
                      error={labelError}
                      type="text"
                      maxLength={255}
                      placeholder="Instagram"
                      value={label}
                      onChange={(e) => handleChangeLabel(e.target.value)}
                    />
                    <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                      Nama platform, mis. “Instagram” — bebas kustom seperti “Instagram Resmi”. Dipakai
                      sebagai nama aksesibel ikon di situs publik.
                    </p>
                    {/* Tawaran eksplisit: label kustom tidak pernah ditimpa
                        sendiri oleh perubahan preset. */}
                    {selectedPreset && labelCustom && label.trim() !== '' && label.trim() !== selectedPreset.label && (
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
                        <span>Label kustom dipertahankan.</span>
                        <button
                          type="button"
                          onClick={() => { updateField('label', selectedPreset.label); clearFieldError('label') }}
                          className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                        >
                          Gunakan “{selectedPreset.label}”
                        </button>
                      </p>
                    )}
                  </Field>

                  <Field label="URL Profil" htmlFor="field-social-href" required>
                    <Input
                      id="field-social-href"
                      ref={(el) => { fieldRefs.current.href = el }}
                      className={cn(FIELD_CLASS, hrefError && FIELD_ERROR_CLASS)}
                      error={hrefError}
                      type="url"
                      maxLength={255}
                      placeholder={hrefPlaceholder}
                      value={href}
                      onChange={(e) => handleChangeHref(e.target.value)}
                      onBlur={() => setTouchedHref(true)}
                    />
                    <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                      Tautan profil resmi — pengunjung diarahkan ke URL ini saat ikon diklik.
                      {selectedPreset?.hint ? ` Contoh ${selectedPreset.label}: ${selectedPreset.hint}` : ''}
                    </p>
                  </Field>
                </div>
              </FormSection>

              <FormSection
                label="Ikon Sosial"
                icon={Sparkles}
                hint={`${SOCIAL_PRESETS.length} preset`}
              >
                {/* Notice pemulihan path kustom yang tertimpa pilihan preset. */}
                {replacedCustom && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                    <span className="flex-1">
                      Path kustom tadi diganti dengan preset {replacedCustom.presetLabel}. Nilai lama tidak hilang.
                    </span>
                    <button
                      type="button"
                      onClick={restoreReplacedCustom}
                      className="shrink-0 rounded-lg border border-amber-300 bg-white/70 px-2.5 py-1 font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      Pulihkan
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {SOCIAL_PRESETS.map((preset) => {
                    const isSelected = selectedPreset?.label === preset.label
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => pickPreset(preset)}
                        aria-pressed={isSelected}
                        aria-label={`Gunakan ikon ${preset.label}`}
                        title={preset.label}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)] ring-2 ring-[var(--accent)]/25'
                            : 'border-[var(--border)] bg-white/70 text-[var(--text)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent-subtle)]/50 hover:text-[var(--accent)]',
                        )}
                      >
                        <SocialIcon path={preset.path} className="h-6 w-6" />
                        <span className="w-full truncate text-center text-[10px] leading-tight text-[var(--text-secondary)]">
                          {preset.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Path kustom: format backend adalah data atribut `d` SVG —
                    kolom `path` NOT NULL, textarea bebas ini yang membuat ikon
                    di luar preset tetap memungkinkan. */}
                <div className="mt-3 rounded-2xl border border-dashed border-[var(--border)] bg-white/50">
                  <button
                    type="button"
                    onClick={() => setCustomOpen((open) => !open)}
                    aria-expanded={customOpen}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-gold)]/15 text-[#A67C2E]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 text-[13px] font-semibold text-[var(--text)]">
                      Ikon Kustom (SVG Path)
                    </span>
                    {isCustomIcon && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--accent-gold)]/15 px-2 py-0.5 text-[10px] font-semibold text-[#9A7429]">
                        Kustom
                      </span>
                    )}
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        'h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200',
                        customOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {customOpen && (
                    <div className="space-y-2 px-4 pb-4">
                      <Textarea
                        ref={(el) => { fieldRefs.current.path = el }}
                        id="field-social-path"
                        className={cn(PATH_TEXTAREA_CLASS, pathError && FIELD_ERROR_CLASS)}
                        error={pathError}
                        value={path}
                        onChange={(e) => handleChangePath(e.target.value)}
                        maxLength={SOCIAL_PATH_MAX_LENGTH}
                        rows={customExpanded ? 8 : 3}
                        placeholder="M12 2c2.717 0 3.056.01 4.122.06…"
                        aria-label="SVG Path ikon kustom"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                          Tempel <span className="font-semibold">isi atribut d</span> dari SVG — bukan markup
                          {'<svg>'}{' '}lengkap. Mengedit isinya otomatis menjadi ikon kustom.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCustomExpanded((expanded) => !expanded)}
                          className="shrink-0 text-[11px] font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                        >
                          {customExpanded ? 'Ringkas' : 'Perbesar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
            </div>

            {/* ── Kolom kanan: pratinjau live (scroll independen) ── */}
            <aside
              className="social-form-pane min-w-0 border-t border-[var(--border)]/70 bg-[var(--bg-secondary)]/45 px-5 py-5 sm:px-6 md:min-h-0 md:overflow-y-auto md:border-t-0 md:border-l lg:py-6"
              aria-label="Pratinjau tampilan situs publik"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-[var(--accent)]/75 uppercase">
                    Pratinjau
                  </p>
                  <h4 className="mt-0.5 font-heading text-sm font-bold text-[var(--text)]">
                    Cara tampil di situs publik
                  </h4>
                </div>

                {/* Mock Footer — style setia pada Footer.tsx (ikon 20px di
                    dalam chip bulat p-3, warna muted → hover accent). */}
                <div className="rounded-xl border border-[var(--border)]/80 bg-white p-4">
                  <p className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">
                    Footer Website
                  </p>
                  <div className="flex items-center gap-3">
                    {href.trim() && renderable ? (
                      <span
                        className="flex shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                        title={label || href}
                      >
                        <SocialIcon path={path} className="h-5 w-5" />
                      </span>
                    ) : (
                      <span
                        className="flex shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/50 p-2 text-[var(--text-muted)]/60"
                        title="Ikon + URL belum lengkap — ikon ini tidak tampil di footer"
                      >
                        <Link2 className="h-5 w-5" />
                      </span>
                    )}
                    <span className="min-w-0 text-xs leading-relaxed text-[var(--text-muted)]">
                      {href.trim() && renderable
                        ? 'Pengunjung mengeklik ikon ini di footer situs.'
                        : 'Belum memenuhi syarat tampil (URL + ikon valid).'}
                    </span>
                  </div>
                </div>

                {/* Mock Halaman Kontak — ikon 28px center, setia pada
                    ContactClient.tsx (“Ikuti Kami”). */}
                <div className="rounded-xl border border-[var(--border)]/80 bg-white p-4 text-center">
                  <p className="mb-3 text-[10px] font-bold tracking-[0.16em] text-[var(--text-muted)] uppercase">
                    Halaman Kontak — Ikuti Kami
                  </p>
                  {href.trim() && renderable ? (
                    <span
                      className="inline-flex items-center justify-center rounded-full p-2 text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
                      title={label || href}
                    >
                      <SocialIcon path={path} className="h-7 w-7" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center rounded-full border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/50 p-2 text-[var(--text-muted)]/60">
                      <Link2 className="h-7 w-7" />
                    </span>
                  )}
                </div>

                {/* Ringkasan data aktual yang akan disimpan */}
                <div className="rounded-xl border border-[var(--border)]/80 bg-white p-4">
                  <dl className="space-y-2.5">
                    <div>
                      <dt className="text-[10px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">Label</dt>
                      <dd className="mt-0.5 break-words text-sm font-semibold text-[var(--text)]">
                        {label.trim() || <span className="font-normal text-[var(--text-muted)]">—</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">Tautan</dt>
                      <dd className="mt-0.5 break-all text-xs leading-relaxed text-[var(--text-secondary)]">
                        {href.trim() || <span className="text-[var(--text-muted)]">—</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">Ikon</dt>
                      <dd className="mt-0.5 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white',
                            renderable
                              ? 'border-[var(--border)] text-[var(--accent)]'
                              : 'border-dashed border-[var(--border)] text-[var(--text-muted)]',
                          )}
                        >
                          {renderable ? (
                            <SocialIcon path={path} className="h-4 w-4" />
                          ) : (
                            <Link2 className="h-4 w-4" />
                          )}
                        </span>
                        {selectedPreset?.label ?? (path.trim() ? 'Ikon Kustom' : '—')}
                      </dd>
                    </div>
                  </dl>

                  {/* Status kesiapan — live region utk pembaca layar */}
                  <div role="status" aria-live="polite" className="mt-4 space-y-1.5 border-t border-[var(--border)]/70 pt-3">
                    {readiness.map(({ tone, text, Icon }) => (
                      <p
                        key={text}
                        className={cn(
                          'flex items-start gap-2 text-xs font-medium leading-relaxed',
                          tone === 'ok' && 'text-emerald-600',
                          tone === 'warn' && 'text-amber-600',
                          tone === 'bad' && 'text-red-500',
                        )}
                      >
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{text}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* ── Footer (fixed — tidak ikut scroll) ── */}
        <div className="shrink-0 border-t border-[var(--border)]/70 bg-white/80 px-5 py-4 backdrop-blur sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {isDirty ? (
              // Penanda eksplisit bahwa isi form belum sampai ke server —
              // pola yang sama dengan CrudFormDialog.
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Perubahan belum disimpan
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                Situs publik diperbarui otomatis setelah simpan.
              </p>
            )}
            <div className="flex w-full items-center justify-end gap-2.5 sm:w-auto">
              <Button variant="ghost" onClick={() => void requestClose()} className="rounded-xl text-[var(--text-secondary)]">
                Batal
              </Button>
              <Button onClick={handleSave} loading={saving} className="min-w-[150px] gap-2 rounded-xl">
                {!saving && <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan…' : mode === 'create' ? 'Simpan Tautan Sosial' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
