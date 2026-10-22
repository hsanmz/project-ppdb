import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui'
import {
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  PowerOff,
  Radio,
  KeyRound,
  Copy,
  Check,
} from 'lucide-react'
import { waGetQrRaw, waRequestPairingCode, type WAProxyStatus } from '../../api/client'
import type { LoginMethod } from './constants'

interface Props {
  session: WAProxyStatus | null
  sessionLoading: boolean
  actionLoading: boolean
  loginMethod: LoginMethod
  isReady: boolean
  isActive: boolean
  testPhone: string
  sendingTest: boolean
  statusLabel: string
  onMethodChange: (method: LoginMethod) => void
  onInit: () => void
  onDisconnect: () => void
  onRefreshStatus: (silent?: boolean) => void | Promise<void>
  onTestPhoneChange: (phone: string) => void
  onSendTest: () => void
}

function getStatusIndicator(statusLabel: string, isReady: boolean) {
  const s = statusLabel.toLowerCase()
  if (isReady || s === 'ready') {
    return {
      label: 'Terhubung (Ready)',
      badge: (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Terhubung
        </span>
      ),
    }
  }
  if (s === 'qr') {
    return {
      label: 'Menunggu Scan QR',
      badge: (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Menunggu Scan
        </span>
      ),
    }
  }
  if (s === 'authenticated' || s === 'initializing') {
    return {
      label: 'Inisialisasi',
      badge: (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
          <RefreshCw className="h-3 w-3 animate-spin text-sky-600" /> Menghubungkan
        </span>
      ),
    }
  }
  return {
    label: 'Terputus (Offline)',
    badge: (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
        <span className="h-2 w-2 rounded-full bg-rose-500" /> Terputus
      </span>
    ),
  }
}

function formatPairingCode(code?: string) {
  if (!code) return ''
  const clean = code.replace(/[^a-zA-Z0-9]/g, '')
  if (clean.length === 8) {
    return `${clean.slice(0, 4)} - ${clean.slice(4)}`
  }
  return code
}

export default function SessionCard(props: Props) {
  const [qr, setQr] = useState('')
  const [phone, setPhone] = useState('')
  const [pairingLoading, setPairingLoading] = useState(false)
  const [pairingError, setPairingError] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  useEffect(() => {
    let alive = true
    if (props.session?.status !== 'qr' || props.loginMethod !== 'qr') {
      return
    }
    const loadQr = async () => {
      try {
        const result = await waGetQrRaw()
        if (alive && result.success) setQr(result.data?.raw || '')
      } catch {
        if (alive) setQr('')
      }
    }
    void loadQr()
    const timer = window.setInterval(loadQr, 3000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [props.session?.status, props.loginMethod])

  async function requestCode() {
    if (!phone.trim()) {
      setPairingError('Masukkan nomor WhatsApp terlebih dahulu.')
      return
    }
    setPairingLoading(true)
    setPairingError('')
    try {
      await waRequestPairingCode(phone.trim())
      await props.onRefreshStatus(true)
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : 'Gagal meminta kode pairing.')
    } finally {
      setPairingLoading(false)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const { badge } = getStatusIndicator(props.statusLabel, props.isReady)

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-emerald-600" />
          <CardTitle className="text-sm font-semibold">Sesi WhatsApp</CardTitle>
          {badge}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void props.onRefreshStatus()}
          disabled={props.sessionLoading}
          className="h-7 px-2 text-xs gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${props.sessionLoading ? 'animate-spin' : ''}`} />
          Perbarui
        </Button>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Device & Connection Info */}
        {props.session?.phone && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-emerald-900">
                {props.session.pushName || 'WhatsApp Connected'}
              </p>
              <p className="font-mono text-emerald-700 mt-0.5">{props.session.phone}</p>
            </div>
            <Radio className="h-4 w-4 text-emerald-600 animate-pulse" />
          </div>
        )}

        {props.session?.lastError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <p>{props.session.lastError}</p>
          </div>
        )}

        {/* Not Ready / Disconnected State */}
        {!props.isReady && (
          <div className="space-y-4">
            {/* Login Method Toggle */}
            <div className="flex rounded-lg border p-1 bg-slate-50 gap-1">
              <Button
                type="button"
                size="sm"
                variant={props.loginMethod === 'qr' ? 'default' : 'ghost'}
                onClick={() => props.onMethodChange('qr')}
                className="flex-1 h-8 text-xs gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5" />
                Scan QR Code
              </Button>
              <Button
                type="button"
                size="sm"
                variant={props.loginMethod === 'phone' ? 'default' : 'ghost'}
                onClick={() => props.onMethodChange('phone')}
                className="flex-1 h-8 text-xs gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                Nomor HP (Pairing)
              </Button>
            </div>

            {/* QR Mode */}
            {props.loginMethod === 'qr' && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                {props.session?.status === 'qr' ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-200 inline-block">
                      {qr ? (
                        <QRCodeSVG value={qr} size={180} level="M" />
                      ) : (
                        <div className="h-44 w-44 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
                          <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" />
                          <span>Menyiapkan QR...</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                      Buka WhatsApp di ponsel &rarr; <b>Perangkat Tertaut</b> &rarr; <b>Tautkan Perangkat</b>, lalu pindai kode QR di atas.
                    </p>
                  </div>
                ) : (
                  <div className="py-4 space-y-3">
                    <p className="text-xs text-slate-500">
                      Sesi belum aktif. Klik tombol di bawah untuk memulai sesi WhatsApp.
                    </p>
                    <Button
                      onClick={props.onInit}
                      disabled={props.actionLoading}
                      className="gap-2 h-9 text-xs"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${props.actionLoading ? 'animate-spin' : ''}`} />
                      {props.actionLoading ? 'Memulai Sesi...' : 'Mulai Sesi WhatsApp'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Phone Pairing Code Mode */}
            {props.loginMethod === 'phone' && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <div>
                  <Label htmlFor="wa-pair-phone" className="text-xs font-semibold text-slate-800">
                    Nomor WhatsApp Pengirim
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                    Masukkan nomor HP WhatsApp (contoh: <code>081234567890</code> atau <code>6281234567890</code>).
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="wa-pair-phone"
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="6281234567890"
                      className="h-8.5 text-xs font-mono bg-white"
                      disabled={pairingLoading}
                    />
                    <Button
                      size="sm"
                      onClick={() => void requestCode()}
                      disabled={pairingLoading || !phone.trim() || props.isReady}
                      className="h-8.5 px-3 text-xs shrink-0 gap-1.5"
                    >
                      <KeyRound className={`h-3.5 w-3.5 ${pairingLoading ? 'animate-spin' : ''}`} />
                      {pairingLoading ? 'Meminta Kode...' : 'Minta Kode'}
                    </Button>
                  </div>
                </div>

                {props.session?.pairingCode && (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-center space-y-2.5 shadow-2xs">
                    <p className="text-xs font-semibold text-emerald-900">
                      Masukkan Kode Pairing Ini di WhatsApp Ponsel:
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="font-mono text-3xl font-extrabold tracking-widest text-emerald-800 select-all">
                        {formatPairingCode(props.session.pairingCode)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs bg-white border-emerald-300 hover:bg-emerald-100 text-emerald-800"
                        onClick={() => copyCode(props.session?.pairingCode || '')}
                      >
                        {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <div className="rounded-lg bg-white/90 p-2.5 text-left text-[11px] text-slate-700 space-y-1 border border-emerald-100">
                      <p className="font-semibold text-emerald-950">Langkah di Ponsel:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                        <li>Buka WhatsApp &rarr; <b>Perangkat Tertaut</b> &rarr; <b>Tautkan Perangkat</b></li>
                        <li>Ketuk opsi <b>Tautkan dengan nomor telepon saja</b> di bawah layar</li>
                        <li>Masukkan 8 karakter kode pairing di atas</li>
                      </ol>
                    </div>
                  </div>
                )}

                {pairingError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                    {pairingError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ready State: Testing & Disconnect */}
        {props.isReady && (
          <div className="space-y-4 pt-1">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                WhatsApp Siap Digunakan
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Gateway notifikasi aktif. Notifikasi PPDB dan sistem akan dikirimkan secara otomatis lewat nomor ini.
              </p>
            </div>

            {/* Test Form */}
            <div className="space-y-2 border-t pt-3">
              <Label className="text-xs font-medium">Uji Coba Kirim Pesan (Test)</Label>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  inputMode="numeric"
                  aria-label="Nomor untuk pesan uji coba"
                  value={props.testPhone}
                  onChange={(e) => props.onTestPhoneChange(e.target.value.replace(/\D/g, ''))}
                  placeholder="6281234567890"
                  className="h-8 text-xs font-mono"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={props.onSendTest}
                  disabled={props.sendingTest || !props.testPhone.trim()}
                  className="h-8 px-3 text-xs shrink-0 gap-1"
                >
                  <Send className="h-3 w-3" />
                  {props.sendingTest ? 'Mengirim...' : 'Kirim Tes'}
                </Button>
              </div>
            </div>

            {/* Disconnect Button */}
            <div className="pt-2 border-t flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={props.onDisconnect}
                disabled={props.actionLoading}
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
              >
                <PowerOff className="h-3.5 w-3.5" />
                Putuskan Sesi WhatsApp
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
