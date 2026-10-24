'use client'

import { useState } from 'react'
import Image from 'next/image'
import * as api from '@/app/lib/api'
import { toast } from '@/app/components/ui/AdminToast'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { Textarea } from '@/app/components/ui/Textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/Card'
import { Globe, Link as LinkIcon, Mail, MessageCircle } from 'lucide-react'
import { cn } from '@/app/lib/utils'
import { ImageField } from './settings/ImageField'

interface Props {
  settings: api.SiteSetting[]
  canCrud: boolean
}

type SettingKey =
  | 'site_description'
  | 'logo'
  | 'favicon'
  | 'to_email'
  | 'whatsapp_message'

const MAX_DESC = 160

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  )
}

function ImagePreview({
  src,
  alt,
  variant = 'logo',
}: {
  src?: string
  alt: string
  variant?: 'logo' | 'favicon'
}) {
  if (!src) return null

  if (variant === 'favicon') {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/60">
            <Image
              src={src}
              alt={`${alt} 16x16`}
              width={16}
              height={16}
              className="h-4 w-4 object-contain"
              unoptimized
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">16 × 16</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/60">
            <Image
              src={src}
              alt={`${alt} 32x32`}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              unoptimized
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">32 × 32</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/60">
            <Image
              src={src}
              alt={`${alt} tab preview`}
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              unoptimized
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">Pratinjau tab browser</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[radial-gradient(circle_at_top,_rgba(26,107,71,0.08),_transparent_70%)] bg-white">
      <Image
        src={src}
        alt={alt}
        width={288}
        height={144}
        className="h-full w-full object-contain p-4"
        unoptimized
      />
    </div>
  )
}

export function SettingsEditor({ settings, canCrud }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const s of settings) {
      init[s.key] = s.value ?? ''
    }
    return init
  })
  const [saving, setSaving] = useState<SettingKey | null>(null)
  const [uploading, setUploading] = useState<SettingKey | null>(null)
  const [dirty, setDirty] = useState<Set<SettingKey>>(new Set())

  const [prevSettings, setPrevSettings] = useState(settings)
  if (settings !== prevSettings) {
    setPrevSettings(settings)
    setValues((prev) => {
      const next = { ...prev }
      for (const s of settings) next[s.key] = s.value ?? ''
      setDirty(new Set())
      return next
    })
  }

  function markDirty(key: SettingKey, value: string) {
    setValues((p) => ({ ...p, [key]: value }))
    setDirty((d) => {
      const next = new Set(d)
      const serverVal = settings.find((s) => s.key === key)?.value ?? ''
      if (value === serverVal) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  async function handleSave(key: SettingKey) {
    if (!canCrud || saving) return
    const value = values[key] ?? ''

    if (key === 'logo' || key === 'favicon') {
      if (value && value.startsWith(api.API_BASE)) {
        toast('error', `URL ${key === 'favicon' ? 'favicon' : 'logo'} tidak valid — gunakan URL gambar langsung.`)
        return
      }
      if (value && !/^https?:\/\//i.test(value)) {
        toast('error', `URL ${key === 'favicon' ? 'favicon' : 'logo'} harus URL absolut (http/https)`)
        return
      }
    }

    if (key === 'to_email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        toast('error', 'Format email tujuan tidak valid')
        return
      }
    }

    setSaving(key)
    try {
      await api.updateSetting(key, value)
      toast('success', 'Pengaturan berhasil disimpan')
      setDirty((d) => {
        const next = new Set(d)
        next.delete(key)
        return next
      })
    } catch (e: unknown) {
      toast('error', e instanceof Error ? e.message : 'Gagal menyimpan pengaturan')
    } finally {
      setSaving(null)
    }
  }

  const siteDesc = values.site_description ?? ''
  const descLen = siteDesc.length

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
          Pengaturan Website
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Kelola identitas website, metadata SEO, dan konfigurasi komunikasi.
        </p>
      </header>

      {/* Identitas Website */}
      <Card className="overflow-hidden border-[var(--border)] bg-white/80 shadow-[0_20px_60px_-40px_rgba(26,107,71,0.4)] backdrop-blur-sm">
        <CardHeader className="gap-4 border-b border-[var(--border)]/70 pb-6">
          <SectionHeader
            icon={Globe}
            title="Identitas Website"
            description="Atur logo dan favicon yang digunakan di navbar, footer, dan tab browser."
          />
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Logo */}
          <div className="space-y-4 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-8">
            <div className="space-y-4 lg:pr-4">
              <ImageField
                id="setting-logo"
                label="Logo"
                value={values.logo ?? ''}
                onChange={(val: string) => markDirty('logo', val)}
                onUploadingChange={(up: boolean) => setUploading(up ? 'logo' : null)}
                onDirtyChange={(d: boolean) => setDirty((prev) => { const next = new Set(prev); d ? next.add('logo') : next.delete('logo'); return next })}
                disabled={!canCrud || saving === 'logo'}
                previewAlt="Logo website"
                maxBytes={2 * 1024 * 1024}
              />
              <div className="flex flex-wrap items-center gap-2">
                {dirty.has('logo') && canCrud && (
                  <Button
                    size="sm"
                    onClick={() => handleSave('logo')}
                    disabled={saving === 'logo' || uploading === 'logo'}
                    loading={saving === 'logo'}
                  >
                    Simpan Perubahan
                  </Button>
                )}
              </div>
            </div>
            <div className="hidden lg:block">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Pratinjau Konteks
              </p>
              <ImagePreview src={values.logo} alt="Logo website" variant="logo" />
            </div>
          </div>

          <div className="border-t border-[var(--border)]/70 pt-6" />

          {/* Favicon */}
          <div className="space-y-4 lg:grid lg:grid-cols-[1fr_1fr] lg:gap-8">
            <div className="space-y-4 lg:pr-4">
              <ImageField
                id="setting-favicon"
                label="Favicon"
                value={values.favicon ?? ''}
                onChange={(val: string) => markDirty('favicon', val)}
                onUploadingChange={(up: boolean) => setUploading(up ? 'favicon' : null)}
                onDirtyChange={(d: boolean) => setDirty((prev) => { const next = new Set(prev); d ? next.add('favicon') : next.delete('favicon'); return next })}
                disabled={!canCrud || saving === 'favicon'}
                previewAlt="Favicon website"
                maxBytes={2 * 1024 * 1024}
              />
              <div className="flex flex-wrap items-center gap-2">
                {dirty.has('favicon') && canCrud && (
                  <Button
                    size="sm"
                    onClick={() => handleSave('favicon')}
                    disabled={saving === 'favicon' || uploading === 'favicon'}
                    loading={saving === 'favicon'}
                  >
                    Simpan Perubahan
                  </Button>
                )}
              </div>
            </div>
            <div className="hidden lg:block">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Pratinjau Ukuran
              </p>
              <ImagePreview src={values.favicon} alt="Favicon website" variant="favicon" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO */}
      <Card className="overflow-hidden border-[var(--border)] bg-white/80 shadow-[0_20px_60px_-40px_rgba(26,107,71,0.4)] backdrop-blur-sm">
        <CardHeader className="gap-4 border-b border-[var(--border)]/70 pb-6">
          <SectionHeader
            icon={LinkIcon}
            title="SEO"
            description="Optimasi metadata untuk hasil pencarian."
          />
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <Textarea
            label="Deskripsi Situs"
            value={siteDesc}
            onChange={(e) => markDirty('site_description', e.target.value)}
            disabled={!canCrud || saving === 'site_description'}
            rows={4}
            placeholder="Tulis deskripsi singkat tentang pesantren..."
            helperText="Digunakan sebagai meta description SEO."
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={cn('text-xs', descLen > MAX_DESC ? 'text-amber-600' : 'text-[var(--text-muted)]')}>
              {descLen} karakter {descLen > MAX_DESC && '(disarankan maksimal ~160 karakter)'}
            </p>
            {canCrud && dirty.has('site_description') && (
              <Button
                size="sm"
                onClick={() => handleSave('site_description')}
                disabled={saving === 'site_description'}
                loading={saving === 'site_description'}
              >
                Simpan Perubahan
              </Button>
            )}
          </div>
          {siteDesc && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Pratinjau Snippet Google
              </p>
              <div className="space-y-1">
                <p className="text-sm text-[#1a0dab]">Pesantren Tahfidz Qur&apos;an dan Digital Ar-Rahman</p>
                <p className="text-xs text-[#006621]">https://ptdarrahman.sch.id</p>
                <p className="text-sm text-[#545454] line-clamp-2">{siteDesc}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Komunikasi */}
      <Card className="overflow-hidden border-[var(--border)] bg-white/80 shadow-[0_20px_60px_-40px_rgba(26,107,71,0.4)] backdrop-blur-sm">
        <CardHeader className="gap-4 border-b border-[var(--border)]/70 pb-6">
          <SectionHeader
            icon={MessageCircle}
            title="Komunikasi"
            description="Atur alamat email dan pesan default untuk form kontak dan tombol chat."
          />
        </CardHeader>
        <CardContent className="grid gap-6 p-6 lg:grid-cols-2">
          {/* Email Tujuan */}
          <div className="space-y-4">
            <Input
              label="Email Tujuan"
              type="email"
              value={values.to_email ?? ''}
              onChange={(e) => markDirty('to_email', e.target.value)}
              disabled={!canCrud || saving === 'to_email'}
              placeholder="kontak@ptdarrahman.sch.id"
            />
            {canCrud && dirty.has('to_email') && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleSave('to_email')}
                  disabled={saving === 'to_email'}
                  loading={saving === 'to_email'}
                >
                  Simpan Perubahan
                </Button>
              </div>
            )}
          </div>

          {/* Pesan WhatsApp */}
          <div className="space-y-4 lg:col-span-2">
            <Textarea
              label="Pesan WhatsApp"
              value={values.whatsapp_message ?? ''}
              onChange={(e) => markDirty('whatsapp_message', e.target.value)}
              disabled={!canCrud || saving === 'whatsapp_message'}
              rows={4}
              placeholder="Assalamu'alaikum, saya ingin mengetahui informasi lebih lanjut..."
            />
            {canCrud && dirty.has('whatsapp_message') && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => handleSave('whatsapp_message')}
                  disabled={saving === 'whatsapp_message'}
                  loading={saving === 'whatsapp_message'}
                >
                  Simpan Perubahan
                </Button>
              </div>
            )}
            {values.whatsapp_message && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Pratinjau Pesan
                </p>
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{values.whatsapp_message}</p>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Line break dipertahankan sesuai nilai yang disimpan.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!canCrud && (
        <p className="text-center text-sm text-[var(--text-muted)]">
          Anda hanya memiliki akses baca. Hubungi superadmin untuk mengubah pengaturan.
        </p>
      )}
    </div>
  )
}
