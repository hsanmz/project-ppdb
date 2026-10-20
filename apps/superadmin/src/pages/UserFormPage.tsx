import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, Trash2, UserRound, ShieldCheck, CheckCircle2 } from 'lucide-react'
import PageHero from '../components/PageHero'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from "../components/ui/confirmdialog"
import type { Role, Module } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Button } from "@/components/ui"
import { Input } from "@/components/ui"
import { Label } from "@/components/ui"
import { Card, CardContent } from "@/components/ui"
import { Switch } from "@/components/ui"
import { Checkbox, Badge } from "@/components/ui"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui"
import { cn } from '@/lib/utils'
import { generateSecurePassword } from '../lib/password'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import * as z from 'zod'

const userFormSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  full_name: z.string().optional().or(z.literal('')),
  password: z.string().optional(),
  role_id: z.string().optional(),
  user_type: z.string().default('admin'),
  is_active: z.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.user_type !== 'superadmin' && !data.role_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['role_id'],
      message: 'Role wajib diisi',
    })
  }
})

type UserFormValues = z.input<typeof userFormSchema>

export default function UserFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { user: currentUser, loading: authLoading } = useAuth()
  const canCrud = currentUser?.user_type === 'superadmin' || !!currentUser?.is_superadmin
  const queryClient = useQueryClient()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{ title: string; message: string; variant?: 'danger' | 'primary'; confirmLabel?: string; onConfirm: () => void } | null>(null)

  useEffect(() => {
    if (!authLoading && currentUser && !canCrud) {
      navigate('/users')
    }
  }, [currentUser, authLoading, canCrud, navigate])

  const [roles, setRoles] = useState<Role[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [pageConfig, setPageConfig] = useState<Record<string, { enabled: boolean; can_crud: boolean }>>({})
  const [hasExistingSavedPermissions, setHasExistingSavedPermissions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [fetching, setFetching] = useState(isEdit)

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue, control } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: '',
      email: '',
      phone: '',
      full_name: '',
      password: '',
      role_id: '',
      user_type: 'admin',
      is_active: true,
    }
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const formUserType = watch('user_type')
  const formUsername = watch('username')
  const formIsActive = watch('is_active')
  const formRoleId = watch('role_id')

  useEffect(() => {
    let active = true
    async function fetchData() {
      try {
        const [rolesData, modulesData] = await Promise.all([
          api.getRoles(),
          api.getModules(),
        ])
        if (!active) return
        setRoles(rolesData)
        setModules(modulesData)

        if (isEdit && id) {
          const [user, perms] = await Promise.all([
            api.getUser(id),
            api.getUserPagePermissions(id),
          ])
          if (!active) return
          reset({
            username: user.username || '',
            email: user.email || '',
            phone: user.phone || '',
            full_name: user.full_name || '',
            password: '',
            role_id: user.role_id || '',
            user_type: user.user_type || 'admin',
            is_active: user.is_active ?? true,
          })
          if (perms.permissions && perms.permissions.length > 0) {
            setHasExistingSavedPermissions(true)
            const cfg: Record<string, { enabled: boolean; can_crud: boolean }> = {}
            for (const p of perms.permissions) {
              cfg[p.page_id] = { enabled: true, can_crud: p.can_crud }
            }
            setPageConfig(cfg)
          } else if (perms.page_ids && perms.page_ids.length > 0) {
            setHasExistingSavedPermissions(true)
            const cfg: Record<string, { enabled: boolean; can_crud: boolean }> = {}
            for (const pid of perms.page_ids) {
              cfg[pid] = { enabled: true, can_crud: true }
            }
            setPageConfig(cfg)
          }
        }
      } catch {
        if (active && isEdit) navigate('/users')
      } finally {
        if (active) setFetching(false)
      }
    }
    fetchData()
    return () => {
      active = false
    }
  }, [id, isEdit, navigate, reset])

  function generatePassword() {
    setValue('password', generateSecurePassword(8), { shouldValidate: true })
  }

  const onSubmit = (data: UserFormValues) => {
    if (!isEdit && !data.password) {
      toast('error', 'Klik Generate untuk membuat password terlebih dahulu')
      return
    }

    if (!isEdit) {
      // Create: selalu konfirmasi karena kredensial akan dikirim
      setConfirmData({
        title: 'Konfirmasi Buat User',
        message: `Sistem akan otomatis mengirimkan kredensial login ke:\n\n📱 WhatsApp: ${data.phone || 'Tidak diisi'}\n📧 Email: ${data.email || 'Tidak diisi'}\n\nUsername: ${data.username}\nPassword: [akan di-generate sistem]\n\nPastikan nomor WA dan email sudah benar sebelum melanjutkan.`,
        onConfirm: () => {
          setConfirmOpen(false)
          executeSubmit(data)
        },
      })
      setConfirmOpen(true)
    } else if (data.password) {
      // Edit dengan password baru
      setConfirmData({
        title: 'Konfirmasi Ganti Password',
        message: `Password baru akan dikirim ke:\n\n📱 WhatsApp: ${data.phone || 'Tidak diisi'}\n📧 Email: ${data.email || 'Tidak diisi'}\n\nYakin ingin mengganti password user ini?`,
        onConfirm: () => {
          setConfirmOpen(false)
          executeSubmit(data)
        },
      })
      setConfirmOpen(true)
    } else {
      executeSubmit(data)
    }
  }

  async function executeSubmit(data: UserFormValues) {
    setLoading(true)
    try {
      let targetUserId = id
      if (isEdit && id) {
        const payload: any = {
          username: data.username,
          email: data.email || undefined,
          phone: data.phone || undefined,
          full_name: data.full_name || undefined,
          role_id: data.role_id || undefined,
          user_type: data.user_type,
          is_active: data.is_active,
        }
        if (data.password) payload.password = data.password
        await api.updateUser(id, payload)
      } else {
        const newUser = await api.createUser({
          username: data.username,
          email: data.email || undefined,
          phone: data.phone || undefined,
          full_name: data.full_name || undefined,
          password: data.password!,
          role_id: data.role_id || undefined,
          user_type: data.user_type,
        })
        targetUserId = newUser?.id
      }

      if (targetUserId && data.user_type !== 'superadmin') {
        const permList: Array<{ page_id: string; can_crud: boolean }> = []
        for (const mod of visibleModules) {
          for (const page of mod.pages) {
            const isDashboard = page.key === 'dashboard' || page.key === 'admin-dashboard'
            const enabled = isDashboard || isPageEnabled(page.id, page.key)
            if (enabled) {
              const canCrud = isDashboard ? false : (page.has_crud !== false ? isPageCanCrud(page.id, page.key, page.has_crud) : false)
              permList.push({ page_id: page.id, can_crud: canCrud })
            }
          }
        }
        await api.updateUserPagePermissions(targetUserId, { permissions: permList })
      }

      toast('success', isEdit ? 'User berhasil diperbarui' : 'User berhasil dibuat')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      navigate('/users')
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan')
    } finally {
      setLoading(false)
    }
  }

  function handleDelete() {
    if (!id || deleting) return
    setConfirmData({
      title: 'Hapus User',
      message: `Yakin ingin menghapus user "${formUsername}"? Tindakan ini tidak dapat dibatalkan.`,
      variant: 'danger',
      confirmLabel: 'Ya, Hapus',
      onConfirm: async () => {
        setConfirmOpen(false)
        setDeleting(true)
        try {
          await api.deleteUser(id)
          toast('success', 'User berhasil dihapus')
          queryClient.invalidateQueries({ queryKey: ['users'] })
          navigate('/users')
        } catch (e: any) {
          toast('error', e.message || 'Gagal menghapus user')
        } finally {
          setDeleting(false)
        }
      },
    })
    setConfirmOpen(true)
  }

  const selectedRole = useMemo(() => {
    return roles.find(r => r.id === formRoleId)
  }, [roles, formRoleId])

  const allowedModuleKeys = useMemo(() => {
    if (!selectedRole || !selectedRole.permissions) return []
    return Object.entries(selectedRole.permissions)
      .filter(([_, level]) => level && level !== 'none')
      .map(([key]) => key)
  }, [selectedRole])

  const visibleModules = useMemo(() => {
    return modules.filter(m => allowedModuleKeys.includes(m.key))
  }, [modules, allowedModuleKeys])

  const isPageEnabled = (pageId: string, pageKey: string) => {
    if (pageKey === 'dashboard' || pageKey === 'admin-dashboard') return true
    if (pageConfig[pageId] !== undefined) {
      return pageConfig[pageId].enabled
    }
    if (hasExistingSavedPermissions) {
      return false
    }
    return true
  }

  const isPageCanCrud = (pageId: string, pageKey: string, hasCrud?: boolean) => {
    if (hasCrud === false || pageKey === 'dashboard' || pageKey === 'admin-dashboard') return false
    if (pageConfig[pageId] !== undefined) {
      return pageConfig[pageId].can_crud
    }
    return true
  }

  const togglePageAccess = (page: { id: string; key: string; has_crud?: boolean }) => {
    if (page.key === 'dashboard' || page.key === 'admin-dashboard') return
    const currentEnabled = isPageEnabled(page.id, page.key)
    const currentCrud = isPageCanCrud(page.id, page.key, page.has_crud)
    setPageConfig(prev => ({
      ...prev,
      [page.id]: {
        enabled: !currentEnabled,
        can_crud: currentCrud,
      },
    }))
  }

  const togglePageCrud = (page: { id: string; key: string; has_crud?: boolean }) => {
    if (page.has_crud === false || page.key === 'dashboard' || page.key === 'admin-dashboard') return
    const currentEnabled = isPageEnabled(page.id, page.key)
    const currentCrud = isPageCanCrud(page.id, page.key, page.has_crud)
    setPageConfig(prev => ({
      ...prev,
      [page.id]: {
        enabled: currentEnabled,
        can_crud: !currentCrud,
      },
    }))
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirmData?.onConfirm()}
        title={confirmData?.title || 'Konfirmasi'}
        message={confirmData?.message || ''}
        variant={confirmData?.variant}
        confirmLabel={confirmData?.confirmLabel || 'Sudah Benar, Simpan'}
      />
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeIn">
      <PageHero
        eyebrow="Manajemen Akses"
        title={isEdit ? 'Edit User' : 'Buat User Baru'}
        description={isEdit ? 'Ubah informasi user' : 'Tambah admin baru ke sistem'}
        loading={fetching}
        chips={[
          { icon: UserRound, label: formUsername || 'Username baru' },
          { icon: ShieldCheck, label: formUserType === 'superadmin' ? 'Superadmin' : `Tipe: ${formUserType}` },
          { icon: CheckCircle2, label: formIsActive ? 'Aktif' : 'Nonaktif' },
        ]}
        actions={
          <button
            onClick={() => navigate('/users')}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card>
          <CardContent className="space-y-5 p-6 md:p-8">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-semibold text-foreground">Username *</Label>
              <Input
                id="username"
                type="text"
                {...register('username')}
                placeholder="Masukkan username"
                disabled={formUserType === 'superadmin'}
              />
              {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@example.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              <p className="text-[11px] text-muted-foreground">
                Notifikasi kredensial akan dikirim ke alamat ini.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold text-foreground">Nomor WhatsApp</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
                placeholder="6281234567890"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              <p className="text-[11px] text-muted-foreground">
                Notifikasi kredensial akan dikirim ke nomor ini.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-semibold text-foreground">Full Name</Label>
              <Input
                id="full_name"
                type="text"
                {...register('full_name')}
                placeholder="Nama lengkap"
              />
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                Password {isEdit ? '(kosongkan jika tidak ingin mengubah)' : '*'}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type="text"
                  {...register('password')}
                  placeholder={isEdit ? '••••••••' : 'Klik Generate untuk membuat password'}
                  readOnly
                  className="select-none"
                  onKeyDown={(e) => e.preventDefault()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  title="Generate Password (dibuat otomatis oleh sistem)"
                >
                  <KeyRound className="h-4 w-4 mr-1" />
                  Generate
                </Button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                Password dibuat otomatis oleh sistem — tidak bisa diisi manual.
              </p>
              {!isEdit && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <span className="mt-0.5 text-base leading-none">📱</span>
                  <span>Setelah user dibuat, kredensial login (username & password) akan otomatis dikirim ke <strong>WhatsApp</strong> dan <strong>Email</strong> yang terdaftar.</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Role</Label>
              <Controller
                control={control}
                name="role_id"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={formUserType === 'superadmin'}
                  >
                    <SelectTrigger className={cn(!field.value && 'text-muted-foreground', errors.role_id && 'border-destructive')}>
                      <SelectValue placeholder="Pilih role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.filter(r => !r.is_superadmin && !r.is_system).map(r => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role_id && <p className="text-xs text-destructive">{errors.role_id.message}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Label htmlFor="status" className="text-xs font-semibold text-foreground">Status</Label>
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    id="status"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={formUserType === 'superadmin'}
                  />
                )}
              />
              <span className="text-xs text-muted-foreground">{watch('is_active') ? 'Active' : 'Inactive'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Page & CRUD Permissions Section */}
        {formUserType !== 'superadmin' && (
          <Card>
            <CardContent className="space-y-4 p-6 md:p-8">
              <div className="flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Hak Akses Halaman & Izin CRUD Per Halaman
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Pilih halaman yang diizinkan untuk dibuka oleh user ini, dan tentukan apakah user memiliki izin untuk melakukan aksi (CRUD: Tambah / Ubah / Hapus). Halaman dashboard selalu aktif sebagai akses utama.
              </p>

              <div className="space-y-6 pt-2">
                {!formRoleId ? (
                  <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-4 text-center text-xs text-amber-700">
                    Silakan pilih <strong>Role</strong> pada formulir di atas terlebih dahulu untuk menampilkan daftar halaman modul yang tersedia.
                  </div>
                ) : visibleModules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    Role yang dipilih belum memiliki modul login yang diaktifkan. Harap atur izin modul pada menu <strong>Role</strong> terlebih dahulu.
                  </div>
                ) : (
                  visibleModules.map((mod) => (
                    <div key={mod.id} className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span>{mod.name}</span>
                        </h4>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {mod.pages.length} Halaman Tersedia
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {mod.pages.map((page) => {
                          const isDashboard = page.key === 'dashboard' || page.key === 'admin-dashboard'
                          const isEnabled = isPageEnabled(page.id, page.key)
                          const canCrud = isPageCanCrud(page.id, page.key, page.has_crud)
                          const hasCrudSupport = page.has_crud !== false && !isDashboard

                          return (
                            <div
                              key={page.id}
                              className={cn(
                                "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                                isEnabled
                                  ? "border-primary/30 bg-card shadow-xs"
                                  : "border-border/60 bg-muted/40 opacity-70"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isEnabled}
                                  disabled={isDashboard}
                                  onCheckedChange={() => togglePageAccess(page)}
                                />
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                      {page.label}
                                    </span>
                                    {isDashboard && (
                                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                        Akses Utama (Selalu Aktif)
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    Rute: <code className="text-[10px] font-mono">/{page.key}</code>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pl-7 sm:pl-0">
                                {isDashboard ? (
                                  <span className="text-[11px] text-muted-foreground italic">
                                    Dashboard utama
                                  </span>
                                ) : hasCrudSupport ? (
                                  <div className="flex items-center gap-2">
                                    {isEnabled ? (
                                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5">
                                        <div className="flex flex-col text-right">
                                          <span className="text-[11px] font-semibold text-foreground">
                                            {canCrud ? 'Bisa CRUD (Aksi Aktif)' : 'Read-Only (Hanya Lihat)'}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            {canCrud ? 'Tombol aksi muncul' : 'Tombol aksi hilang'}
                                          </span>
                                        </div>
                                        <Switch
                                          checked={canCrud}
                                          onCheckedChange={() => togglePageCrud(page)}
                                          title="Izinkan user menambah, mengubah, atau menghapus data di halaman ini"
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground">
                                        Akses Belum Diaktifkan
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground">
                                    Monitoring / Read-Only
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          {isEdit && formUserType !== 'superadmin' && (
            <Button
              type="button"
              variant="outline"
              className="mr-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={loading || deleting}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Hapus User
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/users')}
          >
            Batal
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat User'}
          </Button>
        </div>
      </form>
    </div>
    </>
  )
}
