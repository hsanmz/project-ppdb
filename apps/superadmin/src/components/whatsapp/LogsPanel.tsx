import { useState } from 'react'
import {
  Button,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  PhoneCall,
  Inbox,
  Calendar,
  MessageSquare,
  Smartphone,
  ArrowRight,
  Copy,
  Check,
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
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-2xs">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Terkirim
      </span>
    )
  }
  if (s === 'queued') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 shadow-2xs">
        <Clock className="h-3 w-3 text-sky-600" /> Antrean
      </span>
    )
  }
  if (s === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 shadow-2xs">
        <AlertCircle className="h-3 w-3 text-rose-600" /> Gagal
      </span>
    )
  }
  if (s === 'invalid_number') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 shadow-2xs">
        <PhoneCall className="h-3 w-3 text-amber-600" /> No. Tdk Valid
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
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
  const [copiedId, setCopiedId] = useState(false)

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

  function copyText(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <>
      {/*
        Container Riwayat Pengiriman Nempel di Kanan tanpa bungkus Card/Container besar.
        Memiliki tinggi pas setinggi viewport dan scroll mandiri di dalam list.
      */}
      <div className="flex flex-col h-[calc(100vh-120px)] min-h-[580px]">
        {/* Header Panel Langsung Nempel */}
        <div className="pb-3 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2 tracking-tight">
                <MessageSquare className="h-4.5 w-4.5 text-emerald-600" />
                Riwayat Pengiriman
              </h2>
              <Badge variant="secondary" className="text-xs font-semibold px-2">
                {total} pesan
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 gap-1.5 text-xs shadow-2xs border-slate-200 hover:bg-slate-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              Perbarui
            </Button>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari penerima / no HP / jenis pesan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8.5 text-xs bg-white border-slate-200"
              />
            </div>
            <select
              aria-label="Filter status pengiriman"
              value={status}
              onChange={(e) => onStatus(e.target.value)}
              className="h-8.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:w-36 shrink-0 font-medium text-slate-700"
            >
              {LOG_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item ? formatWhatsAppStatus(item) : 'Semua Status'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/*
          Area Block List - Masing-masing riwayat berupa block card mandiri,
          scrollable tanpa menggeser scrollbar halaman utama luar
        */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1.5 space-y-3 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-56 text-muted-foreground text-sm gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="text-xs">Memuat riwayat pengiriman...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-muted-foreground text-sm p-6 text-center rounded-xl border border-dashed border-slate-200 bg-white/60">
              <Inbox className="h-8 w-8 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Belum Ada Riwayat Pesan</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {status || search
                  ? 'Tidak ada riwayat pesan yang sesuai dengan filter pencarian.'
                  : 'Seluruh notifikasi WhatsApp yang terkirim dari sistem akan tercatat di sini.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group space-y-2.5"
              >
                {/* Baris Atas Block: Status + Event Badge + Tanggal Waktu */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(log.status)}
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-700 border border-slate-200/50">
                      {log.event_key}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0 font-medium">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {formatLogDate(log.sent_at || log.created_at)}
                  </span>
                </div>

                {/* Baris Tengah Block: Penerima + No HP */}
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-emerald-700 transition-colors">
                    {log.recipient_name || 'Tanpa Nama'}
                  </h3>
                  <div className="text-xs font-mono font-medium text-slate-600 flex items-center gap-1 shrink-0 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    <Smartphone className="h-3 w-3 text-emerald-600" />
                    {log.recipient_phone}
                  </div>
                </div>

                {/* Cuplikan Pesan dalam Block Terpisah */}
                {log.body_sent && (
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-700 font-sans leading-relaxed line-clamp-2">
                    {log.body_sent}
                  </div>
                )}

                {/* Box Alert Error jika Pengiriman Gagal */}
                {log.error_message && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-rose-500" />
                    <span className="truncate font-mono text-[11px]">{log.error_message}</span>
                  </div>
                )}

                {/* Baris Bawah Block: Petunjuk Klik & Tombol Detail */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-slate-100">
                  <span className="text-slate-400 text-[10.5px]">Klik block untuk melihat isi pesan</span>
                  <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-[11px]">
                    Detail Pesan <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Navigasi Paginasi Menempel di Bawah */}
        <div className="pt-3 mt-1 border-t border-slate-200 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <Button
            size="sm"
            variant="outline"
            className="h-7.5 px-3 text-xs shadow-2xs border-slate-200"
            disabled={page <= 1 || loading}
            onClick={() => onPage(page - 1)}
          >
            Sebelumnya
          </Button>

          <span className="font-semibold text-slate-700">
            Halaman {page} dari {totalPages}
          </span>

          <Button
            size="sm"
            variant="outline"
            className="h-7.5 px-3 text-xs shadow-2xs border-slate-200"
            disabled={page >= totalPages || loading}
            onClick={() => onPage(page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      {/* Modal Detail Log Pesan */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <MessageSquare className="h-4.5 w-4.5 text-emerald-600" />
              Detail Riwayat Pesan WhatsApp
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div>
                  <p className="text-muted-foreground text-[11px]">Nama Penerima</p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">
                    {selectedLog.recipient_name || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Nomor WhatsApp</p>
                  <p className="font-mono font-semibold text-foreground text-sm mt-0.5">
                    {selectedLog.recipient_phone}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Status Pengiriman</p>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Jenis Pesan (Event)</p>
                  <p className="font-mono font-semibold mt-1 text-slate-800">
                    {selectedLog.event_key}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Waktu Dibuat</p>
                  <p className="mt-0.5 font-medium">{formatLogDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px]">Waktu Terkirim</p>
                  <p className="mt-0.5 font-medium">{formatLogDate(selectedLog.sent_at)}</p>
                </div>
                {selectedLog.wa_message_id && (
                  <div className="col-span-2 flex items-center justify-between rounded-lg bg-white p-2 border border-slate-200">
                    <div className="min-w-0 pr-2">
                      <p className="text-muted-foreground text-[10px]">WhatsApp Message ID</p>
                      <p className="font-mono text-[11px] truncate text-slate-700">
                        {selectedLog.wa_message_id}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => copyText(selectedLog.wa_message_id!)}
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
                {selectedLog.error_message && (
                  <div className="col-span-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-700">
                    <p className="font-semibold text-[11px]">Penyebab Error / Gagal:</p>
                    <p className="mt-0.5 font-mono text-[11px]">{selectedLog.error_message}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>Isi Pesan Lengkap:</span>
                  {selectedLog.body_sent && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[10px] text-slate-500 gap-1"
                      onClick={() => copyText(selectedLog.body_sent)}
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      Salin Pesan
                    </Button>
                  )}
                </p>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 font-sans text-xs leading-relaxed whitespace-pre-wrap text-slate-800 shadow-2xs">
                  {selectedLog.body_sent || '— (Isi pesan tidak tercatat)'}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
