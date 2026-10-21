'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Upload, Link2, AlertTriangle } from 'lucide-react'
import { getMe, updateProfile, uploadImage } from '@/app/lib/api'
import { isFormDirty, UNSAVED_CHANGES_CONFIRM } from '@/app/lib/form-dirty'
import { toast } from './ui/AdminToast'
import { confirm } from './ui/AdminConfirm'

const ALLOWED_AVATAR_DOMAINS = [
  'dkynlzmpwndadmbqokry.supabase.co',
  'supabase.co',
  'res.cloudinary.com',
  'images.unsplash.com',
]

function isValidAvatarUrl(url: string): boolean {
  if (!url) return true
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_AVATAR_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

interface Props {
  open: boolean
  onClose: () => void
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/Dialog'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'

export default function ProfileModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isSuper, setIsSuper] = useState(false)
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [form, setForm] = useState({ username: '', email: '', full_name: '', avatar_url: '', old_password: '', new_password: '', confirm_password: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Baseline form diisi bersamaan dengan form itu sendiri setelah profil
  // selesai dimuat. Tanpa ini, isDirty akan langsung true begitu `getMe()`
  // mengisi form — padahal admin belum menyentuh apa pun. State (bukan ref)
  // karena nilainya dibaca saat render.
  const [baseline, setBaseline] = useState<typeof form | null>(null)
  const isDirty = baseline !== null && isFormDirty(form, baseline)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getMe()
      .then(u => {
        if (cancelled) return
        // Form dibangun dari nol (bukan disisipkan ke state sebelumnya) agar
        // effect ini tidak bergantung pada `form` — isinya memang selalu
        // data profil terbaru + password kosong.
        const next = {
          username: u.username ?? '',
          email: u.email ?? '',
          full_name: u.full_name ?? '',
          avatar_url: u.avatar_url ?? '',
          old_password: '',
          new_password: '',
          confirm_password: '',
        }
        setForm(next)
        setBaseline(next)
        setIsSuper(u.user_type === 'superadmin')
      })
      .catch(() => { if (!cancelled) toast('error', 'Gagal memuat profil') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : 'Terjadi kesalahan'
  }

  function clearFieldError(name: string) {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm(p => ({ ...p, avatar_url: url }))
      // Avatar baru tersimpan ke server saat tombol Simpan ditekan.
      toast('success', 'Avatar diunggah — tekan Simpan untuk menyimpan')
    } catch (e) {
      toast('error', 'Upload gagal: ' + errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  /** Tutup modal, tapi konfirmasi dulu kalau ada isian yang belum disimpan. */
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
    const errors: Record<string, string> = {}
    if (!form.username.trim()) errors.username = 'Username wajib diisi'
    if (!form.full_name.trim()) errors.full_name = 'Nama lengkap wajib diisi'
    if (form.new_password && form.new_password !== form.confirm_password) {
      errors.confirm_password = 'Konfirmasi password tidak cocok'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstInvalid = Object.keys(errors)[0]
      document.getElementById(`profile-${firstInvalid}`)?.focus()
      toast('error', 'Periksa lagi kolom yang ditandai merah.')
      return
    }
    setFieldErrors({})
    setSaving(true)
    try {
      const data: Record<string, string> = {}
      if (form.username) data.username = form.username
      if (form.email) data.email = form.email
      if (form.full_name) data.full_name = form.full_name
      if (form.avatar_url) data.avatar_url = form.avatar_url
      if (form.old_password && form.new_password) {
        data.old_password = form.old_password
        data.new_password = form.new_password
      }
      await updateProfile(data)
      try {
        const me = await getMe()
        localStorage.setItem('admin_user', JSON.stringify(me))
      } catch {
        toast('error', 'Gagal memuat ulang profil')
      }
      toast('success', 'Profil berhasil disimpan')
      onClose()
    } catch (e) {
      toast('error', errorMessage(e))
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) void requestClose() }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile Admin</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat...</p>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden ring-2 ring-primary/20">
                  {form.avatar_url && isValidAvatarUrl(form.avatar_url) ? (
                    <Image src={form.avatar_url} alt="" width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-primary-foreground">{form.full_name?.charAt(0).toUpperCase() || form.email?.charAt(0).toUpperCase() || '?'}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant={imageMode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setImageMode('upload')}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
                </Button>
                <Button type="button" variant={imageMode === 'url' ? 'default' : 'outline'} size="sm" onClick={() => setImageMode('url')}>
                  <Link2 className="w-3.5 h-3.5 mr-1.5" /> URL
                </Button>
              </div>

              {imageMode === 'upload' ? (
                <div className="flex items-center gap-3">
                  <Label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-accent transition-all">
                    {uploading ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Mengunggah...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Pilih File</>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </Label>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input type="url" maxLength={2048} value={form.avatar_url} onChange={e => setForm(p => ({ ...p, avatar_url: e.target.value }))}
                    placeholder="https://example.com/avatar.jpg" />
                </div>
              )}

              {form.avatar_url && (
                <div className="flex items-start gap-4 p-3 rounded-xl border border-border bg-accent/30">
                  {isValidAvatarUrl(form.avatar_url) ? (
                    <Image src={form.avatar_url} alt="preview" width={80} height={56} className="w-20 h-14 object-cover rounded-lg border border-border shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="w-20 h-14 rounded-lg border border-red-200 bg-red-50 flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-red-500 font-medium">Invalid</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">URL Avatar</p>
                    <p className="text-xs text-muted-foreground break-all">{form.avatar_url}</p>
                  </div>
                  <button type="button" onClick={() => setForm(p => ({ ...p, avatar_url: '' }))}
                    className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all shrink-0" aria-label="Hapus URL avatar">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <hr className="border-border" />

              <div className="space-y-1.5">
                <Label htmlFor="profile-username">Username <span className="text-red-500">*</span></Label>
                <Input
                  id="profile-username"
                  type="text"
                  maxLength={100}
                  value={form.username}
                  error={fieldErrors.username}
                  onChange={e => { setForm(p => ({ ...p, username: e.target.value })); clearFieldError('username') }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-full_name">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input
                  id="profile-full_name"
                  type="text"
                  maxLength={255}
                  value={form.full_name}
                  error={fieldErrors.full_name}
                  onChange={e => { setForm(p => ({ ...p, full_name: e.target.value })); clearFieldError('full_name') }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-email">Email {!isSuper && <span className="font-normal text-muted-foreground">(hanya superadmin)</span>}</Label>
                <Input id="profile-email" type="email" maxLength={255} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} readOnly={!isSuper}
                  className={isSuper ? '' : 'text-muted-foreground bg-accent/50'} />
              </div>

              <hr className="border-border" />

              <p className="text-xs font-semibold text-muted-foreground">Ganti Password (opsional)</p>
              <div className="space-y-1.5">
                <Label htmlFor="profile-old_password">Password Lama</Label>
                <Input id="profile-old_password" type="password" maxLength={128} value={form.old_password} onChange={e => setForm(p => ({ ...p, old_password: e.target.value }))} autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-new_password">Password Baru</Label>
                <Input id="profile-new_password" type="password" maxLength={128} value={form.new_password} onChange={e => { setForm(p => ({ ...p, new_password: e.target.value })); clearFieldError('confirm_password') }} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile-confirm_password">Konfirmasi Password Baru</Label>
                <Input id="profile-confirm_password" type="password" maxLength={128} value={form.confirm_password} error={fieldErrors.confirm_password} onChange={e => { setForm(p => ({ ...p, confirm_password: e.target.value })); clearFieldError('confirm_password') }} autoComplete="new-password" />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <p className="mr-auto flex items-center gap-1.5 text-xs font-medium text-amber-600">
            {isDirty ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                Perubahan belum disimpan
              </>
            ) : null}
          </p>
          <Button variant="outline" onClick={() => void requestClose()}>Batal</Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
