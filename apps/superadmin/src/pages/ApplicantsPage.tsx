import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import * as api from '../api/client'
import type { ApplicantPeriod, ApplicantWave } from '../api/client'
import { useToast } from '../components/Toast'
import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  EmptyState,
  Input,
  Modal,
  SelectField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import {
  CalendarRange,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Pencil,
  Search,
  Trash2,
  UserRound,
  UserRoundSearch,
  Waves,
} from 'lucide-react'
import PageHero from '../components/PageHero'
import { generateSecurePassword } from '../lib/password'
import ApplicantForm from '../components/applicants/ApplicantForm'
import ApplicantDetailView from '../components/applicants/ApplicantDetailView'
import {
  APPLICANT_STATUSES,
  PAYMENT_STATUSES,
} from '../lib/applicantOptions'

const ALL = '__all__'
const perPage = 20

/** Label "Periode · Gelombang" untuk distinguishes asal pendaftar. */
function scopeLabel(a: any): { text: string; muted: string } {
  const period = a.period_name || 'Tanpa Periode'
  const wave = a.wave_name || 'Tanpa Gelombang'
  return { text: period, muted: wave }
}

function statusLabel(status: string): string {
  return (
    APPLICANT_STATUSES.find((s) => s.value === status)?.label ??
    (status || '-').replace(/_/g, ' ')
  )
}

function paymentVariant(status?: string) {
  return status === 'paid'
    ? 'success'
    : status === 'expired'
      ? 'destructive'
      : 'warning'
}

/** Statistik ringkas pada header modal detail. */
function HeaderStat({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

export default function ApplicantsPage() {
  const { toast } = useToast()

  const [applicants, setApplicants] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const [periods, setPeriods] = useState<ApplicantPeriod[]>([])
  const [waves, setWaves] = useState<ApplicantWave[]>([])
  const [periodFilter, setPeriodFilter] = useState(ALL)
  const [waveFilter, setWaveFilter] = useState(ALL)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [paymentFilter, setPaymentFilter] = useState(ALL)

  const [selected, setSelected] = useState<any>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  const [resetOpen, setResetOpen] = useState(false)
  const [resetApplicant, setResetApplicant] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState<any>(null)

  // Gelombang yang tampil di dropdown mengikuti filter periode.
  const waveOptions = buildWaveOptions(waves, periodFilter)

  const fetchApplicants = useCallback(
    async (p = page) => {
      setLoading(true)
      try {
        const params: Record<string, string | number> = {
          search,
          page: p,
          perPage,
        }
        if (periodFilter !== ALL) params.period_id = periodFilter
        if (waveFilter !== ALL) params.wave_id = waveFilter
        if (statusFilter !== ALL) params.status = statusFilter
        if (paymentFilter !== ALL) params.payment_status = paymentFilter

        const res: any = await api.getApplicants(params)
        const newestTotal = res?.total ?? 0
        const tp = Math.max(1, Math.ceil(newestTotal / perPage))
        if (p > tp) {
          // Halaman sekarang di luar jangkauan setelah filter berubah.
          setPage(tp)
          const clamped: any = await api.getApplicants({ ...params, page: tp })
          setApplicants(clamped?.data || [])
          setTotal(clamped?.total ?? newestTotal)
          return
        }
        setApplicants(res?.data || [])
        setTotal(newestTotal)
      } catch (e: any) {
        toast('error', api.getErrorMessage(e, 'Gagal memuat pendaftar'))
      } finally {
        setLoading(false)
      }
    },
    [search, page, periodFilter, waveFilter, statusFilter, paymentFilter, toast]
  )

  useEffect(() => {
    // Muat pilihan filter sekali di awal.
    ;(async () => {
      try {
        const [p, w] = await Promise.all([api.getPeriods(), api.getWaves()])
        setPeriods(p)
        setWaves(w)
      } catch {
        // Filter bersifat opsional — abaikan kegagalan.
      }
    })()
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApplicants(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter, waveFilter, statusFilter, paymentFilter])

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const hasFilter =
    periodFilter !== ALL ||
    waveFilter !== ALL ||
    statusFilter !== ALL ||
    paymentFilter !== ALL

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchApplicants(1)
  }

  function openDetail(a: any) {
    setSelected(a)
    setDetail(a)
    setIsEditing(false)
    setDetailLoading(true)
    api
      .getApplicant(a.id)
      .then((full: any) => setDetail(full))
      .catch((e: any) => toast('error', api.getErrorMessage(e, 'Gagal memuat detail')))
      .finally(() => setDetailLoading(false))
  }

  function closeDetail() {
    setSelected(null)
    setDetail(null)
    setIsEditing(false)
    setDetailLoading(false)
  }

  async function handleFormSubmit(payload: Record<string, string>) {
    if (!detail) return
    setSaving(true)
    try {
      const res: any = await api.updateApplicant(detail.id, payload)
      toast('success', 'Data pendaftar diperbarui')
      setIsEditing(false)
      // Respons sudah membawa data terbaru; fallback ke ambil ulang bila tidak ada.
      if (res?.applicant) {
        setDetail(res.applicant)
      } else {
        const full: any = await api.getApplicant(detail.id)
        setDetail(full)
      }
      fetchApplicants()
    } catch (err: any) {
      toast('error', api.getErrorMessage(err, 'Gagal menyimpan pendaftar'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteApplicant(deleteTarget.id)
      toast('success', 'Pendaftar & seluruh datanya dihapus permanen')
      setDeleteTarget(null)
      closeDetail()
      if (applicants.length === 1 && page > 1) setPage(page - 1)
      fetchApplicants()
    } catch (err: any) {
      toast('error', api.getErrorMessage(err, 'Gagal menghapus pendaftar'))
    } finally {
      setDeleting(false)
    }
  }

  function openReset(a: any) {
    setResetApplicant(a)
    setResetPassword('')
    setResetResult(null)
    setResetOpen(true)
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault()
    if (!resetApplicant) return
    if (!resetPassword) {
      toast('warning', 'Klik Generate untuk membuat password terlebih dahulu')
      return
    }
    setResetting(true)
    try {
      const res: any = await api.resetApplicantPassword(
        resetApplicant.id,
        resetPassword
      )
      if (res?.changed) {
        setResetResult(res)
        toast('success', 'Password direset & notifikasi dikirim via WhatsApp')
      } else {
        toast('warning', res?.message || 'Password tidak diubah')
        setResetOpen(false)
      }
    } catch (err: any) {
      toast('error', api.getErrorMessage(err, 'Gagal mereset password'))
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHero
        eyebrow="PPDB"
        title="Data Pendaftar"
        description="Seluruh pendaftar dari semua periode & gelombang. Klik baris mana pun untuk membuka detail sekaligus mengedit datanya."
        docKey="superadmin-applicants"
        loading={loading && applicants.length === 0}
        chips={[
          { icon: GraduationCap, label: `${total} Pendaftar` },
          {
            icon: Waves,
            label: hasFilter ? 'Filter aktif' : 'Semua periode & gelombang',
          },
          {
            icon: CheckCircle2,
            label: `${applicants.filter((a) => a.payment_status === 'paid').length} Lunas (halaman ini)`,
          },
        ]}
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama / email / NISN / telepon..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Cari
            </Button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <SelectField
              label="Periode"
              value={periodFilter}
              onValueChange={(v) => {
                setPeriodFilter(v)
                setWaveFilter(ALL)
              }}
              options={[
                { value: ALL, label: 'Semua Periode' },
                ...periods.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <SelectField
              label="Gelombang"
              value={waveFilter}
              onValueChange={setWaveFilter}
              options={waveOptions}
            />
            <SelectField
              label="Status Pendaftaran"
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: ALL, label: 'Semua Status' },
                ...APPLICANT_STATUSES,
              ]}
            />
            <SelectField
              label="Status Pembayaran"
              value={paymentFilter}
              onValueChange={setPaymentFilter}
              options={[
                { value: ALL, label: 'Semua Pembayaran' },
                ...PAYMENT_STATUSES,
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Nama Pendaftar</TableHead>
                <TableHead>Email / No. WA</TableHead>
                <TableHead>Periode / Gelombang</TableHead>
                <TableHead>Jalur Pendaftaran</TableHead>
                <TableHead>Pembayaran</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : applicants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <EmptyState
                      icon={UserRoundSearch}
                      title={hasFilter ? 'Tidak Ada Pendaftar' : 'Belum Ada Pendaftar'}
                      description={
                        hasFilter
                          ? 'Tidak ada pendaftar yang cocok dengan filter atau kata kunci ini.'
                          : 'Belum ada akun pendaftar. Data muncul otomatis saat calon santri mendaftar.'
                      }
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                applicants.map((a) => {
                  const scope = scopeLabel(a)
                  return (
                    <TableRow
                      key={a.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      title="Klik untuk melihat detail & mengedit"
                      onClick={() => openDetail(a)}
                    >
                      <TableCell className="font-medium">{a.full_name}</TableCell>
                      <TableCell className="text-sm">
                        {a.email} <br />
                        <span className="text-muted-foreground">{a.phone}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                          {scope.text}
                        </span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {scope.muted}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm capitalize font-medium">
                        {a.registration_path || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentVariant(a.payment_status)}>
                          {(a.payment_status || 'pending').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {statusLabel(a.status)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>
                Halaman {page} dari {totalPages} ({total} pendaftar)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    setPage(page - 1)
                    fetchApplicants(page - 1)
                  }}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    setPage(page + 1)
                    fetchApplicants(page + 1)
                  }}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail & Edit dalam satu modal */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          {detail && (
            <>
              {/* Header bergaya modal PPDB */}
              <div className="border-b border-border bg-emerald-light/40 p-5 pr-12 sm:p-6 sm:pr-14">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-primary text-white shadow-sm">
                    {isEditing ? (
                      <Pencil className="h-5 w-5" />
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="truncate text-lg font-bold text-foreground">
                      {isEditing
                        ? 'Edit Data Pendaftar'
                        : detail.full_name || 'Detail Pendaftar'}
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                      {isEditing
                        ? 'Perbarui data pendaftar, lalu simpan perubahan.'
                        : `No. Pendaftar: ${detail.id?.slice(0, 8) ?? '-'} · ${scopeLabel(detail).text} · ${scopeLabel(detail).muted}`}
                    </DialogDescription>
                  </div>
                </div>

                {!isEditing && (
                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
                    <HeaderStat
                      label="Periode / Gelombang"
                      value={
                        <span className="text-xs sm:text-sm">
                          {scopeLabel(detail).text} · {scopeLabel(detail).muted}
                        </span>
                      }
                    />
                    <HeaderStat
                      label="Jalur Pendaftaran"
                      value={
                        <span className="text-xs capitalize sm:text-sm">
                          {detail.registration_path || '-'}
                        </span>
                      }
                    />
                    <HeaderStat
                      label="Status Pendaftaran"
                      value={
                        <Badge variant="secondary">
                          {statusLabel(detail.status)}
                        </Badge>
                      }
                    />
                    <HeaderStat
                      label="Status Pembayaran"
                      value={
                        <Badge variant={paymentVariant(detail.payment_status)}>
                          {(detail.payment_status || 'pending').toUpperCase()}
                        </Badge>
                      }
                    />
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {detailLoading && !isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Memuat data lengkap...
                  </p>
                )}

                {isEditing ? (
                  <ApplicantForm
                    formId="applicant-edit-form"
                    initial={detail}
                    waves={waves}
                    onSubmit={handleFormSubmit}
                  />
                ) : (
                  <ApplicantDetailView
                    detail={detail}
                    onResetPassword={() => openReset(detail)}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:px-6">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      form="applicant-edit-form"
                      loading={saving}
                    >
                      Simpan Perubahan
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="mr-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleteTarget(detail)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Hapus
                    </Button>
                    <Button onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit Data
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Hapus permanen */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Pendaftar Permanen?"
        message={
          deleteTarget
            ? `Data ${deleteTarget.full_name} beserta akun, dokumen, pembayaran, nilai, dan seluruh riwayat terkait akan dihapus permanen dan tidak dapat dikembalikan. Lanjutkan?`
            : ''
        }
        confirmLabel="Hapus Permanen"
        variant="destructive"
        loading={deleting}
      />

      {/* Reset Password */}
      <Modal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Password Pendaftar"
        size="md"
        footer={
          resetApplicant && !resetResult ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setResetOpen(false)}>
                Batal
              </Button>
              <Button
                type="submit"
                form="reset-password-form"
                disabled={resetting || !resetPassword}
                loading={resetting}
              >
                Reset &amp; Kirim via WhatsApp
              </Button>
            </>
          ) : resetResult ? (
            <Button className="w-full" onClick={() => setResetOpen(false)}>
              Selesai
            </Button>
          ) : undefined
        }
      >
        {resetApplicant && (
          <>
            {resetResult ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-success/5 p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="text-sm font-semibold text-foreground">
                    Password berhasil direset
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notifikasi kredensial baru dikirim ke WhatsApp pendaftar.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Username</p>
                      <p className="font-mono font-medium">{resetResult.username}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Password Baru</p>
                      <p className="font-mono font-semibold text-primary">
                        {resetResult.password}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      navigator.clipboard?.writeText(resetResult.password)
                      toast('success', 'Password disalin')
                    }}
                  >
                    Salin Password
                  </Button>
                </div>
              </div>
            ) : (
              <form
                id="reset-password-form"
                onSubmit={handleReset}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Password baru untuk{' '}
                  <span className="font-semibold text-foreground">
                    {resetApplicant.full_name}
                  </span>{' '}
                  ({resetApplicant.username || 'tanpa username'}). Password dibuat
                  otomatis oleh sistem.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={resetPassword}
                    readOnly
                    placeholder="Klik Generate untuk membuat password"
                    className="font-mono bg-muted cursor-default"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setResetPassword(generateSecurePassword(8))
                      setResetResult(null)
                    }}
                  >
                    <KeyRound className="h-4 w-4 mr-1" />
                    Generate
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

/** Opsi gelombang, dibatasi ke periode terpilih bila ada. */
function buildWaveOptions(waves: ApplicantWave[], periodFilter: string) {
  const filtered =
    periodFilter === ALL
      ? waves
      : waves.filter((w) => w.period_id === periodFilter)
  return [
    { value: ALL, label: 'Semua Gelombang' },
    ...filtered.map((w) => ({
      value: w.id,
      label: `${w.name} — ${w.period_name}`,
    })),
  ]
}
