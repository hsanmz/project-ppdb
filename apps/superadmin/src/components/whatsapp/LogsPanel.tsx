import { useState } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui'
import {
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  PhoneCall,
  Inbox,
  Calendar,
  MessageSquare,
} from 'lucide-react'
import type { WALogEntry } from '../../api/client'
import { LOG_STATUSES, formatWhatsAppStatus } from './constants'

interface Props {
  logs: WALogEntry[]
  total: number
  totalPages: number
  page: number
  status: string
  loading: boolean
  onPage: (page: number) => void
  onStatus: (status: string) => void
  onRefresh: () => void
}

function getStatusBadge(status: string) {
  const s = (status || '').toLowerCase()
  if (s === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Terkirim
      </span>
    )
  }
  if (s === 'queued') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
        <Clock className="h-3 w-3" /> Antrean
      </span>
    )
  }
  if (s === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">
        <AlertCircle className="h-3 w-3" /> Gagal
      </span>
    )
  }
  if (s === 'invalid_number') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <PhoneCall className="h-3 w-3" /> No. Tdk Valid
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
      {formatWhatsAppStatus(status)}
    </span>
  )
}

function formatLogDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export default function LogsPanel({
  logs,
  total,
  totalPages,
  page,
  status,
  loading,
  onPage,
  onStatus,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState('')
  const [selectedLog, setSelectedLog] = useState<WALogEntry | null>(null)

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (log.recipient_name && log.recipient_name.toLowerCase().includes(q)) ||
      (log.recipient_phone && log.recipient_phone.toLowerCase().includes(q)) ||
      (log.event_key && log.event_key.toLowerCase().includes(q)) ||
      (log.body_sent && log.body_sent.toLowerCase().includes(q))
    )
  })

  return (
    <>
      <Card className="flex flex-col h-[calc(100vh-120px)] min-h-[580px] shadow-sm border-border overflow-hidden">
        {/* Sticky Card Header */}
        <CardHeader className="p-4 pb-3 border-b bg-card shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Riwayat Pengiriman
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                {total} pesan
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 gap-1 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Perbarui
            </Button>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari penerima / no HP / jenis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <select
              aria-label="Filter status pengiriman"
              value={status}
              onChange={(e) => onStatus(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-36 shrink-0"
            >
              {LOG_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item ? formatWhatsAppStatus(item) : 'Semua status'}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        {/* Scrollable Body - Scrolls internally without moving outer page */}
        <CardContent className="flex-1 overflow-y-auto p-0 min-h-0 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
              <span>Memuat riwayat pengiriman...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-muted-foreground text-sm p-4 text-center">
              <Inbox className="h-8 w-8 text-slate-300 mb-2" />
              <p className="font-medium text-slate-600">Belum ada riwayat pesan</p>
              <p className="text-xs text-slate-400 mt-1">
                {status || search ? 'Tidak ada pesan yang cocok dengan filter saat ini.' : 'Pesan yang dikirim sistem akan muncul di sini.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-3.5 hover:bg-white transition-colors cursor-pointer flex flex-col gap-1.5 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-xs text-foreground truncate">
                        {log.recipient_name || 'Tanpa Nama'}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                        {log.recipient_phone}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {getStatusBadge(log.status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLog(log)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-700">
                      {log.event_key}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="h-3 w-3" />
                      {formatLogDate(log.sent_at || log.created_at)}
                    </span>
                  </div>

                  {log.body_sent && (
                    <p className="text-[11px] text-slate-600 line-clamp-2 font-mono bg-white/60 rounded p-1.5 border border-slate-100">
                      {log.body_sent}
                    </p>
                  )}

                  {log.error_message && (
                    <p className="text-[10px] text-rose-600 truncate bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                      Error: {log.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Sticky Card Footer with Pagination */}
        <div className="p-3 border-t bg-card shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            disabled={page <= 1 || loading}
            onClick={() => onPage(page - 1)}
          >
            Sebelumnya
          </Button>

          <span className="font-medium text-slate-600">
            Halaman {page} dari {totalPages}
          </span>

          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs"
            disabled={page >= totalPages || loading}
            onClick={() => onPage(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </Card>

      {/* Modal Detail Log Pesan */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              Detail Riwayat Pengiriman
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-slate-50 p-3">
                <div>
                  <p className="text-muted-foreground text-[11px]">Penerima</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {selectedLog.recipient_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Nomor WhatsApp</p>
                  <p className="font-mono font-medium text-foreground text-sm mt-0.5">
                    {selectedLog.recipient_phone}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Jenis Pesan (Event)</p>
                  <p className="font-mono font-medium mt-1 text-slate-800">
                    {selectedLog.event_key}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Waktu Dibuat</p>
                  <p className="mt-0.5">{formatLogDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Waktu Terkirim</p>
                  <p className="mt-0.5">{formatLogDate(selectedLog.sent_at)}</p>
                </div>
                {selectedLog.wa_message_id && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-[11px]">WhatsApp Message ID</p>
                    <p className="font-mono text-[11px] truncate mt-0.5 text-slate-600">
                      {selectedLog.wa_message_id}
                    </p>
                  </div>
                )}
                {selectedLog.error_message && (
                  <div className="col-span-2 rounded border border-rose-200 bg-rose-50 p-2 text-rose-700">
                    <p className="font-semibold text-[11px]">Pesan Error:</p>
                    <p className="mt-0.5 font-mono text-[11px]">{selectedLog.error_message}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="font-medium text-slate-700 mb-1.5">Isi Pesan Terkirim:</p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-white p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap text-slate-800">
                  {selectedLog.body_sent || '— (Kosong)'}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
