'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import * as api from '@/app/lib/api'
import { eventBus } from '@/app/lib/event-bus'
import { useSSE } from '@/app/hooks/useSSE'
import AdminToast, { toast } from '@/app/components/ui/AdminToast'
import AdminConfirm from '@/app/components/ui/AdminConfirm'
import {
  Plus, Settings, LayoutDashboard, Loader2, FolderOpen, Pencil, Trash2, Search, X, RefreshCw,
  Link as LinkIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ProfileModal from '@/app/components/ProfileModal'
import CrossTabSync from '@/app/components/CrossTabSync'
import EmptyState from '@/app/components/ui/EmptyState'
import { DashboardShell } from '@repo/ui'
import {
  AdminDashboardLink,
  AdminSidebarFooter,
  buildAdminNavGroups,
  useAdminFavicon,
} from '../_admin-shell'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/app/components/ui/Table'
import { cn } from '@/app/lib/utils'

// ── Sub-components ────────────────────────────────────────────────────────────
import { StaffOrgChart } from '@/app/components/staff/StaffOrgChart'
import { SettingsEditor } from './SettingsEditor'
import { ContactEditor } from './ContactEditor'
import { CrudFormDialog } from './CrudFormDialog'
import { FacilityFormDialog } from './facilities/FacilityFormDialog'
import { StaffFormDialog } from './staff/StaffFormDialog'
import { TestimonialFormDialog } from './testimonials/TestimonialFormDialog'
import { AchievementFormDialog } from './achievements/AchievementFormDialog'
import { AchievementTable } from './achievements/AchievementTable'
import { GalleryFormDialog } from './gallery/GalleryFormDialog'
import { SocialFormDialog } from './social/SocialFormDialog'
import { SocialLinkList } from './social/SocialLinkList'
import {
  nextTestimonialOrder,
  testimonialQuoteFromContent,
} from './testimonials/testimonial-form'
import { resolveImageSrc } from '@/app/lib/image-file'
import {
  GALLERY_CATEGORY_OPTIONS,
  galleryCategoryLabel,
} from '@/app/lib/gallery-categories'
import {
  TABS, TABLE_COLS, FORM_FIELDS, CONTENT_FIELDS, sortRowsByOrder,
} from './_constants'
import type { TableColumn } from './_constants'
import type { AdminUser, FormState, RowRecord } from './_types'

const TAB_DESCRIPTIONS: Record<string, string> = {
  hero: 'Kelola slide hero beranda (teks, gambar, dan tombol).',
  news: 'Kelola artikel, berita, dan pengumuman terbaru pesantren.',
  programs: 'Atur program pendidikan yang ditawarkan pesantren.',
  facilities: 'Kelola sarana dan prasarana yang dimiliki pesantren.',
  staff: 'Kelola daftar guru dan pengurus pesantren.',
  achievements: 'Catat raihan dan penghargaan santri.',
  gallery: 'Kelola dokumentasi foto kegiatan pesantren.',
  testimonials: 'Kelola kesan dan testimoni wali santri.',
  social: 'Kelola tautan media sosial dan kanal komunikasi resmi yang ditampilkan pada website.',
  contact: 'Kelola informasi kontak, alamat, dan lokasi resmi yang ditampilkan pada website.',
  settings: 'Konfigurasi logo, favicon, dan pengaturan situs.',
}

// ─── Skeleton ───────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-[var(--border)]/50 px-5 py-4 last:border-0"
        >
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--border)]" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded-full bg-[var(--border)]" />
            <div className="h-2.5 w-1/4 rounded-full bg-[var(--border)]/70" />
          </div>
          <div className="h-6 w-20 rounded-full bg-[var(--border)]/70" />
          <div className="h-3 w-16 rounded-full bg-[var(--border)]/70" />
        </div>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse space-y-3 rounded-2xl border border-[var(--border)]/70 bg-white/60 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--border)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-full bg-[var(--border)]" />
              <div className="h-3 w-1/2 rounded-full bg-[var(--border)]/70" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-20 rounded-full bg-[var(--border)]/70" />
            <div className="h-8 w-20 rounded-full bg-[var(--border)]/70" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Row renderer tabel ─────────────────────────────────────

/**
 * Nilai sel berasal dari JSON `content` (bertipe `unknown`). Koersi ke teks
 * dengan aman: string dipakai apa adanya, angka/boolean di-string-kan, dan
 * nilai objek/null menjadi kosong — renderer menampilkannya sebagai "—".
 */
function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function formatDateLabel(raw: string): string {
  if (!raw) return '—'
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Kutipan testimoni untuk pencarian & pratinjau tabel. Sumber utamanya
 * `content.quote`; data lama menyimpan teks di `content.text`.
 */
function testimonialQuoteOf(item: RowRecord): string {
  return testimonialQuoteFromContent(item.content as Record<string, unknown> | null | undefined)
}

/**
 * Thumbnail baris. Sengaja memakai `<img>`, bukan next/image: URL gambar
 * berasal dari input bebas admin, dan next/image *melempar* error untuk host
 * yang belum terdaftar di remotePatterns — itu akan mematikan seluruh tabel.
 * Fallback (huruf awal / ikon tab) selalu dirender di belakang gambar,
 * sehingga aman saat URL kosong maupun gagal dimuat.
 */
function RowThumb({
  url, label, icon: Icon, round,
}: {
  url?: string
  label: string
  icon: LucideIcon
  round?: boolean
}) {
  const initial = label.trim().charAt(0).toUpperCase()
  return (
    <span
      className={cn(
        'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-[var(--border)]/80 bg-[var(--accent-subtle)] text-[var(--accent)]',
        round ? 'rounded-full' : 'rounded-xl',
      )}
    >
      {initial ? (
        <span className="text-sm font-bold">{initial}</span>
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL bebas dari admin; lihat komentar fungsi.
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  )
}

function TableCellValue({ col, item }: { col: TableColumn; item: RowRecord }) {
  const value = toText(col.accessor(item)).trim()

  if (col.variant === 'badge') {
    if (!value) return <span className="text-sm text-[var(--text-muted)]">—</span>
    return (
      <span
        className={cn(
          'inline-flex max-w-[200px] items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap',
          col.tone === 'gold'
            ? 'bg-[var(--accent-gold)]/15 text-[#9A7429]'
            : 'bg-[var(--accent-subtle)] text-[var(--accent)]',
        )}
      >
        <span className="truncate">{value}</span>
      </span>
    )
  }

  if (col.variant === 'date') {
    return (
      <span className="text-sm whitespace-nowrap text-[var(--text-secondary)] tabular-nums">
        {formatDateLabel(value)}
      </span>
    )
  }

  return (
    <span className="block max-w-[280px] truncate text-sm text-[var(--text-secondary)]" title={value || undefined}>
      {value || '—'}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

const ADMIN_PAGE_SIZE = 25

export default function AdminDashboard() {
  const router = useRouter()

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('news')
  const [profileOpen, setProfileOpen] = useState(false)
  // Filter pencarian (Testimoni & Galeri) dikunci pada tab asalnya: begitu
  // admin pindah tab, filter otomatis dianggap kosong. Pola derived-state ini
  // menghindari useEffect yang memanggil setState (cascading render).
  const [tabFilters, setTabFilters] = useState<{
    tab: string
    query: string
    galleryCategory: string
  }>(() => ({ tab: 'news', query: '', galleryCategory: '' }))
  const searchQuery = tabFilters.tab === activeTab ? tabFilters.query : ''
  const galleryCategoryFilter =
    tabFilters.tab === activeTab ? tabFilters.galleryCategory : ''

  function setSearchQuery(query: string) {
    setTabFilters((prev) => ({ ...prev, tab: activeTab, query }))
  }

  function setGalleryCategoryFilter(galleryCategory: string) {
    setTabFilters((prev) => ({ ...prev, tab: activeTab, galleryCategory }))
  }

  function resetGalleryFilters() {
    setTabFilters((prev) => ({ ...prev, tab: activeTab, query: '', galleryCategory: '' }))
  }

  // ── Data state ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<RowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  // Id baris yang sedang dimuat penuh untuk form edit. Non-null = tombol Edit
  // baris tersebut sedang mengambil `content` & `gallery` yang tidak ada di list.
  const [detailLoading, setDetailLoading] = useState<string | null>(null)

  // ── Auth state ────────────────────────────────────────────────────────────
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [pagePermissions, setPagePermissions] = useState<string[] | null>(null)
  const [crudPermissions, setCrudPermissions] = useState<string[] | null>(null)
  const faviconUrl = useAdminFavicon()

  const isSuperadmin =
    adminUser?.user_type === 'superadmin' || adminUser?.is_superadmin === true

  const canCrud =
    isSuperadmin ||
    (crudPermissions !== null
      ? crudPermissions.includes(activeTab)
      : adminUser?.crud_permissions
      ? adminUser.crud_permissions.includes(activeTab)
      : adminUser?.permissions?.companyprofile === 'crud')

  const filteredTabs =
    isSuperadmin
      ? TABS
      : pagePermissions !== null
      ? TABS.filter((tab) => pagePermissions.includes(tab.key))
      : TABS

  // ── Form state ────────────────────────────────────────────────────────────
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editingItem, setEditingItem] = useState<RowRecord | null>(null)
  const [formData, setFormData] = useState<FormState>({})

  useSSE('companyprofile')

  // ── Deep-link ?tab= ───────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab && TABS.some((t) => t.key === tab)) {
      const id = window.setTimeout(() => setActiveTab(tab), 0)
      return () => window.clearTimeout(id)
    }
  }, [])

  // ── SSE: live page-permissions ────────────────────────────────────────────
  useEffect(() => {
    const userId = adminUser?.id
    if (!userId) return
    const url = `${api.API_BASE.replace(/\/$/, '')}/users/${userId}/events`
    const es = new EventSource(url, { withCredentials: true })
    es.addEventListener('page_permissions_changed', (e) => {
      try {
        const data = JSON.parse(e.data)
        setPagePermissions(
          data.page_keys && data.page_keys.length > 0 ? data.page_keys : null,
        )
        if (Array.isArray(data.crud_keys)) {
          setCrudPermissions(data.crud_keys)
        }
      } catch { /* ignore */ }
    })
    return () => es.close()
  }, [adminUser?.id])

  const handle401 = useCallback(() => {
    localStorage.removeItem('admin_user')
    router.push('/auth/login')
  }, [router])

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const currentTabs =
      isSuperadmin
        ? TABS
        : pagePermissions !== null
        ? TABS.filter((tab) => pagePermissions.includes(tab.key))
        : TABS

    setLoading(true)
    setError('')
    try {
      const tab = currentTabs.find((t) => t.key === activeTab)
      if (!tab) {
        if (currentTabs.length > 0) setActiveTab(currentTabs[0].key)
        setLoading(false)
        return
      }
      if (activeTab === 'contact' || activeTab === 'settings') {
        const data = await tab.fetch()
        setItems(Array.isArray(data) ? data : data ? [data as RowRecord] : [])
        setHasMore(false)
      } else {
        const data = await api.getEntityPage(tab.endpoint, 1, ADMIN_PAGE_SIZE)
        const rows = data as unknown as RowRecord[]
        setItems(rows)
        setPage(1)
        setHasMore(rows.length === ADMIN_PAGE_SIZE)
      }
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('401') || e.message.includes('Unauthorized'))) {
        handle401()
        return
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat data')
      setItems([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [activeTab, handle401, isSuperadmin, pagePermissions])

  const loadMore = useCallback(async () => {
    const tab = TABS.find((t) => t.key === activeTab)
    if (!tab || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const next = page + 1
      const data = await api.getEntityPage(tab.endpoint, next, ADMIN_PAGE_SIZE)
      const rows = data as unknown as RowRecord[]
      setItems((prev) => [...prev, ...rows])
      setPage(next)
      setHasMore(rows.length === ADMIN_PAGE_SIZE)
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('401') || e.message.includes('Unauthorized'))) {
        handle401(); return
      }
      setError(e instanceof Error ? e.message : 'Gagal memuat lebih banyak data')
    } finally {
      setLoadingMore(false)
    }
  }, [activeTab, handle401, hasMore, loadingMore, page])

  useEffect(() => {
    eventBus.on('companyprofile:refresh', fetchData)
    return () => eventBus.off('companyprofile:refresh', fetchData)
  }, [fetchData])

  // ── Bootstrap: load user & sidebar state ─────────────────────────────────
  useEffect(() => {
    // Deferred ke async boundary: membaca localStorage untuk inisialisasi
    // post-hydration (SSR-safe) tanpa setState sinkron dalam effect.
    const id = window.setTimeout(() => {
      const userRaw = localStorage.getItem('admin_user')
      if (!userRaw) {
        ; (async () => {
          try {
            const me = await api.getMe()
            if (me) {
              localStorage.setItem('admin_user', JSON.stringify(me))
              setAdminUser(me)
              if (me.crud_permissions) {
                setCrudPermissions(me.crud_permissions)
              }
            }
          } catch {
            localStorage.removeItem('admin_user')
            router.replace('/auth/login')
          }
        })()
        return
      }
      try {
        const parsed = JSON.parse(userRaw)
        setAdminUser(parsed)
        if (parsed.page_permissions?.length > 0) {
          setPagePermissions(parsed.page_permissions)
        }
        if (parsed.crud_permissions) {
          setCrudPermissions(parsed.crud_permissions)
        }
      } catch {
        localStorage.removeItem('admin_user')
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [router])

  useEffect(() => {
    if (!localStorage.getItem('admin_user')) {
      router.replace('/auth/login')
      return
    }
    const id = window.setTimeout(() => fetchData(), 0)
    return () => window.clearTimeout(id)
  }, [activeTab, fetchData, router])

  // Lock body scroll when form is open
  useEffect(() => {
    document.body.style.overflow = formMode ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [formMode])

  // ── Form helpers ──────────────────────────────────────────────────────────
  function openCreate() {
    const fd: FormState = {}
    for (const f of FORM_FIELDS[activeTab] || []) fd[f.name] = ''
    for (const f of CONTENT_FIELDS[activeTab] || []) fd[`_c_${f.name}`] = ''
    // Berita baru langsung terisi tanggal hari ini supaya admin tidak perlu
    // memilih ulang untuk artikel yang terbit sekarang.
    if (activeTab === 'news') {
      const now = new Date()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      fd.date = `${now.getFullYear()}-${month}-${day}`
    }
    // Urutan testimoni baru mengikuti data yang sudah ada, bukan angka tetap,
    // supaya entri baru tidak menyalip atau menabrak urutan yang sudah diatur.
    if (activeTab === 'testimonials') {
      fd.order = nextTestimonialOrder(items)
    }
    // Tahun prestasi baru langsung terisi tahun berjalan agar admin tidak perlu
    // mengetik ulang untuk prestasi tahun ini, namun tetap mudah diubah.
    if (activeTab === 'achievements') {
      fd.year = new Date().getFullYear()
    }
    fd.image = ''
    fd.gallery = []
    setFormData(fd)
    setEditingItem(null)
    setFormMode('create')
  }

  function populateForm(item: RowRecord) {
    const fd: FormState = {}
    for (const f of FORM_FIELDS[activeTab] || []) fd[f.name] = item[f.name] ?? ''
    // Extract content fields
    const content = (item.content ?? {}) as Record<string, unknown>
    for (const f of CONTENT_FIELDS[activeTab] || []) {
      const val = content[f.name]
      fd[`_c_${f.name}`] = f.type === 'list' && Array.isArray(val)
        ? (val as string[]).join('\n')
        : typeof val === 'string' ? val
        : typeof val === 'number' ? String(val)
        : ''
    }
    fd.image = item.image || ''
    let rawGallery = item.gallery
    if (typeof rawGallery === 'string') try { rawGallery = JSON.parse(rawGallery) } catch { /* ignore */ }
    fd.gallery = Array.isArray(rawGallery) ? rawGallery as string[] : []
    // Testimoni lama dapat menyimpan kutipan di `content.text`; form selalu
    // memakai `content.quote`, jadi fallback-nya dibaca di sini.
    if (activeTab === 'testimonials') {
      fd._c_quote = testimonialQuoteFromContent(content)
    }
    setFormData(fd)
    setEditingItem(item)
    setFormMode('edit')
  }

  // WAJIB ambil detail penuh sebelum membuka form edit. `GET /{entity}` sengaja
  // membuang `content.content` dan mengosongkan `gallery` supaya list publik
  // tetap ringan; menyalin baris list itu ke form lalu Menyimpan akan
  // MENGHAPUS isi artikel dan galerinya secara permanen. Kalau detail gagal
  // dimuat, form TIDAK boleh dibuka sama sekali.
  async function openEdit(item: RowRecord) {
    const tab = TABS.find((t) => t.key === activeTab)
    if (!tab) return
    setDetailLoading(item.id ?? '')
    try {
      const detail = (await api.getEntityDetail(
        tab.endpoint,
        String(item.slug || item.id || item.key || ''),
      )) as unknown as RowRecord
      populateForm({ ...item, ...detail })
    } catch (e: unknown) {
      toast(
        'error',
        'Gagal memuat data lengkap: ' +
          (e instanceof Error ? e.message : 'terjadi kesalahan') +
          '. Form tidak dibuka agar data lama tidak tertimpa.',
      )
    } finally {
      setDetailLoading(null)
    }
  }

  function closeForm() {
    setFormMode(null)
    setEditingItem(null)
    setFormData({})
  }

  async function handleDelete(item: RowRecord) {
    try {
      const tab = TABS.find((t) => t.key === activeTab)!
      await api.deleteItem(`${tab.endpoint}/${item.id}`)
      fetchData()
      toast('success', 'Berhasil dihapus')
    } catch (e) {
      toast('error', e instanceof Error ? e.message : 'Gagal menghapus')
    }
  }

  function handleLogout() {
    api.logout()
    localStorage.removeItem('admin_user')
    router.push('/auth/login')
  }

  const activeTabDef = TABS.find((t) => t.key === activeTab)!

  // Baris diurutkan sesuai sumber urutan entitas. Entitas ber-kolom `order`
  // sudah terurut dari backend; entitas PPDB & staff menyimpan urutan di
  // dalam JSON `content`, jadi diurutkan di sini agar baris tabel admin
  // urutannya sama dengan urutan di situs publik.
  const orderedItems = useMemo(
    () => sortRowsByOrder(activeTab, items),
    [activeTab, items],
  )

  // Pencarian Testimoni & Galeri hanya menyaring baris yang sudah dimuat
  // (tanpa mengubah endpoint/parameter API). Tab lain memakai tabel apa adanya.
  const visibleItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (activeTab === 'testimonials') {
      if (!query) return orderedItems
      return orderedItems.filter((item) =>
        [item.name, item.child, testimonialQuoteOf(item)]
          .filter((value): value is string => typeof value === 'string')
          .some((value) => value.toLowerCase().includes(query)),
      )
    }
    if (activeTab === 'gallery') {
      return orderedItems.filter((item) => {
        if (galleryCategoryFilter) {
          // Kategori standar difilter dengan label; kategori custom lama
          // dicocokkan persis apa adanya supaya tidak "hilang" dari filter.
          if (String(item.category ?? '').trim() !== galleryCategoryFilter) return false
        }
        if (!query) return true
        return [item.content?.title, item.category]
          .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
          .some((value) => value.toLowerCase().includes(query))
      })
    }
    return orderedItems
  }, [activeTab, orderedItems, searchQuery, galleryCategoryFilter])

  // Opsi filter kategori galeri: kategori standar + nilai lama yang dipakai
  // datanya (agar custom lama tetap bisa difilter) — tanpa duplikat.
  const galleryCategoryOptions = useMemo(() => {
    const used = new Set<string>()
    for (const item of orderedItems) {
      const category = String(item.category ?? '').trim()
      if (category) used.add(galleryCategoryLabel(category))
    }
    const standard = GALLERY_CATEGORY_OPTIONS.map((option) => option.value)
    return [...standard, ...[...used].filter((value) => !standard.includes(value))]
  }, [orderedItems])

  // Kolom tabel: `title` + `subtitle` digabung jadi satu sel utama
  // (thumbnail + judul + baris kecil), kolom sisanya dirender sesuai `variant`.
  const tableCols = TABLE_COLS[activeTab] ?? []
  const titleCol = tableCols.find((c) => c.variant === 'title') ?? tableCols[0]
  const subtitleCol = tableCols.find((c) => c.variant === 'subtitle')
  const detailCols = tableCols.filter((c) => c !== titleCol && c !== subtitleCol)

  const navGroups = buildAdminNavGroups(
    filteredTabs.map((t) => ({
      key: t.key,
      label: t.label,
      icon: t.icon,
      active: activeTab === t.key,
      onClick: () => setActiveTab(t.key),
    })),
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <AdminToast />
      <AdminConfirm />

      <DashboardShell
        brand={{
          name: 'PTDARRAHMAN',
          subtitle: 'Admin CMS',
          faviconUrl: faviconUrl || undefined,
          logoUrl: faviconUrl || undefined,
        }}
        navGroups={navGroups}
        renderLink={AdminDashboardLink}
        onNavigate={(item) => {
          if (item.onClick) {
            item.onClick()
          } else if (item.href) {
            const tabMatch = item.href.match(/tab=([^&]+)/)
            if (tabMatch && tabMatch[1]) {
              setActiveTab(tabMatch[1])
            } else {
              router.push(item.href)
            }
          }
        }}
        apiBase={api.API_BASE}
        contentClassName="animate-fade-in"
        storageKey="cp_collapsed"
        roleLabel={adminUser?.role_name || adminUser?.user_type}
        user={{
          fullName: adminUser?.full_name,
          username: adminUser?.username,
          email: adminUser?.email,
          avatarUrl: adminUser?.avatar_url,
          role: adminUser?.role_name || adminUser?.user_type,
        }}
        onProfile={() => router.push('/admin/profile')}
        onViewSite={() => window.open('/', '_blank')}
        onLogout={handleLogout}
        sidebarFooter={<AdminSidebarFooter />}
      >


          {/* Title card */}
          <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary via-emerald-700 to-[#145337] p-6 md:p-8 text-white shadow-lg mb-6">
            <div className="absolute -top-16 -right-10 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-[#D4A853]/30 blur-2xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white shadow-inner shrink-0">
                  <activeTabDef.icon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/90">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Admin CMS
                  </p>
                  <h2 className="mt-1.5 font-heading text-2xl md:text-3xl font-bold leading-tight">
                    {activeTabDef.label}
                  </h2>
                  <p className="mt-1.5 text-sm text-emerald-50/85 max-w-xl leading-relaxed">
                    {TAB_DESCRIPTIONS[activeTab] || 'Kelola konten website Pesantren Ar-Rahman.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {activeTab !== 'settings' && activeTab !== 'contact' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-semibold" title="Jumlah item">
                    <FolderOpen className="h-3.5 w-3.5" />
                    {(activeTab === 'testimonials' || activeTab === 'gallery') ? visibleItems.length : items.length} item
                  </span>
                )}
                {canCrud && activeTab !== 'settings' && activeTab !== 'contact' && (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/95 hover:bg-white text-emerald-900 px-4 py-2.5 text-sm font-semibold shadow-md transition-all duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    {activeTab === 'testimonials'
                      ? 'Tambah Testimoni'
                      : activeTab === 'gallery'
                        ? 'Tambah Foto'
                        : activeTab === 'social'
                          ? 'Tambah Tautan Sosial'
                          : 'Buat Baru'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error + retry */}
          {error && (
            <div className="mb-5 flex flex-col gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                onClick={fetchData}
                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 sm:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Coba Lagi
              </button>
            </div>
          )}

          {/* Skeletons */}
          {loading && (
            <>
              <div className="hidden md:block bg-card rounded-2xl border border-border p-4">
                <TableSkeleton />
              </div>
              <div className="md:hidden">
                <CardSkeleton />
              </div>
            </>
          )}

          {/* Empty states */}
          {activeTab === 'settings' && !loading && items.length === 0 && (
            <EmptyState icon={Settings} title="Belum Ada Pengaturan" description="Tidak ada pengaturan yang tersedia." />
          )}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && !error && items.length === 0 && (
            <EmptyState
              icon={activeTab === 'social' ? LinkIcon : LayoutDashboard}
              title={activeTab === 'social' ? 'Belum Ada Tautan Sosial' : 'Belum Ada Data'}
              description={
                activeTab === 'social'
                  ? 'Tambahkan Instagram, YouTube, WhatsApp, dan kanal resmi lainnya agar mudah diakses pengunjung lewat footer dan halaman Kontak.'
                  : activeTab === 'testimonials'
                  ? canCrud
                    ? 'Belum ada testimoni. Tambahkan kesan wali santri agar halaman publik lebih hidup.'
                    : 'Belum ada testimoni.'
                  : canCrud
                    ? 'Belum ada item di sini. Klik "Buat Baru" untuk memulai.'
                    : 'Belum ada item di sini.'
              }
              action={
                canCrud ? (
                  <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:bg-[var(--accent)]/90 shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    {activeTab === 'testimonials'
                      ? 'Tambah Testimoni'
                      : activeTab === 'gallery'
                        ? 'Tambah Foto'
                        : activeTab === 'social'
                          ? 'Tambah Tautan Sosial'
                          : 'Buat Baru'}
                  </button>
                ) : undefined
              }
            />
          )}

          {/* Toolbar pencarian Testimoni */}
          {activeTab === 'testimonials' && !loading && !error && items.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/70 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari nama wali, anak, atau kutipan…"
                  aria-label="Cari testimoni"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 pr-9 pl-9 text-sm text-[var(--text)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Hapus pencarian"
                    className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-[var(--text-muted)]" role="status" aria-live="polite">
                {searchQuery.trim()
                  ? `Menampilkan ${visibleItems.length} dari ${items.length} testimoni yang dimuat`
                  : `${items.length} testimoni dimuat`}
              </p>
            </div>
          )}

          {/* Toolbar pencarian & filter Galeri */}
          {activeTab === 'gallery' && !loading && !error && items.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/70 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cari judul atau kategori foto…"
                    aria-label="Cari foto galeri"
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-white/90 pr-9 pl-9 text-sm text-[var(--text)] transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Hapus pencarian"
                      className="absolute top-1/2 right-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                <select
                  value={galleryCategoryFilter}
                  onChange={(event) => setGalleryCategoryFilter(event.target.value)}
                  aria-label="Filter kategori galeri"
                  className="h-10 rounded-xl border border-[var(--border)] bg-white/90 px-3 text-sm text-[var(--text)] transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 focus:outline-none"
                >
                  <option value="">Semua kategori</option>
                  {galleryCategoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {(searchQuery || galleryCategoryFilter) && (
                  <button
                    type="button"
                    onClick={resetGalleryFilters}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text)]"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]" role="status" aria-live="polite">
                {searchQuery.trim() || galleryCategoryFilter
                  ? `Menampilkan ${visibleItems.length} dari ${items.length} foto yang dimuat`
                  : `${items.length} foto dimuat`}
              </p>
            </div>
          )}

          {/* Tidak ada hasil filter Galeri */}
          {activeTab === 'gallery' &&
            !loading &&
            !error &&
            items.length > 0 &&
            visibleItems.length === 0 && (
              <EmptyState
                icon={Search}
                title="Foto Tidak Ditemukan"
                description="Tidak ada foto yang cocok dengan pencarian atau filter kategori ini. Coba kata kunci atau kategori lain."
                action={
                  <button
                    onClick={resetGalleryFilters}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--bg-secondary)]"
                  >
                    <X className="w-4 h-4" />
                    Hapus Filter
                  </button>
                }
              />
            )}

          {/* Tidak ada hasil pencarian Testimoni */}
          {activeTab === 'testimonials' &&
            !loading &&
            !error &&
            items.length > 0 &&
            visibleItems.length === 0 && (
              <EmptyState
                icon={Search}
                title="Testimoni Tidak Ditemukan"
                description={`Tidak ada testimoni yang cocok dengan "${searchQuery.trim()}". Coba kata kunci lain.`}
                action={
                  <button
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--bg-secondary)]"
                  >
                    <X className="w-4 h-4" />
                    Hapus Pencarian
                  </button>
                }
              />
            )}

          {/* Settings tab */}
          {activeTab === 'settings' && !loading && (
            <SettingsEditor settings={items as unknown as api.SiteSetting[]} canCrud={canCrud} />
          )}

          {/* Contact tab */}
          {activeTab === 'contact' && !loading && (
            <ContactEditor contactInfo={items[0]} canCrud={canCrud} onSave={fetchData} />
          )}

          {/* Staff org chart */}
          {activeTab === 'staff' && !loading && items.length > 0 && (
            <Card className="border-border shadow-sm bg-card p-6 mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Struktur Organisasi</h3>
              <p className="text-xs text-muted-foreground mb-4">Klik kartu untuk mengedit data staff. Posisi diatur lewat field “Atasan” dan “Urutan Tampilan” pada form edit.</p>
              <StaffOrgChart
                staff={items as unknown as import('@/app/lib/types').Staff[]}
                onSelect={(s) => {
                  const row = items.find((i) => i.id === s.id)
                  if (row && canCrud) void openEdit(row)
                }}
              />
            </Card>
          )}

          {/* Achievement Table */}
          {activeTab === 'achievements' && !loading && items.length > 0 && (
            <AchievementTable
              items={orderedItems}
              canCrud={canCrud}
              detailLoading={detailLoading}
              onEdit={(item) => void openEdit(item)}
              onDelete={handleDelete}
            />
          )}

          {/* Daftar Tautan Sosial (kartu, bukan tabel besar — data tipis:
              ikon + label + URL + 2 aksi). */}
          {activeTab === 'social' && !loading && visibleItems.length > 0 && (
            <SocialLinkList
              items={visibleItems}
              canCrud={canCrud}
              detailLoading={detailLoading}
              onEdit={(item) => void openEdit(item)}
              onDelete={handleDelete}
            />
          )}

          {/* Table Data */}
          {activeTab !== 'settings' && activeTab !== 'contact' && activeTab !== 'achievements' && activeTab !== 'social' && !loading && visibleItems.length > 0 && (
            <Card className="overflow-hidden rounded-2xl border-border/70 bg-white/70 shadow-[0_18px_50px_-30px_rgba(26,107,71,0.35)] backdrop-blur-sm">
              <div className="overflow-x-auto no-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/70 bg-[var(--bg-secondary)]/55 hover:bg-[var(--bg-secondary)]/55">
                      <TableHead className="h-12 px-5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em]">
                        {titleCol?.label}
                      </TableHead>
                      {detailCols.map((col) => (
                        <TableHead
                          key={col.label}
                          className={cn(
                            'h-12 px-5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em]',
                            col.variant === 'date' && 'text-right',
                          )}
                        >
                          {col.label}
                        </TableHead>
                      ))}
                      {canCrud && (
                        <TableHead className="h-12 w-[1%] px-5 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.14em] whitespace-nowrap">
                          Aksi
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleItems.map((item) => {
                      const titleValue = titleCol ? toText(titleCol.accessor(item)) : ''
                      const subtitleValue = subtitleCol ? toText(subtitleCol.accessor(item)) : ''
                      return (
                        <TableRow
                          key={item.id || item.key}
                          className="group border-b border-border/50 transition-all duration-200 hover:bg-[var(--accent-subtle)] hover:shadow-[inset_3px_0_0_0_var(--accent)]"
                        >
                          <TableCell className="max-w-[320px] px-5 py-3.5 align-middle">
                            <div className="flex items-center gap-3">
                              <RowThumb
                                url={
                                  typeof item.image === 'string' && item.image
                                    ? resolveImageSrc(item.image, api.API_BASE)
                                    : undefined
                                }
                                label={titleValue}
                                icon={activeTabDef.icon}
                                round={activeTab === 'staff' || activeTab === 'testimonials'}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--text)]" title={titleValue || undefined}>
                                  {titleValue || '—'}
                                </p>
                                {subtitleValue ? (
                                  <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]" title={subtitleValue}>
                                    {subtitleValue}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          {detailCols.map((col) => (
                            <TableCell
                              key={col.label}
                              className={cn('px-5 py-3.5 align-middle', col.variant === 'date' && 'text-right')}
                            >
                              <TableCellValue col={col} item={item} />
                            </TableCell>
                          ))}
                          {canCrud && (
                            <TableCell className="w-[1%] px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={detailLoading === item.id}
                                  onClick={() => void openEdit(item)}
                                  className="gap-1.5 rounded-full px-3 text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
                                >
                                  {detailLoading === item.id
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <Pencil className="h-3.5 w-3.5" />}
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    const { confirm } = await import(
                                      '@/app/components/ui/AdminConfirm'
                                    )
                                    // Sebut item yang akan dihapus supaya admin
                                    // tidak salah baris di tabel yang panjang.
                                    const itemTitle =
                                      toText(titleCol?.accessor(item)).trim() ||
                                      String(item.slug || item.name || '')
                                    const ok = await confirm({
                                      title: `Hapus ${activeTabDef.label}`,
                                      message: itemTitle
                                        ? `Yakin ingin menghapus "${itemTitle}"? Tindakan ini tidak bisa dibatalkan.`
                                        : 'Yakin ingin menghapus item ini? Tindakan ini tidak bisa dibatalkan.',
                                      confirmLabel: 'Ya, Hapus',
                                      cancelLabel: 'Batal',
                                      variant: 'danger',
                                    })
                                    if (ok) handleDelete(item)
                                  }}
                                  className="gap-1.5 rounded-full px-3 text-red-500 hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Hapus
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* Load more */}
          {activeTab !== 'settings' && activeTab !== 'contact' && !loading && hasMore && (
            <div className="mt-6 mb-2 flex justify-center">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="gap-2 rounded-full px-6"
              >
                <Loader2 className={`w-4 h-4 ${loadingMore ? 'animate-spin' : ''}`} />
                {loadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
              </Button>
            </div>
          )}
      </DashboardShell>

      {/* Form modal */}
      {formMode && activeTab === 'facilities' && (
        <FacilityFormDialog
          mode={formMode}
          activeTab={activeTab}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
        />
      )}
      {formMode && activeTab === 'staff' && (
        <StaffFormDialog
          mode={formMode}
          activeTab={activeTab}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
          staffList={items}
        />
      )}
      {formMode && activeTab === 'testimonials' && (
        <TestimonialFormDialog
          mode={formMode}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
        />
      )}
      {formMode && activeTab === 'gallery' && (
        <GalleryFormDialog
          mode={formMode}
          activeTab={activeTab}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
        />
      )}
      {formMode && activeTab === 'achievements' && (
        <AchievementFormDialog
          mode={formMode}
          activeTab={activeTab}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
        />
      )}
      {formMode && activeTab === 'social' && (
        <SocialFormDialog
          mode={formMode}
          activeTab={activeTab}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
        />
      )}
      {formMode &&
        activeTab !== 'facilities' &&
        activeTab !== 'staff' &&
        activeTab !== 'testimonials' &&
        activeTab !== 'gallery' &&
        activeTab !== 'achievements' &&
        activeTab !== 'social' && (
        <CrudFormDialog
          mode={formMode}
          activeTab={activeTab}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          onClose={closeForm}
          onSaved={fetchData}
        />
      )}

      {false && profileOpen && false}
      <CrossTabSync />
    </>
  )
}
