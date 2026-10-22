import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { AuthUser } from '../types'
import * as api from '../api/client'

/**
 * Tandai sesi berakhir lalu pindah ke halaman login. Flag di sessionStorage
 * dibaca LoginPage untuk menampilkan pesan "sesi berakhir" — window.location
 * memuat ulang seluruh aplikasi sehingga toast biasa tidak sempat tampil.
 */
function forceSessionExpiredRedirect() {
  sessionStorage.setItem('sa_session_expired', '1')
  window.location.href = '/auth/login'
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => { throw new Error('AuthContext not initialized') },
  logout: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    api.getStoredUser() ?? (api.MOCK_AUTH ? api.getMockUser() : null)
  )
  // loading hanya true jika ada sesi tersimpan yang perlu divalidasi ke backend.
  // Tanpa sesi tersimpan, langsung false agar ProtectedRoute redirect ke /auth/login.
  const [loading, setLoading] = useState(() => !!api.getStoredUser())
  // Hitung kegagalan getMe berturut-turut saat revalidasi berkala.
  const consecutiveFailures = useRef(0)

  useEffect(() => {
    if (!api.getStoredUser()) return
    // Validate token in background
    api.getMe().then((u) => setUser(u)).catch(() => {
      setUser(null)
    }).finally(() => setLoading(false))

    // Revalidasi berkala: akun yang dinonaktifkan (is_active=false) atau token
    // yang di-revoke saat sesi berjalan akan segera di-kick ke /auth/login.
    // Sesi yang benar-benar berakhir (401) langsung keluar; kegagalan lain
    // (jaringan/blip server) ditoleransi 3 kali berturut-turut agar user tidak
    // di-kick hanya karena gangguan sementara.
    const interval = window.setInterval(() => {
      api.getMe().then((u) => {
        setUser(u)
        consecutiveFailures.current = 0
      }).catch((e) => {
        if (api.isApiError(e) && e.status === 401) {
          setUser(null)
          forceSessionExpiredRedirect()
          return
        }
        consecutiveFailures.current += 1
        if (consecutiveFailures.current >= 3) {
          setUser(null)
          forceSessionExpiredRedirect()
        }
      })
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const u = await api.login(username, password)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const u = await api.getMe()
      setUser(u)
    } catch { /* ignore */ }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
