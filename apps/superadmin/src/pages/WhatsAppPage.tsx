import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, Radio, Clock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  waGetLogs,
  waGetQueueStats,
  waGetStatus,
  waInitSession,
  waLogoutSession,
  waSendTest,
  waCancelPairing,
  type WALogEntry,
  type WAProxyStatus,
  type WAQueueStats,
} from '../api/client'
import PageHero from '../components/PageHero'
import SessionCard from '../components/whatsapp/SessionCard'
import QueueStats from '../components/whatsapp/QueueStats'
import LogsPanel from '../components/whatsapp/LogsPanel'
import type { LoginMethod } from '../components/whatsapp/constants'

export default function WhatsAppPage() {
  const [session, setSession] = useState<WAProxyStatus | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [queueStats, setQueueStats] = useState<WAQueueStats | null>(null)

  const [logs, setLogs] = useState<WALogEntry[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logsPage, setLogsPage] = useState(1)
  const [logsStatus, setLogsStatus] = useState('')
  const [logsLoading, setLogsLoading] = useState(true)

  // Form test (hanya saat READY)
  const [testPhone, setTestPhone] = useState('')
  const [sendingTest, setSendingTest] = useState(false)

  // Opsi login: scan QR (default) atau nomor HP + pairing code
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('qr')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initPollRef = useRef<number[]>([])

  // ── Fetch helpers ──────────────────────────────────────────────────────

  const fetchSession = useCallback(async (silent = false) => {
    if (!silent) setSessionLoading(true)
    try {
      const data = await waGetStatus()
      setSession(data)
    } catch {
      setSession(null)
    } finally {
      if (!silent) setSessionLoading(false)
    }
  }, [])

  const fetchQueueStats = useCallback(async () => {
    try {
      const res = await waGetQueueStats()
      if (res?.success && res?.data) setQueueStats(res.data)
    } catch {
      /* ignore */
    }
  }, [])

  const fetchLogs = useCallback(async (page = 1, status = '') => {
    setLogsLoading(true)
    try {
      const res = await waGetLogs({ page, perPage: 15, status: status || undefined })
      if (res?.success) {
        setLogs(res.data || [])
        setLogsTotal(res.total || 0)
        setLogsTotalPages(res.totalPages || 1)
      }
    } catch {
      /* ignore */
    } finally {
      setLogsLoading(false)
    }
  }, [])

  // ── Initial load + polling 8 detik ─────────────────────────────────────

  useEffect(() => {
    fetchSession()
    fetchQueueStats()
    fetchLogs(1, '')

    pollRef.current = setInterval(() => {
      fetchSession(true)
      fetchQueueStats()
    }, 8_000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      initPollRef.current.forEach(clearTimeout)
    }
  }, [fetchSession, fetchQueueStats, fetchLogs])

  useEffect(() => {
    fetchLogs(logsPage, logsStatus)
  }, [logsPage, logsStatus, fetchLogs])

  // ── Actions ────────────────────────────────────────────────────────────

  // Kembali ke mode 'phone' jika masih ada pairing code aktif dari sesi lalu
  useEffect(() => {
    if (session?.status === 'qr' && session?.pairingCode && loginMethod === 'qr') {
      setLoginMethod('phone')
    }
  }, [session?.status, session?.pairingCode, loginMethod])

  async function handleInit() {
    initPollRef.current.forEach(clearTimeout)
    initPollRef.current = []
    setActionLoading(true)
    setActionMsg(null)
    try {
      const res = await waInitSession()
      setActionMsg({
        type: 'success',
        text: res?.message || 'Inisialisasi dimulai. Silakan scan kode QR yang tampil.',
      })
      const delays = [500, 1_500, 3_000]
      initPollRef.current = delays.map((d) => window.setTimeout(() => fetchSession(true), d))
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Putus koneksi akan menghapus sesi WhatsApp aktif dan mewajibkan scan QR ulang. Lanjutkan?')) {
      return
    }
    setActionLoading(true)
    setActionMsg(null)
    try {
      const res = await waLogoutSession()
      setActionMsg({ type: 'success', text: res?.message || 'Sesi WhatsApp berhasil diputuskan.' })
      await fetchSession()
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSendTest() {
    if (!testPhone.trim()) {
      setActionMsg({ type: 'error', text: 'Masukkan nomor telepon tujuan terlebih dahulu.' })
      return
    }
    setSendingTest(true)
    setActionMsg(null)
    try {
      const res = await waSendTest(testPhone.trim())
      if (res?.success) {
        setActionMsg({ type: 'success', text: res?.message || 'Pesan uji coba berhasil dikirim!' })
        setTestPhone('')
        fetchLogs(1, '')
      } else {
        setActionMsg({
          type: 'error',
          text: res?.error || res?.message || 'Gagal mengirim pesan uji coba.',
        })
      }
    } catch (err) {
      setActionMsg({ type: 'error', text: (err as Error).message })
    } finally {
      setSendingTest(false)
    }
  }

  function handleMethodChange(method: LoginMethod) {
    if (method === 'qr' && loginMethod === 'phone' && session?.pairingCode) {
      waCancelPairing()
        .catch(() => {
          /* ignore */
        })
        .finally(() => fetchSession(true))
    }
    setLoginMethod(method)
  }

  function handleLogsStatus(s: string) {
    setLogsLoading(true)
    setLogsStatus(s)
    setLogsPage(1)
  }

  function handleLogsPage(p: number) {
    setLogsLoading(true)
    setLogsPage(p)
  }

  function handleLogsRefresh() {
    setLogsLoading(true)
    fetchLogs(logsPage, logsStatus)
  }

  const statusLabel = session?.status ?? 'OFFLINE'
  const isReady = statusLabel === 'ready'
  const isActive = ['initializing', 'qr', 'authenticated', 'ready'].includes(statusLabel)
  const notConfigured = session?.configured === false
  const webhookMismatch = session?.webhookMismatch === true

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHero
        eyebrow="Gateway & Notifikasi"
        title="WhatsApp Gateway"
        description="Kelola sesi gateway WhatsApp, pantau antrean pesan, dan telusuri seluruh riwayat pengiriman notifikasi PPDB."
        docKey="superadmin-whatsapp"
        loading={sessionLoading && !session}
        chips={[
          {
            icon: isReady ? Radio : Clock,
            label: isReady ? `Aktif (${session?.phone || 'Connected'})` : `Status: ${statusLabel.toUpperCase()}`,
          },
          {
            icon: ShieldCheck,
            label: `${logsTotal} Pesan Tercatat`,
          },
        ]}
      />

      {/* Konfigurasi backend belum lengkap */}
      {notConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-800">Konfigurasi Backend Belum Lengkap</p>
            <p className="text-xs text-amber-700">
              Tambahkan variabel berikut ke <code className="bg-amber-100 px-1 rounded">apps/api/.env</code>:
            </p>
            <pre className="mt-2 rounded-lg bg-amber-100 p-2.5 text-xs font-mono text-amber-900 whitespace-pre-wrap">
{`WA_SERVICE_URL=http://localhost:3100
WA_SERVICE_API_KEY=<api-key-yang-sama-dengan-apps/whatsapp/.env>`}
            </pre>
          </div>
        </div>
      )}

      {/* Hint webhook mismatch */}
      {!notConfigured && webhookMismatch && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Konfigurasi Webhook Port Berbeda</p>
            <p className="mt-0.5 text-amber-700">
              WA microservice mengarahkan callback ke <code className="bg-amber-100 px-1 rounded">{session?.webhookUrl || '—'}</code>,
              sedangkan API ini menerima di <code className="bg-amber-100 px-1 rounded">{session?.expectedWebhookUrl || '—'}</code>.
            </p>
          </div>
        </div>
      )}

      {/* Action feedback banner */}
      {actionMsg && (
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-all',
            actionMsg.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          )}
        >
          {actionMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span className="text-xs font-medium">{actionMsg.text}</span>
          <button
            onClick={() => setActionMsg(null)}
            className="ml-auto text-xs text-current/60 hover:text-current font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Alert service offline */}
      {!notConfigured && statusLabel === 'OFFLINE' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
          <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Layanan WhatsApp Microservice Belum Aktif di Port 3100
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            WhatsApp Gateway dijalankan sebagai service Node.js. Riwayat pengiriman tetap dapat dibaca dari basis data di bawah, namun untuk menghubungkan nomor atau mengirim pesan baru, jalankan:
          </p>
          <div className="bg-slate-900 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono select-all inline-block">
            cd apps/whatsapp && npm run dev
          </div>
        </div>
      )}

      {/*
        Layout Grid Sesuai Permintaan:
        - Kiri Atas: Antrean Pesan (QueueStats)
        - Kiri Bawah: Sesi WhatsApp (SessionCard)
        - Kanan: Riwayat Pengiriman Menempel (Sticky) & Scrollable tanpa scroll page
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Antrean Pesan (Atas) & Sesi WhatsApp (Bawah) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Kiri Atas: Antrean Pesan */}
          <QueueStats stats={queueStats} onRefresh={fetchQueueStats} />

          {/* Kiri Bawah: Sesi WhatsApp */}
          <SessionCard
            session={session}
            sessionLoading={sessionLoading}
            actionLoading={actionLoading}
            loginMethod={loginMethod}
            isReady={isReady}
            isActive={isActive}
            testPhone={testPhone}
            sendingTest={sendingTest}
            statusLabel={statusLabel}
            onMethodChange={handleMethodChange}
            onInit={handleInit}
            onDisconnect={handleDisconnect}
            onRefreshStatus={fetchSession}
            onTestPhoneChange={setTestPhone}
            onSendTest={handleSendTest}
          />
        </div>

        {/* Kolom Kanan: Riwayat Pengiriman Menempel & Independently Scrollable */}
        <div className="lg:col-span-7 lg:sticky lg:top-4">
          <LogsPanel
            logs={logs}
            total={logsTotal}
            totalPages={logsTotalPages}
            page={logsPage}
            status={logsStatus}
            loading={logsLoading}
            onPage={handleLogsPage}
            onStatus={handleLogsStatus}
            onRefresh={handleLogsRefresh}
          />
        </div>
      </div>
    </div>
  )
}
