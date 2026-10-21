import { useState, useEffect, useCallback } from 'react'
import {
  Activity,
  History,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  Globe,
  Inbox,
  FileCode,
} from 'lucide-react'
import {
  Badge,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import * as api from '../../api/client'
import { cn } from '@/lib/utils'

interface AuditRow {
  id: string
  user_id?: string | null
  user_username?: string | null
  action: string
  entity_type: string
  entity_id?: string | null
  changes?: Record<string, any> | null
  ip_address?: string | null
  created_at: string
}

interface Props {
  userId?: string
  username?: string
  isEdit: boolean
}

function formatDateTime(value: string) {
  if (!value) return '—'
  const v = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}

function getActionBadge(action: string) {
  const a = (action || '').toLowerCase()
  if (['delete', 'destroy', 'deactivate', 'remove'].some((k) => a.includes(k))) {
    return (
      <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
        {action.toUpperCase()}
      </span>
    )
  }
  if (['create', 'add', 'register', 'activate', 'approve'].some((k) => a.includes(k))) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        {action.toUpperCase()}
      </span>
    )
  }
  if (['update', 'edit', 'patch', 'modify'].some((k) => a.includes(k))) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        {action.toUpperCase()}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700">
      {action.toUpperCase()}
    </span>
  )
}

export default function UserActivityPanel({ userId, username, isEdit }: Props) {
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [availableActions, setAvailableActions] = useState<string[]>([])
  const [selectedLog, setSelectedLog] = useState<AuditRow | null>(null)

  const perPage = 10

  const fetchActivities = useCallback(async () => {
    if (!isEdit || !userId) {
      setLogs([])
      setTotal(0)
      return
    }
    setLoading(true)
    try {
      const params: Record<string, any> = {
        user_id: userId,
        page,
        per_page: perPage,
      }
      if (search.trim()) params.search = search.trim()
      if (actionFilter) params.action = actionFilter

      const res = await api.getAuditLogs(params)
      setLogs(res?.data || [])
      setTotal(res?.total ?? 0)
      if (res?.actions && Array.isArray(res.actions)) {
        setAvailableActions(res.actions)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [isEdit, userId, page, search, actionFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchActivities()
  }, [fetchActivities])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="space-y-4">
      {/* Header Panel (Ikut Ter-scroll Bersama Konten Kolom Kanan) */}
      <div className="pb-3 border-b border-border/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <History className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-xs sm:text-sm text-foreground flex items-center gap-2 leading-tight truncate">
              Aktifitas Pengguna
              {isEdit && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium shrink-0">
                  {total}
                </Badge>
              )}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate whitespace-nowrap">
              Log aktivitas sistem.
            </p>
          </div>
        </div>
        {isEdit && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={fetchActivities}
            disabled={loading}
            className="h-7 w-7 rounded-lg border-border/80 hover:bg-muted/50 shrink-0"
            title="Perbarui log aktivitas"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin text-primary')} />
          </Button>
        )}
      </div>

      {/* Konten Aktivitas */}
      {!isEdit ? (
        <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border bg-muted/20 min-h-[220px]">
          <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="font-semibold text-foreground text-xs">Belum Ada Riwayat Aktivitas</p>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-xs leading-relaxed">
            Riwayat aksi dan perubahan data akan otomatis tercatat di sini setelah akun pengguna
            dibuat dan beraktivitas di sistem.
          </p>
        </div>
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari aktivitas..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-8 h-8.5 text-xs bg-background border-border rounded-lg"
              />
            </div>
            {availableActions.length > 0 && (
              <select
                aria-label="Filter jenis aksi"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  setPage(1)
                }}
                className="h-8.5 rounded-lg border border-border bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary sm:w-28 shrink-0 text-foreground"
              >
                <option value="">Semua Aksi</option>
                {availableActions.map((act) => (
                  <option key={act} value={act}>
                    {act.toUpperCase()}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Feed Riwayat Aktivitas — Clean Divider List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              <span>Memuat aktivitas pengguna...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-border bg-muted/10 min-h-[180px]">
              <Inbox className="h-7 w-7 text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground text-xs">Tidak Ada Aktivitas Ditemukan</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                {search || actionFilter
                  ? 'Tidak ada rekaman yang sesuai dengan kata kunci filter.'
                  : 'Pengguna ini belum memiliki riwayat aktivitas yang tercatat.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border divide-y divide-border/60 overflow-hidden bg-background">
              {logs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-3 transition-colors hover:bg-muted/30 cursor-pointer space-y-2 group"
                >
                  {/* Baris Atas: Badge Aksi + Entity + Waktu */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className="font-mono text-[10px] font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">
                        {log.entity_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0 font-medium">
                      <Calendar className="h-2.5 w-2.5 text-muted-foreground/70" />
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>

                  {/* Deskripsi Aksi */}
                  <p className="text-xs text-foreground font-medium line-clamp-2 leading-snug">
                    <span className="font-semibold">{log.user_username || username || 'User'}</span>{' '}
                    melakukan <span className="font-semibold text-primary">{log.action}</span> pada{' '}
                    <span className="font-semibold">{log.entity_type}</span>
                    {log.entity_id && (
                      <span className="font-mono text-[10px] text-muted-foreground ml-1">
                        #{log.entity_id.slice(0, 8)}
                      </span>
                    )}
                  </p>

                  {/* Baris Bawah: IP & Trigger Detail */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10.5px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-mono text-[10px]">
                      <Globe className="h-3 w-3 text-muted-foreground/60" />
                      {log.ip_address || '127.0.0.1'}
                    </span>
                    <span className="text-primary font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[10.5px]">
                      Detail <Eye className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginasi Riwayat */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border/70 text-[11px] text-muted-foreground">
              <span>
                Hal {page} / {totalPages} ({total})
              </span>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(page - 1)}
                  className="h-6.5 px-2 text-[11px] border-border"
                >
                  Sebelumnya
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(page + 1)}
                  className="h-6.5 px-2 text-[11px] border-border"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Detail Perubahan Log */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold">
              <Activity className="h-4 w-4 text-primary" />
              Detail Aktivitas Pengguna
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border bg-muted/30 p-3.5">
                <div className="col-span-2">
                  <p className="text-muted-foreground text-[10.5px]">Deskripsi Tindakan</p>
                  <p className="font-medium text-foreground text-xs mt-0.5">
                    <span className="font-semibold text-primary">{selectedLog.action.toUpperCase()}</span>{' '}
                    pada entitas <span className="font-semibold">{selectedLog.entity_type}</span>
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10.5px]">Username Pengguna</p>
                  <p className="font-semibold text-foreground text-xs mt-0.5">
                    {selectedLog.user_username || username || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10.5px]">Waktu Eksekusi</p>
                  <p className="font-medium text-foreground text-xs mt-0.5">
                    {formatDateTime(selectedLog.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10.5px]">IP Address</p>
                  <p className="font-mono font-medium text-foreground text-xs mt-0.5">
                    {selectedLog.ip_address || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10.5px]">Entity ID</p>
                  <p className="font-mono font-medium text-foreground text-xs mt-0.5 truncate">
                    {selectedLog.entity_id || '—'}
                  </p>
                </div>
              </div>

              {selectedLog.changes ? (
                <div>
                  <p className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-primary" />
                    Perubahan Data (JSON):
                  </p>
                  <pre className="max-h-60 overflow-auto rounded-xl border border-border bg-slate-900 p-3 text-[11px] font-mono text-emerald-400 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-muted-foreground text-[11px]">
                  Tidak ada rekaman rincian perubahan payload data (changes) untuk aksi ini.
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
