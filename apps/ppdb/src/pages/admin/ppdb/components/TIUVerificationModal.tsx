import { useEffect, useState, useRef, useTransition } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Wrench,
  Check,
  Copy,
} from 'lucide-react'
import { apiFetch } from '@/api/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
} from '@/components/ui'

export interface TIUCheckItem {
  key: string
  status: 'passed' | 'warn' | 'failed'
  label: string
  detail: string
  fix?: string | null
}

export interface TIUVerificationResponse {
  overall: 'passed' | 'warning' | 'failed'
  checks: TIUCheckItem[]
  summary: {
    passed: number
    warn: number
    failed: number
  }
  recommendations: string[]
}

export interface TIUVerificationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: {
    googleFormUrl: string
    durationMinutes: number | string
    webhookSecret: string
  }
  onFixField?: (field: 'url' | 'duration' | 'secret') => void
  onSave?: () => void
}

export default function TIUVerificationModal({
  open,
  onOpenChange,
  formData,
  onFixField,
  onSave,
}: TIUVerificationModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TIUVerificationResponse | null>(null)
  const [revealedCount, setRevealedCount] = useState(0)
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [, startTransition] = useTransition()

  const runVerification = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setLoading(true)
    setError(null)
    setRevealedCount(0)

    try {
      const res = await apiFetch<TIUVerificationResponse>('/ppdb/tiu-settings/verify', {
        method: 'POST',
        body: JSON.stringify({
          google_form_url: formData.googleFormUrl.trim() || undefined,
          duration_minutes: formData.durationMinutes ? Number(formData.durationMinutes) : undefined,
          webhook_secret: formData.webhookSecret.trim() || undefined,
        }),
      })

      setData(res)

      // Auto-expand warning and failed items
      const initialExpanded: Record<string, boolean> = {}
      res.checks.forEach(c => {
        if (c.status === 'failed' || c.status === 'warn') {
          initialExpanded[c.key] = true
        }
      })
      setExpandedKeys(initialExpanded)

      // Progressive stepped animation for the checklist
      let current = 0
      const total = res.checks.length
      intervalRef.current = setInterval(() => {
        current += 1
        setRevealedCount(current)
        if (current >= total) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setLoading(false)
        }
      }, 160)
    } catch (err: any) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLoading(false)
      setError(err?.message || 'Gagal menjalankan verifikasi sistem.')
    }
  }

  useEffect(() => {
    if (open) {
      runVerification()
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setData(null)
      setRevealedCount(0)
      setError(null)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [open])

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  const isAnimationDone = !loading && data && revealedCount >= (data.checks.length || 0)

  // Map check key to form field
  const getFieldKey = (checkKey: string): 'url' | 'duration' | 'secret' | null => {
    if (checkKey === 'url_format' || checkKey === 'seb_readiness') return 'url'
    if (checkKey === 'duration_valid') return 'duration'
    if (checkKey === 'secret_format' || checkKey === 'secret_consistency' || checkKey === 'auth_probe') return 'secret'
    return null
  }

  const handleFix = (checkKey: string) => {
    const field = getFieldKey(checkKey)
    if (field && onFixField) {
      onOpenChange(false)
      setTimeout(() => onFixField(field), 150)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 rounded-xl bg-white shadow-lg border-slate-200">
        {/* Modal Header */}
        <DialogHeader className="px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Verifikasi Koneksi & Kesiapan TIU
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pengecekan otomatis konfigurasi Google Form, webhook, dan alur SEB.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {loading && (
                <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-semibold text-xs animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Memeriksa ({revealedCount}/{data?.checks.length || 10})
                </Badge>
              )}
              {isAnimationDone && data?.overall === 'passed' && (
                <Badge variant="success" className="gap-1.5 px-3 py-1 font-semibold text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Siap Digunakan
                </Badge>
              )}
              {isAnimationDone && data?.overall === 'warning' && (
                <Badge variant="warning" className="gap-1.5 px-3 py-1 font-semibold text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Siap dengan Catatan
                </Badge>
              )}
              {isAnimationDone && data?.overall === 'failed' && (
                <Badge variant="destructive" className="gap-1.5 px-3 py-1 font-semibold text-xs">
                  <XCircle className="h-3.5 w-3.5" />
                  Perlu Perbaikan
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col md:flex-row">
          {/* ── SISI KIRI: Animasi, Hero Status & Rekomendasi (w-full md:w-[320px] lg:w-[350px]) ── */}
          <div className="w-full md:w-[320px] lg:w-[350px] shrink-0 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Hero Status Box */}
              <div
                className={`p-4 rounded-2xl border transition-all text-center relative overflow-hidden ${
                  loading
                    ? 'bg-blue-50/70 border-blue-200/80 text-blue-900'
                    : isAnimationDone && data?.overall === 'passed'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : isAnimationDone && data?.overall === 'warning'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : isAnimationDone && data?.overall === 'failed'
                          ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                          : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                {/* Visual Icon / Radar Animation */}
                <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-xs transition-transform">
                  {loading ? (
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-12 h-12 rounded-full bg-blue-400/20 animate-ping" />
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                      </div>
                    </div>
                  ) : isAnimationDone && data?.overall === 'passed' ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  ) : isAnimationDone && data?.overall === 'warning' ? (
                    <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                  ) : isAnimationDone && data?.overall === 'failed' ? (
                    <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200">
                      <ShieldX className="h-6 w-6" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
                      <Zap className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <h3 className="font-heading font-bold text-sm sm:text-base">
                  {loading
                    ? 'Sedang Memeriksa Sistem...'
                    : isAnimationDone && data?.overall === 'passed'
                      ? 'Sistem Siap Digunakan'
                      : isAnimationDone && data?.overall === 'warning'
                        ? 'Siap dengan Catatan'
                        : isAnimationDone && data?.overall === 'failed'
                          ? 'Perlu Perbaikan'
                          : 'Memulai Verifikasi'}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {loading
                    ? `Menjalankan uji koneksi langkah ke-${Math.min(revealedCount + 1, data?.checks.length || 10)}...`
                    : isAnimationDone && data?.overall === 'passed'
                      ? 'Semua 10 parameter lolos pengujian. Alur SEB dan penerimaan skor aman.'
                      : isAnimationDone && data?.overall === 'warning'
                        ? 'Sistem siap diuji, namun perhatikan saran perbaikan di samping.'
                        : isAnimationDone && data?.overall === 'failed'
                          ? 'Ada parameter yang belum valid atau belum disimpan ke database.'
                          : 'Menyiapkan parameter verifikasi...'}
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      loading
                        ? 'bg-blue-600'
                        : data?.overall === 'passed'
                          ? 'bg-emerald-600'
                          : data?.overall === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-rose-600'
                    }`}
                    style={{
                      width: `${Math.min(100, (revealedCount / (data?.checks.length || 10)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl border border-emerald-100 bg-white text-center">
                  <div className="text-emerald-700 font-bold text-base">
                    {data?.summary.passed ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">Lolos</div>
                </div>
                <div className="p-2.5 rounded-xl border border-amber-100 bg-white text-center">
                  <div className="text-amber-700 font-bold text-base">
                    {data?.summary.warn ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">Catatan</div>
                </div>
                <div className="p-2.5 rounded-xl border border-rose-100 bg-white text-center">
                  <div className="text-rose-700 font-bold text-base">
                    {data?.summary.failed ?? 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">Gagal</div>
                </div>
              </div>

              {/* Parameter Ringkas */}
              <div className="p-3 rounded-xl border border-slate-200/80 bg-white space-y-2 text-xs">
                <div className="font-semibold text-slate-800 text-[11px] pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>Parameter Uji</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Konteks Uji</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Google Form:</span>
                  <span className="font-mono text-slate-700 max-w-[170px] truncate" title={formData.googleFormUrl}>
                    {formData.googleFormUrl ? formData.googleFormUrl.replace(/^https?:\/\//, '') : '(Belum diisi)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Durasi:</span>
                  <span className="font-semibold text-slate-800">
                    {formData.durationMinutes ? `${formData.durationMinutes} menit` : '(Kosong)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Secret:</span>
                  <span className="font-mono text-slate-700">
                    {formData.webhookSecret ? `${formData.webhookSecret.length} Karakter` : '(Gunakan tersimpan)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rekomendasi Ringkas */}
            {isAnimationDone && data?.recommendations && data.recommendations.length > 0 && (
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs">
                <span className="font-semibold text-slate-800 text-[11px] block text-left">
                  Rekomendasi Tindakan:
                </span>
                <ul className="space-y-1 text-[11px] text-slate-600 text-left list-disc list-inside">
                  {data.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="leading-snug">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── SISI KANAN: 10 Langkah Checklist Interaktif ── */}
          <div className="flex-1 p-4 sm:p-6 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                10 Checklist Pengecekan Sistem
              </span>
              {loading && (
                <button
                  type="button"
                  onClick={() => {
                    if (intervalRef.current) clearInterval(intervalRef.current)
                    if (data) setRevealedCount(data.checks.length)
                    setLoading(false)
                  }}
                  className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Lewati Animasi
                </button>
              )}
            </div>

            {error && (
              <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs flex items-start gap-2.5">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Gagal Menjalankan Verifikasi</strong>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Checklist Items */}
            <div className="space-y-2.5">
              {(data?.checks || []).map((check, index) => {
                const isRevealed = index < revealedCount
                const isInProgress = loading && index === revealedCount
                const isPending = !isRevealed && !isInProgress
                const isExpanded = !!expandedKeys[check.key]

                return (
                  <div
                    key={check.key}
                    className={`rounded-xl border transition-all text-xs overflow-hidden ${
                      isPending
                        ? 'bg-slate-50/50 border-slate-100 opacity-50'
                        : isInProgress
                          ? 'bg-blue-50/50 border-blue-200 shadow-xs ring-1 ring-blue-100'
                          : check.status === 'passed'
                            ? 'bg-white border-slate-200 hover:border-slate-300'
                            : check.status === 'warn'
                              ? 'bg-amber-50/40 border-amber-200'
                              : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    {/* Header Row */}
                    <div
                      onClick={() => !isPending && toggleExpand(check.key)}
                      className={`p-3 flex items-center justify-between gap-3 ${
                        !isPending ? 'cursor-pointer hover:bg-slate-50/50' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Status Icon */}
                        <div className="shrink-0">
                          {isPending ? (
                            <div className="w-5 h-5 rounded-full border border-slate-300 text-slate-400 text-[10px] flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                          ) : isInProgress ? (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          ) : check.status === 'passed' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : check.status === 'warn' ? (
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                        </div>

                        {/* Title & Short Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                isPending
                                  ? 'text-slate-400'
                                  : check.status === 'passed'
                                    ? 'text-slate-800 line-through decoration-slate-300'
                                    : check.status === 'warn'
                                      ? 'text-amber-900 font-bold'
                                      : 'text-rose-900 font-bold'
                              }`}
                            >
                              {index + 1}. {check.label}
                            </span>
                            {isRevealed && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                                  check.status === 'passed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : check.status === 'warn'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {check.status === 'passed'
                                  ? 'Lolos'
                                  : check.status === 'warn'
                                    ? 'Perhatian'
                                    : 'Gagal'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {isInProgress ? 'Memvalidasi...' : isRevealed ? check.detail : 'Menunggu antrean...'}
                          </p>
                        </div>
                      </div>

                      {/* Expand Chevron */}
                      {isRevealed && (
                        <div className="text-slate-400 shrink-0">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      )}
                    </div>

                    {/* Expanded Detail Box */}
                    {isRevealed && isExpanded && (
                      <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2 text-[11px] bg-slate-50/30">
                        <div className="text-slate-700 leading-relaxed">
                          <strong>Keterangan:</strong> {check.detail}
                        </div>

                        {/* Fix Suggestion Box */}
                        {check.fix && (
                          <div
                            className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              check.status === 'warn'
                                ? 'bg-amber-50 border-amber-200 text-amber-900'
                                : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <strong className="block text-[10px] uppercase font-bold tracking-wider">
                                Saran Perbaikan:
                              </strong>
                              <span className="leading-relaxed">{check.fix}</span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                              {getFieldKey(check.key) && onFixField && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFix(check.key)}
                                  className="h-7 px-2.5 text-[10px] font-semibold gap-1 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs"
                                >
                                  <Wrench className="h-3 w-3" />
                                  Perbaiki di Form
                                </Button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCopy(check.fix || '', check.key)}
                                className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                                title="Salin Saran"
                              >
                                {copiedKey === check.key ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-muted-foreground">
            {isAnimationDone && data?.overall === 'passed' && (
              <span className="text-emerald-700 font-medium">
                Koneksi TIU & SEB terverifikasi aktif dan aman.
              </span>
            )}
            {isAnimationDone && data?.overall !== 'passed' && (
              <span className="text-slate-600">
                Lakukan perbaikan sesuai saran di atas, lalu uji ulang.
              </span>
            )}
            {loading && <span>Pemeriksaan sedang berlangsung, mohon tunggu...</span>}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {isAnimationDone && data?.overall !== 'passed' && onSave && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onSave()
                  setTimeout(() => runVerification(), 400)
                }}
                className="text-xs h-8 px-3 font-semibold gap-1.5 cursor-pointer"
              >
                Simpan & Uji Ulang
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runVerification}
              disabled={loading}
              className="text-xs h-8 px-3 font-semibold gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Uji Ulang
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 px-4 font-semibold cursor-pointer"
            >
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
