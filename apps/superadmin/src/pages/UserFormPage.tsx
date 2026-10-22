import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  KeyRound,
  Trash2,
  UserRound,
  ShieldCheck,
  Mail,
  Phone,
  AtSign,
  Calendar,
  Copy,
  Check,
  Lock,
  Shield,
  ChevronDown,
  Layers,
} from 'lucide-react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from '../components/ui/confirmdialog'
import type { Role, Module } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Switch } from '@/components/ui'
import { Checkbox, Badge } from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { generateSecurePassword } from '../lib/password'
import UserActivityPanel from '../components/users/UserActivityPanel'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import * as z from 'zod'

const userFormSchema = z
  .object({
    username: z.string().min(1, 'Username wajib diisi'),
    email: z.string().email('Email tidak valid').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    full_name: z.string().optional().or(z.literal('')),
    password: z.string().optional(),
    role_id: z.string().optional(),
    user_type: z.string().default('admin'),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.user_type !== 'superadmin' && !data.role_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role_id'],
        message: 'Role wajib diisi',
      })
    }
  })

type UserFormValues = z.input<typeof userFormSchema>

/** Nama field form yang boleh menerima error validasi dari backend (422). */
const EDITABLE_FIELDS = [
  'username',
  'email',
  'phone',
  'full_name',
  'password',
  'role_id',
  'user_type',
  'is_active',
] as const
type EditableField = (typeof EDITABLE_FIELDS)[number]

function formatRegistrationDate(val?: string) {
  if (!val) return '—'
  const v = val.includes(' ') && !val.includes('T') ? val.replace(' ', 'T') : val
  const d = new Date(v)
  if (isNaN(d.getTime())) return val
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function UserFormPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { user: currentUser, loading: authLoading } = useAuth()
  const canCrud = currentUser?.user_type === 'superadmin' || !!currentUser?.is_superadmin
  const queryClient = useQueryClient()

  // Sembunyikan bilah scrollbar khusus saat membuka halaman manajemen user ini
  useEffect(() => {
    document.documentElement.classList.add('no-scrollbar')
    document.body.classList.add('no-scrollbar')
    return () => {
      document.documentElement.classList.remove('no-scrollbar')
      document.body.classList.remove('no-scrollbar')
    }
  }, [])

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{
    title: string
    message: string
    variant?: 'danger' | 'primary'
    confirmLabel?: string
    onConfirm: () => void
  } | null>(null)

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
  const [rawUser, setRawUser] = useState<any>(null)
  const [copiedPwd, setCopiedPwd] = useState(false)

  // State dropdown accordion modul (hanya 1 modul terbuka sekaligus)
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control,
    setError,
  } = useForm<UserFormValues>({
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
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const formUserType = watch('user_type')
  const formUsername = watch('username')
  const formFullName = watch('full_name')
  const formIsActive = watch('is_active')
  const formRoleId = watch('role_id')
  const formPassword = watch('password')

  useEffect(() => {
    let active = true
    async function fetchData() {
      try {
        const [rolesData, modulesData] = await Promise.all([api.getRoles(), api.getModules()])
        if (!active) return
        setRoles(rolesData)
        setModules(modulesData)

        if (isEdit && id) {
          const [user, perms] = await Promise.all([
            api.getUser(id),
            api.getUserPagePermissions(id),
          ])
          if (!active) return
          setRawUser(user)
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
      } catch (e) {
        if (active) {
          toast('error', api.getErrorMessage(e, 'Gagal memuat data user.'))
        }
      } finally {
        if (active) setFetching(false)
      }
    }
    fetchData()
    return () => {
      active = false
    }
  }, [id, isEdit, reset, toast])

  function generatePassword() {
    setValue('password', generateSecurePassword(8), { shouldValidate: true })
  }

  function copyPassword() {
    if (!formPassword) return
    navigator.clipboard.writeText(formPassword)
    setCopiedPwd(true)
    setTimeout(() => setCopiedPwd(false), 2000)
  }

  const initials = useMemo(() => {
    const name = formFullName || formUsername || 'U'
    return name.slice(0, 2).toUpperCase()
  }, [formFullName, formUsername])

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === formRoleId)
  }, [roles, formRoleId])

  const allowedModuleKeys = useMemo(() => {
    if (!selectedRole || !selectedRole.permissions) return []
    return Object.entries(selectedRole.permissions)
      .filter(([, level]) => level && level !== 'none')
      .map(([key]) => key)
  }, [selectedRole])

  const visibleModules = useMemo(() => {
    return modules.filter((m) => allowedModuleKeys.includes(m.key))
  }, [modules, allowedModuleKeys])

  // Buka otomatis modul pertama saat daftar modul tersedia
  useEffect(() => {
    if (visibleModules.length > 0) {
      setOpenModuleId((prev) => {
        if (prev && visibleModules.some((m) => m.id === prev)) return prev
        return visibleModules[0].id
      })
    } else {
      setOpenModuleId(null)
    }
  }, [visibleModules])

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
    setPageConfig((prev) => ({
      ...prev,
      [page.id]: {
        enabled: !currentEnabled,
        can_crud: currentCrud,
      },
    }))
  }

  const togglePageCrud = (page: { id: string; key: string; has_crud?: boolean }) => {
    if (page.has_crud === false || page.key === 'dashboard' || page.key === 'admin-dashboard')
      return
    const currentEnabled = isPageEnabled(page.id, page.key)
    const currentCrud = isPageCanCrud(page.id, page.key, page.has_crud)
    setPageConfig((prev) => ({
      ...prev,
      [page.id]: {
        enabled: currentEnabled,
        can_crud: !currentCrud,
      },
    }))
  }

  const onSubmit = (data: UserFormValues) => {
    if (!isEdit && !data.password) {
      toast('error', 'Klik Generate untuk membuat password terlebih dahulu')
      return
    }

    if (!isEdit) {
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
              const canCrud = isDashboard
                ? false
                : page.has_crud !== false
                  ? isPageCanCrud(page.id, page.key, page.has_crud)
                  : false
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
      if (api.isApiError(e) && e.status === 422 && e.fields) {
        let matched = false
        for (const [field, message] of Object.entries(e.fields)) {
          if ((EDITABLE_FIELDS as readonly string[]).includes(field)) {
            setError(field as EditableField, { type: 'server', message })
            matched = true
          }
        }
        if (matched) {
          toast('error', 'Periksa kembali kolom yang ditandai merah')
          return
        }
      }
      toast('error', api.getErrorMessage(e, 'Gagal menyimpan'))
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
          toast('error', api.getErrorMessage(e, 'Gagal menghapus user'))
        } finally {
          setDeleting(false)
        }
      },
    })
    setConfirmOpen(true)
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

      {/*
        LAYOUT UTAMA SEPERTI PROFILE:
        - Membentang edge-to-edge (-m-3.5 sm:-m-4 md:-m-6 lg:-m-8)
        - Tinggi pas setinggi viewport: h-[calc(100dvh-3.5rem)]
        - HALAMAN TIDAK AKAN PERNAH SCROLL (overflow-hidden)!
        - Scrollbar disembunyikan visualnya secara terpadu (no-scrollbar).
      */}
      <div className="-m-3.5 sm:-m-4 md:-m-6 lg:-m-8 h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden no-scrollbar">
        <form onSubmit={handleSubmit(onSubmit)} className="h-full flex flex-col overflow-hidden">
          {/*
            ── HEADER ATAS: HORIZONTAL RINGKAS, PROPORSIONAL & PROFESIONAL ──
            1. Profile identity di kiri (Back + Avatar + Nama + Username/Role/Status)
            2. Account metadata di tengah (Email, WhatsApp, Terdaftar: Ikon + Label Sekunder + Nilai)
            3. Action group di kanan (Hapus [destructive] + Simpan Perubahan [primary emerald])
            Responsif:
            - Desktop (>= 1024px / 1440px): 1 baris horizontal rapi.
            - Tablet (768px): metadata berpindah baris jika ruang terbatas.
            - Mobile (< 768px, 360px & 390px): tersusun vertikal teratur tanpa horizontal overflow.
          */}
          <div className="shrink-0 border-b border-border bg-card px-3.5 sm:px-5 md:px-6 py-2.5 sm:py-3 transition-all">
            <div className="flex flex-col md:flex-wrap lg:flex-nowrap lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
              {/* ── 1. PROFILE IDENTITY (KIRI) ── */}
              <div className="flex items-center gap-3 min-w-0 shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => navigate('/users')}
                  aria-label="Kembali ke daftar user"
                  className="h-9 w-9 rounded-xl shrink-0 border-border hover:bg-muted/50 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </Button>

                {/* Avatar ringkas & proporsional */}
                {rawUser?.avatar_url ? (
                  <img
                    src={rawUser.avatar_url}
                    alt={formFullName || formUsername}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl object-cover border border-border shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center text-white font-heading font-bold text-sm sm:text-base shadow-2xs border border-white/20 shrink-0">
                    {initials}
                  </div>
                )}

                <div className="min-w-0 space-y-0.5">
                  <h1 className="font-heading font-bold text-sm sm:text-base text-foreground tracking-tight truncate leading-tight">
                    {isEdit ? formFullName || formUsername || 'Pengguna' : 'Buat User Baru'}
                  </h1>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs text-muted-foreground">
                    <span className="font-mono text-[11px] sm:text-xs font-medium text-foreground/80">
                      @{formUsername || 'username'}
                    </span>
                    <span className="text-muted-foreground/60">•</span>
                    <Badge
                      variant={formUserType === 'superadmin' ? 'default' : 'secondary'}
                      className="text-[10px] px-2 py-0 font-medium h-4.5"
                    >
                      {formUserType === 'superadmin'
                        ? 'Superadmin'
                        : selectedRole?.name || 'Belum Ada Role'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* ── 2. ACCOUNT METADATA (TENGAH) ── */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap md:flex-nowrap min-w-0">
                {/* WhatsApp Metadata */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-muted/30 border border-border/60 min-w-0 flex-1 sm:flex-initial">
                  <div className="p-1 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <span className="block text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                      WhatsApp
                    </span>
                    <span className="block text-xs font-medium font-mono text-foreground truncate max-w-[110px] sm:max-w-[130px]">
                      {watch('phone') || '—'}
                    </span>
                  </div>
                </div>

                {/* Terdaftar Sejak Metadata */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-muted/30 border border-border/60 min-w-0 flex-1 sm:flex-initial">
                  <div className="p-1 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <span className="block text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                      Terdaftar
                    </span>
                    <span className="block text-xs font-medium text-foreground truncate max-w-[110px] sm:max-w-[130px]">
                      {formatRegistrationDate(rawUser?.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 3. ACTION GROUP (KANAN) ── */}
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 justify-end">
                {isEdit && formUserType !== 'superadmin' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={loading || deleting}
                    className="h-9 px-3.5 text-xs font-medium rounded-xl border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5 transition-colors shadow-2xs"
                    title="Hapus user secara permanen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus</span>
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-9 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1.5 sm:gap-2 transition-all shrink-0"
                >
                  {loading ? (
                    'Menyimpan...'
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{isEdit ? 'Simpan' : 'Buat User'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/*
            ── STRUKTUR 3 KOLOM INDEPENDEN DENGAN PEMBATAS (SEPERTI PROFILE) ──
            - Halaman luar tidak pernah scroll (PAGE GA PERLU SCROLL!).
            - Masing-masing kolom scroll mandiri di jalurnya sendiri.
            - Scroll kiri TIDAK menyecroll tengah dan kanan, begitu pun sebaliknya.
            - Header masing-masing container IKUT TERSCROLL bersama kontennya.
          */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border bg-background">
            {/* ── KOLOM 1: DATA USER (FORMULIR INPUT) ── */}
            <div className="flex-1 min-w-0 min-h-0 p-3.5 sm:p-4 md:p-6 flex flex-col justify-start space-y-4 overflow-visible lg:overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Header Kolom 1 (Ikut Ter-scroll Bersama Konten) */}
              <div className="pb-3 border-b border-border/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-xs sm:text-sm text-foreground truncate">
                      Data User
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate whitespace-nowrap">
                      Identitas dan kredensial akun.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Inputs Kolom 1 */}
              <div className="space-y-4 flex-1">
                {/* Username */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="username"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <AtSign className="h-3.5 w-3.5 text-primary" /> Username{' '}
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    {...register('username')}
                    placeholder="Masukkan username"
                    disabled={formUserType === 'superadmin'}
                    className="h-9 text-xs sm:text-sm rounded-lg"
                  />
                  {errors.username && (
                    <p className="text-[11px] text-destructive">{errors.username.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="email"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5 text-primary" /> Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="email@example.com"
                    className="h-9 text-xs sm:text-sm rounded-lg"
                  />
                  {errors.email && (
                    <p className="text-[11px] text-destructive">{errors.email.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Notifikasi kredensial dikirimkan ke email ini.
                  </p>
                </div>

                {/* Nomor WhatsApp */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="phone"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary" /> Nomor WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="081234567890"
                    className="h-9 text-xs sm:text-sm rounded-lg"
                  />
                  {errors.phone && (
                    <p className="text-[11px] text-destructive">{errors.phone.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    Notifikasi WhatsApp dikirimkan ke nomor ini.
                  </p>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="full_name"
                    className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                  >
                    <UserRound className="h-3.5 w-3.5 text-primary" /> Full Name
                  </Label>
                  <Input
                    id="full_name"
                    type="text"
                    {...register('full_name')}
                    placeholder="Nama lengkap pengguna"
                    className="h-9 text-xs sm:text-sm rounded-lg"
                  />
                  {errors.full_name && (
                    <p className="text-[11px] text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold text-foreground flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-primary" /> Password{' '}
                      {isEdit ? '(Opsional)' : '*'}
                    </span>
                    {formPassword && (
                      <button
                        type="button"
                        onClick={copyPassword}
                        className="text-[10.5px] text-primary hover:underline flex items-center gap-1 font-medium"
                      >
                        {copiedPwd ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copiedPwd ? 'Tersalin' : 'Salin Password'}
                      </button>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      {...register('password')}
                      placeholder={isEdit ? '•••••••• (Tidak diubah)' : 'Klik Generate'}
                      readOnly
                      className="select-none h-9 text-xs sm:text-sm font-mono rounded-lg"
                      onKeyDown={(e) => e.preventDefault()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generatePassword}
                      className="h-9 px-3 text-xs font-medium rounded-lg gap-1.5 shrink-0"
                      title="Generate Password otomatis oleh sistem"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Generate
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-destructive">{errors.password.message}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-muted-foreground/70" />
                    Password di-generate otomatis sistem demi keamanan.
                  </p>
                </div>

                {/* Role Operasional */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-primary" /> Role Operasional
                  </Label>
                  <Controller
                    control={control}
                    name="role_id"
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={formUserType === 'superadmin'}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-9 text-xs sm:text-sm rounded-lg',
                            !field.value && 'text-muted-foreground',
                            errors.role_id && 'border-destructive'
                          )}
                        >
                          <SelectValue placeholder="Pilih role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {roles
                            .filter((r) => !r.is_superadmin && !r.is_system)
                            .map((r) => (
                              <SelectItem key={r.id} value={r.id} className="text-xs sm:text-sm">
                                {r.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.role_id && (
                    <p className="text-[11px] text-destructive">{errors.role_id.message}</p>
                  )}
                </div>

                {/* Status Switch */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="status"
                      className="text-xs font-semibold text-foreground cursor-pointer"
                    >
                      Status Akun
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      {formIsActive
                        ? 'Pengguna aktif dapat login ke sistem'
                        : 'Akses pengguna ditangguhkan'}
                    </p>
                  </div>
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
                </div>
              </div>

              {/* Spacer Bawah Kolom 1 */}
              <div className="h-4 shrink-0" aria-hidden="true" />
            </div>

            {/* ── KOLOM 2: HAK AKSES HALAMAN (ACCORDION MODUL TUNGGAL) ── */}
            <div className="flex-1 min-w-0 min-h-0 p-3.5 sm:p-4 md:p-6 flex flex-col justify-start space-y-4 overflow-visible lg:overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Header Kolom 2 (Ikut Ter-scroll Bersama Konten) */}
              <div className="pb-3 border-b border-border/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-xs sm:text-sm text-foreground truncate">
                      Hak Akses Halaman
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate whitespace-nowrap">
                      Hak akses per modul.
                    </p>
                  </div>
                </div>
                {selectedRole && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0 border-primary/30 text-primary bg-primary/5 shrink-0"
                  >
                    {selectedRole.name}
                  </Badge>
                )}
              </div>

              {/* Konten Kolom 2 */}
              <div className="space-y-3.5">
                {formUserType === 'superadmin' ? (
                  <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-xs text-foreground space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-primary">
                      <ShieldCheck className="h-4 w-4" /> Akses Superadmin Penuh
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Akun bertipe <strong>Superadmin</strong> memiliki hak akses otomatis tanpa
                      batas ke seluruh modul, halaman, data, dan tindakan di sistem.
                    </p>
                  </div>
                ) : !formRoleId ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-amber-300 bg-amber-50/60 min-h-[220px]">
                    <Shield className="h-7 w-7 text-amber-500 mb-2" />
                    <p className="font-semibold text-amber-900 text-xs">Role Belum Dipilih</p>
                    <p className="text-[11px] text-amber-700 mt-1 max-w-xs leading-relaxed">
                      Pilih <strong>Role Operasional</strong> pada form Data User di sebelah kiri
                      untuk memuat daftar halaman modul yang tersedia.
                    </p>
                  </div>
                ) : visibleModules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border bg-muted/20 min-h-[200px]">
                    <Shield className="h-7 w-7 text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-foreground text-xs">Belum Ada Modul Aktif</p>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
                      Role <strong>{selectedRole?.name}</strong> belum memiliki modul login yang
                      diaktifkan di menu Role.
                    </p>
                  </div>
                ) : (
                  /*
                    DAFTAR ACCORDION MODUL (HANYA 1 MODUL TERBUKA SEKALIGUS):
                    Bila modul PPDB dibuka, Company Profile otomatis tertutup.
                  */
                  <div className="space-y-3">
                    {visibleModules.map((mod) => {
                      const isExpanded = openModuleId === mod.id
                      const enabledPagesCount = mod.pages.filter((p) =>
                        isPageEnabled(p.id, p.key)
                      ).length

                      return (
                        <div
                          key={mod.id}
                          className={cn(
                            'rounded-xl border transition-all overflow-hidden bg-background',
                            isExpanded ? 'border-primary/40 shadow-xs' : 'border-border'
                          )}
                        >
                          {/* Tombol Header Accordion Modul */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenModuleId((prev) => (prev === mod.id ? null : mod.id))
                            }}
                            className={cn(
                              'w-full px-3.5 py-3 flex items-center justify-between text-left transition-colors cursor-pointer group',
                              isExpanded
                                ? 'bg-muted/40 border-b border-border'
                                : 'bg-muted/15 hover:bg-muted/30'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                    'p-1.5 rounded-lg transition-colors shrink-0',
                                    isExpanded
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-muted text-muted-foreground'
                                )}
                              >
                                <Layers className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                  {mod.name}
                                </h4>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {enabledPagesCount} dari {mod.pages.length} halaman aktif
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant="secondary"
                                className="text-[9.5px] px-1.5 py-0 font-medium"
                              >
                                {mod.pages.length} Halaman
                              </Badge>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                  isExpanded && 'rotate-180 text-primary'
                                )}
                              />
                            </div>
                          </button>

                          {/* Isi Halaman Modul (Hanya Muncul Bila Modul Aktif) */}
                          {isExpanded && (
                            <div className="divide-y divide-border/60 bg-background">
                              {mod.pages.map((page) => {
                                const isDashboard =
                                  page.key === 'dashboard' || page.key === 'admin-dashboard'
                                const isEnabled = isPageEnabled(page.id, page.key)
                                const canCrud = isPageCanCrud(page.id, page.key, page.has_crud)
                                const hasCrudSupport = page.has_crud !== false && !isDashboard

                                return (
                                  <div
                                    key={page.id}
                                    className={cn(
                                      'p-3 transition-colors text-xs space-y-2',
                                      isEnabled ? 'bg-background' : 'bg-muted/15 opacity-60'
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <Checkbox
                                          checked={isEnabled}
                                          disabled={isDashboard}
                                          onCheckedChange={() => togglePageAccess(page)}
                                          className="h-4 w-4 rounded"
                                        />
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-semibold text-foreground truncate">
                                              {page.label}
                                            </span>
                                            {isDashboard && (
                                              <span className="text-[9.5px] px-1.5 py-0 rounded bg-primary/10 text-primary font-medium">
                                                Wajib
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-muted-foreground font-mono truncate">
                                            /{page.key}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* CRUD Toggle Switch */}
                                    {hasCrudSupport && isEnabled && (
                                      <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[11px]">
                                        <span className="text-[10.5px] text-muted-foreground font-medium">
                                          {canCrud
                                            ? 'Aksi Aktif (Bisa CRUD)'
                                            : 'Hanya Lihat (Read-Only)'}
                                        </span>
                                        <Switch
                                          checked={canCrud}
                                          onCheckedChange={() => togglePageCrud(page)}
                                          className="scale-90"
                                        />
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── KOLOM 3: AKTIFITAS USER (SCROLL MANDIRI & HEADER IKUT TERSCROLL) ── */}
            <div className="flex-1 min-w-0 min-h-0 p-3.5 sm:p-4 md:p-6 flex flex-col justify-start space-y-4 overflow-visible lg:overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-muted/20 dark:bg-muted/10">
              <UserActivityPanel userId={id} username={formUsername} isEdit={isEdit} />
            </div>
          </div>
        </form>
      </div>
    </>
  )
}
