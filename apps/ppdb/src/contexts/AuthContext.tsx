import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import * as api from '@/api/client'

export interface AuthUser {
  id: string; username: string; email: string; phone?: string; full_name: string; role_id: string; role_name?: string; user_type: string; is_active: boolean
  avatar_url?: string
  permissions: Record<string, string>
  is_superadmin: boolean
  page_permissions: string[]
  crud_permissions?: string[]
  payment_status?: string
  payment_deadline?: string
  created_at?: string
  last_login_at?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, login: async () => {}, logout: async () => {}, refreshUser: async () => {} })

// Dummy auth: pilih peran mock sesuai path supaya tiap panel bisa dibuka
// langsung. `/applicant` & `/checkout` → user applicant; sisanya admin. Hanya
// aktif saat VITE_MOCK_AUTH=true; produksi tidak terpengaruh.
function resolveInitialUser(): AuthUser | null {
  const stored = api.getStoredUser() as AuthUser | null
  if (!api.MOCK_AUTH) return stored
  const wantApplicant = /^\/(applicant|checkout)(\/|$)/.test(window.location.pathname)
  if (stored && (stored.user_type === 'applicant') === wantApplicant) return stored
  return api.getMockUser(wantApplicant ? 'pendaftar' : 'admin') as AuthUser
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => resolveInitialUser())
  // loading hanya true jika ada sesi tersimpan yang perlu divalidasi ke backend.
  const [loading, setLoading] = useState(() => !!api.getStoredUser())

  useEffect(() => {
    if (!api.getStoredUser()) return
    api.getMe().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  // Auto-refresh user permissions every 30 seconds to handle dynamic permission changes or account deactivation
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      api.getMe().then(setUser).catch(() => {
        api.clearAuth()
        setUser(null)
      })
    }, 30000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]) // only re-run if user id changes

  const loginFn = useCallback(async (username: string, password: string) => { const u = await api.login(username, password); setUser(u) }, [])
  const logoutFn = useCallback(async () => { await api.logout(); setUser(null) }, [])
  const refreshUser = useCallback(async () => { try { setUser(await api.getMe()) } catch (e) { void e } }, [])

  return <AuthContext.Provider value={{ user, loading, login: loginFn, logout: logoutFn, refreshUser }}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }

export function usePermission() {
  const { user } = useAuth()
  return {
    hasModuleAccess: (module: string) => {
      if (!user) return false
      if (user.is_superadmin || user.user_type === 'superadmin') return true
      const perm = user.permissions?.[module]
      return Boolean(perm && perm !== 'none')
    },
    canCrudPage: (pageKey: string) => {
      if (!user) return false
      if (user.is_superadmin || user.user_type === 'superadmin') return true
      return (user.crud_permissions || []).includes(pageKey)
    },
    canAccessPage: (pageKey: string) => {
      if (!user) return false
      if (user.is_superadmin || user.user_type === 'superadmin') return true
      if (pageKey === 'dashboard') return true
      const pagePerms = user.page_permissions || []
      return pagePerms.length === 0 || pagePerms.includes(pageKey)
    },
    isAdmin: () => {
      if (!user) return false
      // Superadmin selalu punya akses admin
      if (user.is_superadmin || user.user_type === 'superadmin') return true
      // Applicant TIDAK punya akses admin
      if (user.user_type === 'applicant') return false
      // Admin biasa: harus punya minimal 1 module bukan 'none'
      return Object.values(user.permissions || {}).some(v => v !== 'none')
    },
    hasApplicantAccess: () => {
      if (!user) return false
      // Hanya user_type=applicant yang punya akses applicant dashboard
      return user.user_type === 'applicant'
    },
    pagePermissions: user?.page_permissions || [],
    crudPermissions: user?.crud_permissions || [],
    permissions: user?.permissions || {},
    isSuperadmin: user?.is_superadmin || user?.user_type === 'superadmin',
  }
}

export function normalizeNavKey(href: string): string {
  let key = href.replace(/^\/admin/, '').replace(/^\//, '') || ''
  if (key.startsWith('sessions')) return 'sessions'
  if (key.startsWith('pembayaran-tahap2')) return 'pembayaran-tahap2'
  if (key.startsWith('pembayaran-formulir')) return 'pembayaran-formulir'
  if (key.startsWith('kuitansi')) return 'pembayaran-formulir'
  const seg = key.split('/')[0] || ''
  return seg || 'dashboard'
}

export function useFilteredNav(items: { label: string; href?: string; module?: string; minLevel?: 'dashboard' | 'read' | 'crud'; roles?: string[]; children?: { label: string; href: string; module?: string; minLevel?: 'dashboard' | 'read' | 'crud' }[] }[]) {
  const { user } = useAuth()
  const { permissions, isSuperadmin, pagePermissions } = usePermission()

  return useMemo(() => {
    if (!user) return items

    return items.reduce((acc, item) => {
      // Check role access
      if (item.roles && !item.roles.includes(user.user_type) && !isSuperadmin) return acc

      // Check module permission
      if (item.module && !isSuperadmin) {
        const perm = permissions[item.module]
        if (!perm || perm === 'none') return acc
      }

      // Filter children based on page_permissions
      const filteredItem = { ...item }
      if (item.children) {
        filteredItem.children = item.children.filter(c => {
          if (!isSuperadmin && pagePermissions.length > 0) {
            const pageKey = normalizeNavKey(c.href)
            if (pageKey === 'dashboard') return true
            if (!pagePermissions.includes(pageKey)) return false
          }
          return true
        })
        if (filteredItem.children.length === 0) return acc
      } else {
        if (!isSuperadmin && pagePermissions.length > 0 && item.href) {
          const pageKey = normalizeNavKey(item.href)
          if (pageKey === 'dashboard') return acc.concat(filteredItem)
          if (pageKey && !pagePermissions.includes(pageKey)) return acc
        }
      }

      acc.push(filteredItem)
      return acc
    }, [] as typeof items)
  }, [items, user, permissions, isSuperadmin, pagePermissions])
}
