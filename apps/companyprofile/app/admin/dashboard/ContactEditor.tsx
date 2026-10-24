'use client'

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import {
  AlertTriangle, Check, Clock, ExternalLink, Globe, GraduationCap, Loader2,
  Mail, Map as MapIcon, MapPin, MessageCircle, Phone, Save,
  ShieldCheck, type LucideIcon,
} from 'lucide-react'
import * as api from '@/app/lib/api'
import { cn } from '@/app/lib/utils'
import { isFormDirty } from '@/app/lib/form-dirty'
import { resolveMapsEmbed, type MapsEmbedResolved } from '@/app/lib/maps-embed'
import { errorMessage, type RowRecord } from './_types'
import { CONTACT_FIELDS, type ContactFieldDef } from './_constants'
import { toast } from '@/app/components/ui/AdminToast'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/app/components/ui/Card'
import { Field } from './CrudFormDialog'

interface Props {
  contactInfo: RowRecord | undefined
  canCrud: boolean
  onSave: () => void
}

// ── Tipe & konstanta ────────────────────────────────────────────────────────

type ContactFieldKey = ContactFieldDef['key']
type ContactFormState = Record<ContactFieldKey, string> & Record<string, string>
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const FIELD_ID_PREFIX = 'contact-'
const AUTO_SAVE_DELAY = 1500 // ms debounce auto-save

const FIELD_ICONS: Partial<Record<ContactFieldKey, { icon: LucideIcon; tone: 'muted' | 'emerald' }>> = {
  phone_primary: { icon: Phone, tone: 'muted' },
  phone_secondary: { icon: Phone, tone: 'muted' },
  whatsapp: { icon: MessageCircle, tone: 'emerald' },
  email_primary: { icon: Mail, tone: 'muted' },
  email_admission: { icon: Mail, tone: 'muted' },
  office_hours: { icon: Clock, tone: 'muted' },
}

const FIELD_CLASS =
  'h-11 rounded-xl border-[var(--border)] bg-white/90 text-sm text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'
const FIELD_ERROR_CLASS =
  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
const TEXTAREA_CLASS =
  'rounded-xl border-[var(--border)] bg-white/90 text-sm leading-relaxed focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 focus-visible:ring-offset-0'

function snapshotOf(contactInfo: RowRecord | undefined | null): ContactFormState {
  const form = {} as ContactFormState
  for (const f of CONTACT_FIELDS) {
    const raw = contactInfo?.[f.key]
    form[f.key] = typeof raw === 'string' ? raw : ''
  }
  return form
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(form: ContactFormState): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const key of ['email_primary', 'email_admission'] as const) {
    const value = (form[key] ?? '').trim()
    if (value && !EMAIL_PATTERN.test(value)) {
      errors[key] = 'Format email tidak valid, contoh: nama@domain.com'
    }
  }
  const embed = resolveMapsEmbed(form.maps_embed)
  if (embed.status === 'invalid' && embed.message) {
    errors.maps_embed = embed.message
  }
  return errors
}

// ── Section Card ────────────────────────────────────────────────────────────

function ContactSection({
  icon: Icon, title, description, children, aside,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <Card className="overflow-hidden border-[var(--border)]/70 bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)]/60 bg-[var(--bg-secondary)]/30 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-base font-bold leading-snug text-[var(--text)]">{title}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
          </div>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <CardContent className="p-5 pt-4">{children}</CardContent>
    </Card>
  )
}

// ── Field Renderer ──────────────────────────────────────────────────────────

function ContactField({
  def, value, hasError, errorText, disabled, onChange,
}: {
  def: ContactFieldDef
  value: string
  hasError: boolean
  errorText?: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const id = `${FIELD_ID_PREFIX}${def.key}`
  const meta = FIELD_ICONS[def.key]
  const hasIcon = Boolean(meta) && def.inputType !== 'textarea'

  const control = def.inputType === 'textarea' ? (
    <Textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={def.rows ?? 3}
      error={errorText}
      helperText={def.helper}
      placeholder={def.placeholder}
      aria-label={def.label}
      className={cn(TEXTAREA_CLASS, hasError && FIELD_ERROR_CLASS)}
    />
  ) : (
    <div className="relative">
      {meta && hasIcon && (
        <meta.icon
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2',
            meta.tone === 'emerald' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]',
          )}
        />
      )}
      <Input
        id={id}
        type={def.inputType === 'tel' ? 'tel' : def.inputType === 'email' ? 'email' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={def.placeholder}
        error={errorText}
        helperText={def.helper}
        aria-label={def.label}
        className={cn(FIELD_CLASS, hasIcon && 'pl-9', hasError && FIELD_ERROR_CLASS)}
      />
    </div>
  )

  return <Field label={def.label} htmlFor={id}>{control}</Field>
}

// ── Preview Components ──────────────────────────────────────────────────────

function PreviewRow({
  icon: Icon, label, value, href, external,
}: {
  icon: LucideIcon
  label: string
  value: string
  href?: string
  external?: boolean
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)]/60 bg-white/70 p-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[var(--text-muted)] uppercase">{label}</p>
        {value && href ? (
          <a
            href={href}
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="mt-0.5 block text-sm font-medium break-words text-[var(--accent)] hover:underline"
          >
            {value}
          </a>
        ) : value ? (
          <p className="mt-0.5 text-sm font-medium break-words whitespace-pre-line text-[var(--text)]">{value}</p>
        ) : (
          <p className="mt-0.5 text-xs text-[var(--text-muted)] italic">Belum diisi</p>
        )}
      </div>
    </div>
  )
}

function ContactRowsPreview({ form }: { form: ContactFormState }) {
  const telHref = form.phone_primary.trim()
    ? `tel:${form.phone_primary.replace(/[^\d+]/g, '')}`
    : undefined
  const waDigits = form.whatsapp.replace(/\D/g, '')
  const waHref = waDigits ? `https://wa.me/${waDigits}` : undefined
  const emailPrimary = form.email_primary.trim()
  const emailAdmission = form.email_admission.trim()

  return (
    <div className="grid gap-2.5">
      <PreviewRow icon={MapPin} label="Alamat" value={form.address} />
      <PreviewRow icon={Phone} label="Telepon" value={form.phone_primary} href={telHref} />
      <PreviewRow icon={MessageCircle} label="WhatsApp" value={form.whatsapp} href={waHref} external />
      <PreviewRow icon={Mail} label="Email" value={form.email_primary} href={emailPrimary ? `mailto:${emailPrimary}` : undefined} />
      <PreviewRow
        icon={Mail}
        label="Email PPDB"
        value={form.email_admission}
        href={emailAdmission ? `mailto:${emailAdmission}` : undefined}
      />
      <PreviewRow icon={Clock} label="Jam Kantor" value={form.office_hours} />
    </div>
  )
}

function MapPreview({ embed }: { embed: MapsEmbedResolved }) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(embed.status === 'valid' ? embed.src : null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (embed.status === 'valid' && embed.src) {
      setPreviewSrc(embed.src)
      setLoadFailed(false)
    }
  }, [embed.status, embed.src])

  return (
    <div className="grid gap-2.5">
      {embed.status === 'valid' && previewSrc && !loadFailed ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <iframe
            src={previewSrc}
            title="Pratinjau peta lokasi"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            onError={() => setLoadFailed(true)}
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : loadFailed && previewSrc ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-red-50/80 p-4">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs leading-relaxed text-red-600">
            Pratinjau peta gagal dimuat. Periksa koneksi, atau pastikan kode embed masih berlaku.
          </p>
        </div>
      ) : embed.status === 'empty' ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/40 p-5 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--text-muted)]">
            <MapIcon className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">Lokasi belum dikonfigurasi</p>
          <p className="max-w-[16rem] text-xs leading-relaxed text-[var(--text-muted)]">
            Tempel URL atau kode embed Google Maps pada bagian
            <span className="font-semibold"> Google Maps Embed</span> untuk menampilkan peta di website.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-red-50/80 p-4">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-xs leading-relaxed text-red-600">
            {embed.message ?? 'Kode embed tidak valid dan tidak dirender.'}
          </p>
        </div>
      )}
      {embed.status === 'valid' && previewSrc && !loadFailed && (
        <p className="truncate font-mono text-[10px] text-[var(--text-muted)]" title={previewSrc}>
          {previewSrc}
        </p>
      )}
    </div>
  )
}

// ── MAIN EDITOR ─────────────────────────────────────────────────────────────

export function ContactEditor({ contactInfo, canCrud, onSave }: Props) {
  const [initial, setInitial] = useState<ContactFormState>(() => snapshotOf(contactInfo))
  const [form, setForm] = useState<ContactFormState>(() => snapshotOf(contactInfo))
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [errorText, setErrorText] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null)
  const [saveSource, setSaveSource] = useState<'auto' | 'manual' | null>(null)

  const saving = status === 'saving'
  const isDirty = isFormDirty(form, initial)
  const hasPendingChanges = isDirty || status === 'saving'

  // Refs untuk debounce auto-save
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef<ContactFormState | null>(null)

  // ── Sinkron server → form (SSE / refetch) ────────────────────────────────
  const [prevContact, setPrevContact] = useState(contactInfo)
  if (contactInfo !== prevContact) {
    setPrevContact(contactInfo)
    const next = snapshotOf(contactInfo)
    setInitial(next)
    if (!isFormDirty(form, next)) setForm(next)
  }

  // ── Update field + trigger auto-save ────────────────────────────────────
  function update(key: ContactFieldKey, value: string) {
    if (!canCrud || saving) return
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
    scheduleAutoSave()
  }

  // ── Debounced auto-save ──────────────────────────────────────────────────
  function scheduleAutoSave() {
    if (!canCrud) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      executeSave('auto')
    }, AUTO_SAVE_DELAY)
  }

  // ── Core save logic (shared auto + manual) ──────────────────────────────
  async function executeSave(source: 'auto' | 'manual') {
    if (!canCrud || status === 'saving') return

    const currentForm = form // capture current state
    const errors = validateForm(currentForm)
    if (Object.keys(errors).length > 0) {
      // Auto-save: jangan ganggu user dengan toast/error field, hanya log
      if (source === 'auto') {
        console.debug('[ContactEditor] Auto-save skipped: validation errors', errors)
        return
      }
      // Manual save: tampilkan error
      setFieldErrors(errors)
      toast('error', 'Periksa lagi kolom yang ditandai merah.')
      const first = Object.keys(errors)[0]
      ;(document.getElementById(`${FIELD_ID_PREFIX}${first}`) as HTMLElement | null)?.focus()
      return
    }

    setFieldErrors({})
    setErrorText('')
    setStatus('saving')
    setSaveSource(source)

    try {
      await api.updateContactInfo({ ...currentForm })
      setInitial({ ...currentForm })
      setStatus('saved')
      const now = new Date()
      setSavedAt(now)
      if (source === 'auto') setLastAutoSavedAt(now)
      toast('success', source === 'auto' ? 'Tersimpan otomatis' : 'Info kontak berhasil disimpan')
      onSave()
    } catch (e) {
      const message = errorMessage(e, 'Gagal menyimpan perubahan')
      setStatus('error')
      setErrorText(message)
      // Auto-save error: jangan toast biar gak ganggu, manual save: toast
      if (source === 'manual') toast('error', message)
    }
  }

  // ── Manual Save Handler ─────────────────────────────────────────────────
  async function handleManualSave() {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    await executeSave('manual')
  }

  // ── Cleanup timers ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  // ── BeforeUnload Guard (hanya kalau ada perubahan blm ke server) ────────
  useEffect(() => {
    if (!hasPendingChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Perubahan belum tersimpan ke server. Yakin ingin keluar?'
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasPendingChanges])

  // ── Status Pill Label ────────────────────────────────────────────────────
  const savedLabel = savedAt
    ? savedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null
  const autoSavedLabel = lastAutoSavedAt
    ? lastAutoSavedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : null

  const pill = saving
    ? { icon: Loader2, spin: true, label: 'Menyimpan…', className: 'bg-sky-50 text-sky-700 border-sky-200' }
    : status === 'error'
      ? { icon: AlertTriangle, spin: false, label: 'Gagal menyimpan', className: 'bg-red-50 text-red-600 border-red-200' }
      : status === 'saved'
        ? (saveSource === 'auto'
            ? { icon: Check, spin: false, label: `Tersimpan otomatis · ${autoSavedLabel}`, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
            : { icon: Check, spin: false, label: `Tersimpan${savedLabel ? ` · ${savedLabel}` : ''}`, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' })
        : isDirty
          ? { icon: null, spin: false, label: 'Perubahan belum disimpan', className: 'bg-[var(--accent-gold)]/15 text-[#9A7429] border-[var(--accent-gold)]/30' }
          : { icon: Check, spin: false, label: 'Tersimpan', className: 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/20' }

  const mapsEmbed = resolveMapsEmbed(form.maps_embed)

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5">
      {/* ── Status Bar (sticky top via parent scroll) ────────────────────── */}
      <div className="sticky top-0 z-10 rounded-2xl border border-[var(--border)]/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span
              role="status"
              aria-live="polite"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap',
                pill.className,
              )}
            >
              {pill.icon ? (
                <pill.icon className={cn('h-3.5 w-3.5', pill.spin && 'animate-spin')} />
              ) : (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              )}
              {pill.label}
            </span>
            {!canCrud && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                Mode lihat saja — izin ubah tidak tersedia
              </span>
            )}
            {status === 'error' && errorText && (
              <p className="min-w-0 basis-full text-xs font-medium break-words text-red-600 sm:basis-auto">
                {errorText}
              </p>
            )}
          </div>
          {canCrud && (
            <Button
              onClick={() => void handleManualSave()}
              loading={saving}
              disabled={!isDirty && status !== 'error'}
              className="gap-1.5 rounded-xl shrink-0"
            >
              <Save aria-hidden="true" className="h-4 w-4" />
              {saving ? 'Menyimpan…' : 'Simpan Sekarang'}
            </Button>
          )}
        </div>
      </div>

      {/* ── Layout dua kolom: form kiri, pratinjau kanan ─────────────────── */}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Kolom utama — form per section */}
        <div className="grid min-w-0 items-start gap-5">
          {/* Section A — Kontak Utama */}
          <ContactSection
            icon={Phone}
            title="Kontak Utama"
            description="Nomor telepon dan email umum untuk komunikasi dengan pengunjung website."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {CONTACT_FIELDS.filter((f) => f.key === 'phone_primary').map((def) => (
                <ContactField
                  key={def.key}
                  def={def}
                  value={form.phone_primary}
                  hasError={'phone_primary' in fieldErrors}
                  errorText={fieldErrors.phone_primary}
                  disabled={!canCrud || saving}
                  onChange={(v) => update('phone_primary', v)}
                />
              ))}
              {CONTACT_FIELDS.filter((f) => f.key === 'phone_secondary').map((def) => (
                <ContactField
                  key={def.key}
                  def={def}
                  value={form.phone_secondary}
                  hasError={'phone_secondary' in fieldErrors}
                  errorText={fieldErrors.phone_secondary}
                  disabled={!canCrud || saving}
                  onChange={(v) => update('phone_secondary', v)}
                />
              ))}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {CONTACT_FIELDS.filter((f) => f.key === 'whatsapp' || f.key === 'email_primary').map((def) => (
                <ContactField
                  key={def.key}
                  def={def}
                  value={form[def.key]}
                  hasError={def.key in fieldErrors}
                  errorText={fieldErrors[def.key]}
                  disabled={!canCrud || saving}
                  onChange={(v) => update(def.key, v)}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
              WhatsApp dibedakan dari telepon kantor: nomor ini dipakai untuk tautan chat
              tombol bantuan di website.
            </p>
          </ContactSection>

          {/* Section B — Kontak Penerimaan / PPDB */}
          <ContactSection
            icon={GraduationCap}
            title="Kontak Penerimaan (PPDB)"
            description="Email ini dipakai untuk pertanyaan atau komunikasi terkait penerimaan peserta didik baru — dipisah dari email umum."
          >
            {CONTACT_FIELDS.filter((f) => f.key === 'email_admission').map((def) => (
              <ContactField
                key={def.key}
                def={def}
                value={form.email_admission}
                hasError={'email_admission' in fieldErrors}
                errorText={fieldErrors.email_admission}
                disabled={!canCrud || saving}
                onChange={(v) => update('email_admission', v)}
              />
            ))}
            {!form.email_admission.trim() && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 px-4 py-3 text-xs leading-relaxed text-[#9A7429]">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Belum ada email penerimaan — isian ini dikosongkan di halaman publik, bukan
                ditampilkan sebagai email resmi.
              </p>
            )}
          </ContactSection>

          {/* Section C — Alamat Lengkap */}
          <ContactSection
            icon={MapPin}
            title="Alamat Lengkap"
            description="Alamat fisik pesantren yang tampil pada halaman Hubungi Kami dan dipakai sebagai cadangan peta."
          >
            {CONTACT_FIELDS.filter((f) => f.key === 'address').map((def) => (
              <ContactField
                key={def.key}
                def={def}
                value={form.address}
                hasError={'address' in fieldErrors}
                errorText={fieldErrors.address}
                disabled={!canCrud || saving}
                onChange={(v) => update('address', v)}
              />
            ))}
          </ContactSection>

          {/* Section D — Jam Operasional Kantor */}
          <ContactSection
            icon={Clock}
            title="Jam Operasional Kantor"
            description="Teks bebas sesuai kebiasaan kantor — tersimpan apa adanya tanpa penyesuaian format."
          >
            {CONTACT_FIELDS.filter((f) => f.key === 'office_hours').map((def) => (
              <ContactField
                key={def.key}
                def={def}
                value={form.office_hours}
                hasError={'office_hours' in fieldErrors}
                errorText={fieldErrors.office_hours}
                disabled={!canCrud || saving}
                onChange={(v) => update('office_hours', v)}
              />
            ))}
          </ContactSection>

          {/* Section E — Google Maps Embed */}
          <ContactSection
            icon={Globe}
            title="Google Maps Embed"
            description="Kode untuk menampilkan lokasi pesantren pada website. Hanya embed Google Maps yang dirender."
          >
            {CONTACT_FIELDS.filter((f) => f.key === 'maps_embed').map((def) => (
              <ContactField
                key={def.key}
                def={def}
                value={form.maps_embed}
                hasError={'maps_embed' in fieldErrors}
                errorText={fieldErrors.maps_embed}
                disabled={!canCrud || saving}
                onChange={(v) => update('maps_embed', v)}
              />
            ))}
            {mapsEmbed.status === 'valid' && (
              <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                Embed valid — peta muncul di pratinjau dan halaman publik.
              </p>
            )}
            {mapsEmbed.status === 'empty' && (
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
                Embed belum diisi — halaman publik menampilkan peta pencarian alamat sebagai cadangan.
              </p>
            )}
          </ContactSection>
        </div>

        {/* Kolom pendamping — pratinjau halaman publik */}
        <aside className="grid min-w-0 items-start gap-5" aria-label="Pratinjau halaman publik">
          <Card className="overflow-hidden border-[var(--border)]/70 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 font-heading text-sm font-bold text-[var(--text)]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </span>
                  Pratinjau Publik
                </CardTitle>
                <a
                  href="/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  aria-label="Buka halaman Hubungi Kami di tab baru"
                >
                  Buka /contact ↗
                </a>
              </div>
              <CardDescription className="text-xs leading-relaxed">
                Bagaimana informasi ini tampil pada halaman
                <span className="font-semibold"> Hubungi Kami</span>. Mengikuti nilai form saat
                ini, bukan data tersimpan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <ContactRowsPreview form={form} />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-[var(--border)]/70 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-heading text-sm font-bold text-[var(--text)]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)]">
                  <MapIcon aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
                Pratinjau Peta
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Rasio 16:9 seperti tampilan website. Kode dibatasi hanya untuk embed Google Maps.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapPreview embed={mapsEmbed} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
