import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  FileCheck,
  FileEdit,
  FileText,
  GraduationCap,
  HeartPulse,
  Home,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '@/services/auth.service'
import { useToast } from '../../components/Toast'
import {
  AvatarEditor,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  cn,
} from '@repo/ui'
import { DeviceSessionsCard, formatSessionDateTime, type ProfileSession } from '@repo/ui/profile'
import type { Applicant } from '../../types/ppdb'

function FieldLabel({
  icon: Icon,
  required,
  children,
}: {
  icon: typeof Mail
  required?: boolean
  children: ReactNode
}) {
  return (
    <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <span>{children}</span>
      {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
    </Label>
  )
}

interface FormState {
  // Identitas Santri
  full_name: string
  gender: string
  birth_place: string
  birth_date: string
  nisn: string
  nik: string
  previous_school: string
  // Kontak & Domisili
  phone: string
  province: string
  city: string
  district: string
  village: string
  postal_code: string
  address: string
  // Data Orang Tua
  father_name: string
  father_nik: string
  father_phone: string
  father_education: string
  father_job: string
  mother_name: string
  mother_nik: string
  mother_phone: string
  mother_education: string
  mother_job: string
  guardian_name: string
  guardian_nik: string
  guardian_phone: string
  guardian_relation: string
  parent_income: string
}

const initialFormState: FormState = {
  full_name: '',
  gender: '',
  birth_place: '',
  birth_date: '',
  nisn: '',
  nik: '',
  previous_school: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  village: '',
  postal_code: '',
  address: '',
  father_name: '',
  father_nik: '',
  father_phone: '',
  father_education: '',
  father_job: '',
  mother_name: '',
  mother_nik: '',
  mother_phone: '',
  mother_education: '',
  mother_job: '',
  guardian_name: '',
  guardian_nik: '',
  guardian_phone: '',
  guardian_relation: '',
  parent_income: '',
}

export default function ApplicantProfilePage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()

  // State profil pendaftar
  const [applicant, setApplicant] = useState<Applicant | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [lockReason, setLockReason] = useState<string | null>(null)

  // Form states
  const [form, setForm] = useState<FormState>(initialFormState)
  const [activeTab, setActiveTab] = useState<'santri' | 'kontak' | 'ortu' | 'kesehatan'>('santri')
  const [isSaving, setIsSaving] = useState(false)

  // Password state
  const [pwdForm, setPwdForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Sesi Perangkat
  const [sessions, setSessions] = useState<ProfileSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [sessionsRefreshing, setSessionsRefreshing] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // Muat data profil pendaftar
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      const res = await authService.getMyApplicant()
      const appData = res.applicant
      setApplicant(appData)
      setIsLocked(Boolean(res.is_locked || appData.status === 'passed'))
      setLockReason(res.lock_reason || null)

      setForm({
        full_name: appData.full_name || '',
        gender: appData.gender || '',
        birth_place: appData.birth_place || '',
        birth_date: appData.birth_date ? appData.birth_date.split('T')[0] : '',
        nisn: appData.nisn || '',
        nik: appData.nik || '',
        previous_school: appData.previous_school || '',
        phone: appData.phone || '',
        province: appData.province || '',
        city: appData.city || '',
        district: appData.district || '',
        village: appData.village || '',
        postal_code: appData.postal_code || '',
        address: appData.address || '',
        father_name: appData.father_name || '',
        father_nik: appData.father_nik || '',
        father_phone: appData.father_phone || '',
        father_education: appData.father_education || '',
        father_job: appData.father_job || '',
        mother_name: appData.mother_name || '',
        mother_nik: appData.mother_nik || '',
        mother_phone: appData.mother_phone || '',
        mother_education: appData.mother_education || '',
        mother_job: appData.mother_job || '',
        guardian_name: appData.guardian_name || '',
        guardian_nik: appData.guardian_nik || '',
        guardian_phone: appData.guardian_phone || '',
        guardian_relation: appData.guardian_relation || '',
        parent_income: appData.parent_income || '',
      })
    } catch (err: any) {
      toast('error', err?.message || 'Gagal memuat data profil pendaftar.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Muat sesi perangkat
  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading((prev) => (sessions.length === 0 ? true : prev))
      if (sessions.length > 0) setSessionsRefreshing(true)
      setSessionsError(null)
      const data = await authService.getSessions()
      setSessions((data as any)?.sessions ?? [])
    } catch (err: any) {
      setSessionsError(err?.message || 'Gagal memuat sesi perangkat.')
    } finally {
      setSessionsLoading(false)
      setSessionsRefreshing(false)
    }
  }, [sessions.length])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSessions()
    }, 0)
    const id = window.setInterval(() => void loadSessions(), 60000)
    return () => {
      clearTimeout(timer)
      window.clearInterval(id)
    }
  }, [loadSessions])

  // Upload Avatar
  async function handleUploadAvatar(file: File): Promise<string> {
    const res = await authService.uploadAvatar(file)
    await authService.updateProfile({ avatar_url: res.url })
    await refreshUser()
    toast('success', 'Foto profil berhasil diperbarui.')
    return res.url
  }

  async function handleAvatarUrlApplied(url: string) {
    try {
      await authService.updateProfile({ avatar_url: url })
      await refreshUser()
      toast('success', 'Foto profil berhasil diperbarui.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal menyimpan foto profil.')
    }
  }

  // Handle Form Change
  function handleChange(field: keyof FormState, value: string) {
    if (isLocked) return
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Simpan Formulir
  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) {
      toast('error', 'Data formulir terkunci karena Anda telah dinyatakan lulus / LoA telah terbit.')
      return
    }

    setIsSaving(true)
    try {
      const res = await authService.updateMyApplicant(form)
      setApplicant(res.applicant)
      await refreshUser()
      toast('success', 'Data formulir pendaftaran berhasil disimpan.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal menyimpan perubahan formulir.')
    } finally {
      setIsSaving(false)
    }
  }

  // Reset Formulir
  function handleResetForm() {
    if (!applicant || isLocked) return
    setForm({
      full_name: applicant.full_name || '',
      gender: applicant.gender || '',
      birth_place: applicant.birth_place || '',
      birth_date: applicant.birth_date ? applicant.birth_date.split('T')[0] : '',
      nisn: applicant.nisn || '',
      nik: applicant.nik || '',
      previous_school: applicant.previous_school || '',
      phone: applicant.phone || '',
      province: applicant.province || '',
      city: applicant.city || '',
      district: applicant.district || '',
      village: applicant.village || '',
      postal_code: applicant.postal_code || '',
      address: applicant.address || '',
      father_name: applicant.father_name || '',
      father_nik: applicant.father_nik || '',
      father_phone: applicant.father_phone || '',
      father_education: applicant.father_education || '',
      father_job: applicant.father_job || '',
      mother_name: applicant.mother_name || '',
      mother_nik: applicant.mother_nik || '',
      mother_phone: applicant.mother_phone || '',
      mother_education: applicant.mother_education || '',
      mother_job: applicant.mother_job || '',
      guardian_name: applicant.guardian_name || '',
      guardian_nik: applicant.guardian_nik || '',
      guardian_phone: applicant.guardian_phone || '',
      guardian_relation: applicant.guardian_relation || '',
      parent_income: applicant.parent_income || '',
    })
    toast('info', 'Formulir dikembalikan ke data tersimpan.')
  }

  // Ganti Password
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwdForm.old_password) {
      toast('error', 'Password saat ini wajib diisi.')
      return
    }
    if (!pwdForm.new_password) {
      toast('error', 'Password baru wajib diisi.')
      return
    }
    if (pwdForm.new_password.length < 8) {
      toast('error', 'Password baru minimal 8 karakter.')
      return
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      toast('error', 'Konfirmasi password baru tidak cocok.')
      return
    }

    setSavingPassword(true)
    try {
      await authService.updateProfile({
        old_password: pwdForm.old_password,
        new_password: pwdForm.new_password,
      })
      setPwdForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      })
      toast('success', 'Password berhasil diperbarui.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal memperbarui password.')
    } finally {
      setSavingPassword(false)
    }
  }

  // Revoke Sesi
  async function handleRevokeSession(id: string) {
    try {
      setRevokingId(id)
      await authService.revokeSession(id)
      await loadSessions()
      toast('success', 'Sesi perangkat berhasil diakhiri.')
    } catch (err: any) {
      toast('error', err?.message || 'Gagal mengakhiri sesi.')
    } finally {
      setRevokingId(null)
    }
  }

  const pwdMismatch =
    pwdForm.new_password &&
    pwdForm.confirm_password &&
    pwdForm.new_password !== pwdForm.confirm_password
  const pwdTooShort = pwdForm.new_password && pwdForm.new_password.length < 8
  const canSubmitPassword =
    pwdForm.old_password.trim() &&
    pwdForm.new_password.trim() &&
    pwdForm.confirm_password.trim() &&
    !pwdMismatch &&
    !pwdTooShort

  const applicantName = applicant?.full_name || user?.full_name || user?.username || 'Calon Santri'
  const initials = applicantName[0]?.toUpperCase() || 'S'
  const currentAvatar = user?.avatar_url || applicant?.avatar_url || ''

  return (
    <div
      className={cn(
        '-m-3.5 sm:-m-4 md:-m-6 lg:-m-8 flex flex-col lg:flex-row h-auto lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden animate-fade-in no-scrollbar'
      )}
    >
      {/* ── KOLOM KIRI: SATU AREA SCROLL BERSAMA (Seluruh Container ikut bergeser sebagai satu kesatuan) ── */}
      <div
        className="flex-1 min-w-0 min-h-0 p-3.5 sm:p-4 md:p-6 lg:p-8 flex flex-col justify-start space-y-5 sm:space-y-6 overflow-visible lg:overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Header Bersih & Ringkas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Kembali"
              className="h-9 w-9 rounded-xl shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  Profile
                </h1>
                {applicant?.status === 'passed' ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 font-semibold gap-1 rounded-full shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> Lulus Seleksi
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-2.5 py-0.5 font-semibold gap-1 rounded-full shrink-0">
                    <UserCheck className="h-3 w-3" /> Calon Santri
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kelola data akun pendaftaran, formulir data calon santri, kata sandi, dan pemantauan sesi aktif.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Memuat data profil pendaftar...</p>
          </div>
        ) : (
          <>
            {/* ── CONTAINER 1: Profil / Avatar + Identitas & Ringkasan Data Akun ── */}
            <Card className="shadow-sm border-border bg-card">
              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Bagian Atas: Kiri Avatar, Kanan Identitas Santri */}
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6">
                  {/* Kiri: Avatar + Tombol Upload & URL */}
                  <div className="shrink-0 flex justify-center sm:justify-start">
                    <AvatarEditor
                      value={currentAvatar}
                      initials={initials}
                      alt={applicantName}
                      onUpload={handleUploadAvatar}
                      onUrlApplied={handleAvatarUrlApplied}
                      size="md"
                      hint="JPG, PNG, WebP · Maks. 10 MB"
                    />
                  </div>

                  {/* Kanan: Identitas Santri (Rata Tengah) */}
                  <div className="min-w-0 flex-1 text-center flex flex-col items-center justify-center space-y-1">
                    <h2 className="font-heading text-base sm:text-lg font-bold text-foreground tracking-tight truncate max-w-full">
                      {applicantName}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono truncate max-w-full">
                      @{user?.username || '—'}
                    </p>
                    {(applicant?.email || user?.email) && (
                      <p className="text-xs text-muted-foreground truncate max-w-full flex items-center justify-center gap-1.5" title={applicant?.email || user?.email || undefined}>
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span>{applicant?.email || user?.email}</span>
                      </p>
                    )}
                    <div className="pt-1 flex flex-wrap items-center justify-center gap-1.5">
                      <Badge
                        variant={applicant?.status === 'passed' ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px] px-2.5 py-0.5 font-semibold gap-1 rounded-full shrink-0',
                          applicant?.status === 'passed' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
                        )}
                      >
                        <GraduationCap className="h-3 w-3" />
                        Jalur {applicant?.registration_path ? applicant.registration_path.toUpperCase() : 'REGULER'}
                      </Badge>
                      {applicant?.payment_status === 'paid' ? (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold border-primary/30 bg-primary/10 text-primary rounded-full">
                          Formulir Lunas
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-semibold border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-full">
                          Pending Bayar
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider Pemisah Atas & Bawah */}
                <div className="border-t border-border/70" />

                {/* Bagian Bawah: Ringkasan 9 Data Akun & Pendaftaran (Presisi Tengah & 3 Kolom Simetris) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-0.5">
                  {/* 1. Username */}
                  <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <AtSign className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">Username</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1 truncate max-w-full text-center">
                      {user?.username || '—'}
                    </p>
                  </div>

                  {/* 2. Status Seleksi */}
                  <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">Status Seleksi</span>
                    </div>
                    <div className="mt-1 flex items-center justify-center">
                      {applicant?.status === 'passed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Lulus Seleksi
                        </span>
                      ) : applicant?.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600">
                          <XCircle className="h-3 w-3 shrink-0" /> Belum Lolos
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <CheckCircle2 className="h-3 w-3 shrink-0" /> Pendaftar Aktif
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3. Email */}
                  <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">Email</span>
                    </div>
                    <p
                      className="text-xs font-semibold text-foreground mt-1 truncate max-w-full text-center"
                      title={applicant?.email || user?.email || undefined}
                    >
                      {applicant?.email || user?.email || '—'}
                    </p>
                  </div>

                  {/* 4. No. WhatsApp */}
                  <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">No. WhatsApp</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1 truncate max-w-full text-center">
                      {applicant?.phone || user?.phone || '—'}
                    </p>
                  </div>

                  {/* 5. No. Registrasi */}
                  <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <FileCheck className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">No. Registrasi</span>
                    </div>
                    <p className="text-xs font-semibold font-mono text-primary mt-1 truncate max-w-full text-center">
                      {(applicant as any)?.registration_no || applicant?.registration_number || '—'}
                    </p>
                  </div>

                  {/* 6. Gelombang */}
                  <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">Gelombang</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1 truncate max-w-full text-center">
                      {applicant?.wave_name || '—'}
                    </p>
                  </div>

                  {/* 7. Surat Penerimaan (LoA) */}
                  <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">Surat Penerimaan (LoA)</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1 truncate max-w-full text-center">
                      {applicant?.is_loa_signed
                        ? 'Sudah Ditandatangani'
                        : applicant?.status === 'passed'
                          ? 'Terbit (Siap TTD)'
                          : 'Belum Terbit'}
                    </p>
                  </div>

                  {/* 8. Terdaftar Sejak */}
                  <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">Terdaftar Sejak</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1 truncate max-w-full text-center">
                      {formatSessionDateTime(applicant?.created_at ? applicant.created_at.replace(' ', 'T') : undefined)}
                    </p>
                  </div>

                  {/* 9. Terakhir Login */}
                  <div className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center text-center p-2.5 sm:p-3 rounded-xl bg-muted/20 border border-border/50 min-w-0">
                    <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="text-[11px] font-medium text-muted-foreground">Terakhir Login</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-1 truncate max-w-full text-center">
                      {formatSessionDateTime(user?.last_login_at ? user.last_login_at.replace(' ', 'T') : undefined)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── BANNER STATUS KUNCI FORMULIR ── */}
            {isLocked ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-xs sm:text-sm font-bold">
                      Data Formulir Pendaftaran Terkunci Permanen
                    </h3>
                    <p className="text-[11px] sm:text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                      {lockReason ||
                        'Karena Anda telah dinyatakan lulus seleksi dan Surat Penerimaan (LoA) telah terbit, data formulir pendaftaran telah dikunci secara permanen dan tidak dapat diubah lagi demi integritas berkas calon santri resmi.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 text-foreground">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                    <FileEdit className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-xs sm:text-sm font-bold text-foreground">
                      Data Formulir Pendaftaran Dapat Diperbarui
                    </h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      Anda dapat memperbarui data identitas santri, kontak, domisili, dan orang tua/wali selama proses seleksi berlangsung hingga diterbitkannya Surat Penerimaan (LoA).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── CONTAINER 2: Container Formulir Pendaftaran Santri ── */}
            <Card className="shadow-sm border-border bg-card">
              <form onSubmit={handleSaveForm}>
                <div className="px-4 sm:px-6 py-3.5 border-b border-border/70 bg-muted/30 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-heading font-semibold text-xs sm:text-sm text-foreground">
                        Data Formulir Pendaftaran
                      </h2>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">
                        Identitas santri, kontak, domisili, data orang tua/wali, dan riwayat kesehatan.
                      </p>
                    </div>
                  </div>

                  {/* Tombol Simpan & Reset di Header Card */}
                  <div className="flex items-center gap-2">
                    {isLocked ? (
                      <Badge variant="outline" className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs px-2.5 py-1">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Formulir Terkunci</span>
                      </Badge>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetForm}
                          disabled={isSaving}
                          className="h-8 px-3 text-xs gap-1.5"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span className="hidden sm:inline">Reset</span>
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isSaving}
                          className="h-8 px-3.5 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5" />
                              <span>Simpan Formulir</span>
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Tab Navigasi Seksi Formulir */}
                <div className="border-b border-border/70 px-4 sm:px-6 bg-muted/10">
                  <div className="flex flex-wrap gap-2 py-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('santri')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        activeTab === 'santri'
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>Identitas Santri</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('kontak')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        activeTab === 'kontak'
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <Home className="h-3.5 w-3.5" />
                      <span>Kontak & Domisili</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ortu')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        activeTab === 'ortu'
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Orang Tua / Wali</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('kesehatan')}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        activeTab === 'kesehatan'
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <HeartPulse className="h-3.5 w-3.5" />
                      <span>Riwayat Kesehatan</span>
                    </button>
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6">
                  {/* TAB 1: IDENTITAS SANTRI */}
                  {activeTab === 'santri' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                          <FieldLabel icon={User} required>
                            Nama Lengkap Santri
                          </FieldLabel>
                          <Input
                            value={form.full_name}
                            onChange={(e) => handleChange('full_name', e.target.value)}
                            disabled={isLocked}
                            placeholder="Nama sesuai akta kelahiran / ijazah"
                            required
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={User} required>
                            Jenis Kelamin
                          </FieldLabel>
                          <select
                            value={form.gender}
                            onChange={(e) => handleChange('gender', e.target.value)}
                            disabled={isLocked}
                            className={cn(
                              'w-full h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                              isLocked && 'cursor-not-allowed opacity-60'
                            )}
                          >
                            <option value="">Pilih Jenis Kelamin</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={GraduationCap}>Asal Sekolah</FieldLabel>
                          <Input
                            value={form.previous_school}
                            onChange={(e) => handleChange('previous_school', e.target.value)}
                            disabled={isLocked}
                            placeholder="Contoh: SD IT Ar-Rahman / MI Negeri"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={MapPin}>Tempat Lahir</FieldLabel>
                          <Input
                            value={form.birth_place}
                            onChange={(e) => handleChange('birth_place', e.target.value)}
                            disabled={isLocked}
                            placeholder="Kota / Kabupaten kelahiran"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={Calendar}>Tanggal Lahir</FieldLabel>
                          <Input
                            type="date"
                            value={form.birth_date}
                            onChange={(e) => handleChange('birth_date', e.target.value)}
                            disabled={isLocked}
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={FileCheck}>NISN</FieldLabel>
                          <Input
                            value={form.nisn}
                            onChange={(e) => handleChange('nisn', e.target.value)}
                            disabled={isLocked}
                            placeholder="10 digit NISN"
                            maxLength={10}
                            className="h-9 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={FileCheck}>NIK Santri</FieldLabel>
                          <Input
                            value={form.nik}
                            onChange={(e) => handleChange('nik', e.target.value)}
                            disabled={isLocked}
                            placeholder="16 digit NIK Santri"
                            maxLength={16}
                            className="h-9 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: KONTAK & DOMISILI */}
                  {activeTab === 'kontak' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                          <FieldLabel icon={Phone} required>
                            Nomor WhatsApp / HP Santri
                          </FieldLabel>
                          <Input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => handleChange('phone', e.target.value)}
                            disabled={isLocked}
                            placeholder="081234567890"
                            required
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={MapPin}>Provinsi</FieldLabel>
                          <Input
                            value={form.province}
                            onChange={(e) => handleChange('province', e.target.value)}
                            disabled={isLocked}
                            placeholder="Contoh: Jawa Barat"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={MapPin}>Kota / Kabupaten</FieldLabel>
                          <Input
                            value={form.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            disabled={isLocked}
                            placeholder="Contoh: Bogor"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={MapPin}>Kecamatan</FieldLabel>
                          <Input
                            value={form.district}
                            onChange={(e) => handleChange('district', e.target.value)}
                            disabled={isLocked}
                            placeholder="Contoh: Cibinong"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={MapPin}>Kelurahan / Desa</FieldLabel>
                          <Input
                            value={form.village}
                            onChange={(e) => handleChange('village', e.target.value)}
                            disabled={isLocked}
                            placeholder="Contoh: Sukahati"
                            className="h-9 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <FieldLabel icon={MapPin}>Kode Pos</FieldLabel>
                          <Input
                            value={form.postal_code}
                            onChange={(e) => handleChange('postal_code', e.target.value)}
                            disabled={isLocked}
                            placeholder="Contoh: 16913"
                            maxLength={5}
                            className="h-9 text-xs font-mono"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                          <FieldLabel icon={Home}>Alamat Lengkap</FieldLabel>
                          <Textarea
                            value={form.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            disabled={isLocked}
                            placeholder="Jalan, RT/RW, Nomor Rumah"
                            rows={3}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: DATA ORANG TUA / WALI */}
                  {activeTab === 'ortu' && (
                    <div className="space-y-6">
                      {/* Data Ayah */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                          <User className="h-4 w-4 text-primary" />
                          <h4 className="font-heading text-xs font-bold text-foreground">Data Ayah Kandung</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <FieldLabel icon={User}>Nama Ayah</FieldLabel>
                            <Input
                              value={form.father_name}
                              onChange={(e) => handleChange('father_name', e.target.value)}
                              disabled={isLocked}
                              placeholder="Nama lengkap ayah"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel icon={FileCheck}>NIK Ayah</FieldLabel>
                            <Input
                              value={form.father_nik}
                              onChange={(e) => handleChange('father_nik', e.target.value)}
                              disabled={isLocked}
                              placeholder="16 digit NIK Ayah"
                              maxLength={16}
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel icon={Phone}>No. WhatsApp / HP Ayah</FieldLabel>
                            <Input
                              type="tel"
                              value={form.father_phone}
                              onChange={(e) => handleChange('father_phone', e.target.value)}
                              disabled={isLocked}
                              placeholder="081234567890"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel icon={GraduationCap}>Pendidikan Ayah</FieldLabel>
                            <Input
                              value={form.father_education}
                              onChange={(e) => handleChange('father_education', e.target.value)}
                              disabled={isLocked}
                              placeholder="Contoh: S1 / SMA"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <FieldLabel icon={User}>Pekerjaan Ayah</FieldLabel>
                            <Input
                              value={form.father_job}
                              onChange={(e) => handleChange('father_job', e.target.value)}
                              disabled={isLocked}
                              placeholder="Contoh: Wiraswasta / Karyawan"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Data Ibu */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                          <User className="h-4 w-4 text-primary" />
                          <h4 className="font-heading text-xs font-bold text-foreground">Data Ibu Kandung</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <FieldLabel icon={User}>Nama Ibu</FieldLabel>
                            <Input
                              value={form.mother_name}
                              onChange={(e) => handleChange('mother_name', e.target.value)}
                              disabled={isLocked}
                              placeholder="Nama lengkap ibu"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel icon={FileCheck}>NIK Ibu</FieldLabel>
                            <Input
                              value={form.mother_nik}
                              onChange={(e) => handleChange('mother_nik', e.target.value)}
                              disabled={isLocked}
                              placeholder="16 digit NIK Ibu"
                              maxLength={16}
                              className="h-9 text-xs font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel icon={Phone}>No. WhatsApp / HP Ibu</FieldLabel>
                            <Input
                              type="tel"
                              value={form.mother_phone}
                              onChange={(e) => handleChange('mother_phone', e.target.value)}
                              disabled={isLocked}
                              placeholder="081234567890"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel icon={GraduationCap}>Pendidikan Ibu</FieldLabel>
                            <Input
                              value={form.mother_education}
                              onChange={(e) => handleChange('mother_education', e.target.value)}
                              disabled={isLocked}
                              placeholder="Contoh: S1 / SMA"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <FieldLabel icon={User}>Pekerjaan Ibu</FieldLabel>
                            <Input
                              value={form.mother_job}
                              onChange={(e) => handleChange('mother_job', e.target.value)}
                              disabled={isLocked}
                              placeholder="Contoh: Ibu Rumah Tangga / Guru"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Data Wali & Penghasilan */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                          <Users className="h-4 w-4 text-primary" />
                          <h4 className="font-heading text-xs font-bold text-foreground">Data Wali (Opsional) & Penghasilan</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <FieldLabel icon={User}>Nama Wali</FieldLabel>
                            <Input
                              value={form.guardian_name}
                              onChange={(e) => handleChange('guardian_name', e.target.value)}
                              disabled={isLocked}
                              placeholder="Kosongkan jika diwakili orang tua"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel icon={Phone}>No. WhatsApp / HP Wali</FieldLabel>
                            <Input
                              type="tel"
                              value={form.guardian_phone}
                              onChange={(e) => handleChange('guardian_phone', e.target.value)}
                              disabled={isLocked}
                              placeholder="081234567890"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <FieldLabel icon={FileCheck}>Penghasilan Orang Tua / Bulan</FieldLabel>
                            <Input
                              value={form.parent_income}
                              onChange={(e) => handleChange('parent_income', e.target.value)}
                              disabled={isLocked}
                              placeholder="Contoh: Rp 5.000.000 - Rp 10.000.000"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: RIWAYAT KESEHATAN */}
                  {activeTab === 'kesehatan' && (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border/70 p-4 bg-muted/20">
                        <div className="flex items-center gap-2 pb-2 mb-3 border-b border-border/60">
                          <HeartPulse className="h-4 w-4 text-rose-500" />
                          <div>
                            <h4 className="font-heading text-xs font-bold text-foreground">
                              Kuesioner Identifikasi Kesehatan Calon Santri
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              Data kesehatan diisi saat registrasi awal dan diarsipkan demi keselamatan serta penanganan darurat santri.
                            </p>
                          </div>
                        </div>

                        {applicant?.disease_history ? (
                          <div className="space-y-2 text-xs">
                            {(() => {
                              try {
                                const parsed = JSON.parse(applicant.disease_history)
                                if (Array.isArray(parsed)) {
                                  return (
                                    <div className="space-y-2.5 divide-y divide-border/60">
                                      {parsed.map((item: any, idx: number) => (
                                        <div key={idx} className="pt-2 first:pt-0">
                                          <p className="font-medium text-foreground">
                                            {idx + 1}. {item.pertanyaan || item.question || `Pertanyaan ${idx + 1}`}
                                          </p>
                                          <p className="text-muted-foreground mt-0.5">
                                            Jawaban:{' '}
                                            <span className="font-semibold text-foreground">
                                              {item.jawaban || item.answer || item.keterangan || '—'}
                                            </span>
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                }
                                if (typeof parsed === 'object' && parsed !== null) {
                                  return (
                                    <div className="space-y-2">
                                      {Object.entries(parsed).map(([k, v], idx) => (
                                        <div key={idx} className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-border/40 last:border-none">
                                          <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                                          <span className="font-semibold text-foreground">{String(v)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                }
                                return <p className="text-muted-foreground">{applicant.disease_history}</p>
                              } catch {
                                return <p className="text-muted-foreground">{applicant.disease_history}</p>
                              }
                            })()}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Belum ada catatan riwayat kesehatan yang diisi pada formulir pendaftaran ini.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </form>
            </Card>

            {/* ── CONTAINER 3: Container Ganti Password (Identik dengan Admin / Superadmin / CP) ── */}
            <Card className="shadow-sm border-border bg-card">
              <form onSubmit={handleChangePassword}>
                <div className="px-4 sm:px-6 py-3.5 border-b border-border/70 bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-heading font-semibold text-xs sm:text-sm text-foreground">
                        Ganti Password
                      </h2>
                      <p className="text-[11px] sm:text-xs text-muted-foreground">
                        Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.
                      </p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-4 sm:p-6 space-y-4">
                  {/* Password Saat Ini */}
                  <div className="space-y-1.5 max-w-md">
                    <FieldLabel icon={KeyRound}>Password Saat Ini</FieldLabel>
                    <div className="relative">
                      <Input
                        type={showOldPassword ? 'text' : 'password'}
                        value={pwdForm.old_password}
                        onChange={(e) => setPwdForm((p) => ({ ...p, old_password: e.target.value }))}
                        placeholder="Masukkan password saat ini"
                        autoComplete="current-password"
                        disabled={savingPassword}
                        className="pr-10 h-9 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                        tabIndex={-1}
                        aria-label={showOldPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showOldPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Grid Password Baru & Konfirmasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <FieldLabel icon={KeyRound}>Password Baru</FieldLabel>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          value={pwdForm.new_password}
                          onChange={(e) => setPwdForm((p) => ({ ...p, new_password: e.target.value }))}
                          placeholder="Minimal 8 karakter"
                          autoComplete="new-password"
                          disabled={savingPassword}
                          className={cn(
                            'pr-10 h-9 text-xs',
                            pwdTooShort && 'border-amber-400 focus-visible:ring-amber-400'
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          tabIndex={-1}
                          aria-label={showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                          {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {pwdTooShort && (
                        <p className="text-[11px] text-amber-600 flex items-center gap-1 pt-0.5">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Minimal 8 karakter.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel icon={KeyRound}>Konfirmasi Password Baru</FieldLabel>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={pwdForm.confirm_password}
                          onChange={(e) => setPwdForm((p) => ({ ...p, confirm_password: e.target.value }))}
                          placeholder="Ulangi password baru"
                          autoComplete="new-password"
                          disabled={savingPassword}
                          className={cn(
                            'pr-10 h-9 text-xs',
                            pwdMismatch && 'border-rose-400 focus-visible:ring-rose-400'
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          tabIndex={-1}
                          aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                        >
                          {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      {pwdMismatch && (
                        <p className="text-[11px] text-rose-600 flex items-center gap-1 pt-0.5">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          Konfirmasi password tidak cocok.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer Tombol Ganti Password */}
                  <div className="pt-4 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      Gunakan password baru ini saat masuk kembali di perangkat lain.
                    </p>
                    <Button
                      type="submit"
                      disabled={savingPassword || !canSubmitPassword}
                      className="gap-2 h-9 px-5 text-xs font-semibold w-full sm:w-auto shrink-0"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Memproses...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Ganti Password</span>
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>

            {/* Spacer bawah agar tombol & konten paling bawah tidak terpotong saat di-scroll */}
            <div className="h-8 sm:h-12 shrink-0" aria-hidden="true" />
          </>
        )}
      </div>

      {/* ── KOLOM KANAN: Panel Sesi Perangkat (Sesuai Referensi TIU Admin PPDB & Shared Profile Page) ── */}
      <aside
        className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-muted/30 dark:bg-muted/10 p-3.5 sm:p-4 md:p-6 flex flex-col overflow-visible lg:overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <DeviceSessionsCard
          variant="panel"
          sessions={sessions || []}
          loading={sessionsLoading}
          error={sessionsError}
          refreshing={sessionsRefreshing}
          onRefresh={loadSessions}
          onRevoke={handleRevokeSession}
          revokingId={revokingId}
        />
      </aside>
    </div>
  )
}
