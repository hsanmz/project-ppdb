import type { ReactNode } from 'react'
import {
  Compass,
  HeartPulse,
  KeyRound,
  MapPin,
  Phone,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { HealthIdentificationViewer } from './HealthIdentificationViewer'

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

/** Format tanggal menjadi "17 Oktober 2026". */
function formatDate(value?: string | null): string {
  if (!value) return '-'
  const iso = String(value).slice(0, 10)
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return String(value)
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? m} ${y}`
}

function genderLabel(g?: string) {
  return g === 'L' ? 'Laki-laki' : g === 'P' ? 'Perempuan' : '-'
}

/** Baris label/nilai untuk tampilan detail (read-only). */
function InfoRow({
  label,
  value,
  mono,
  className,
}: {
  label: string
  value?: ReactNode
  mono?: boolean
  className?: string
}) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div className={className}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-sm font-medium break-words',
          empty ? 'text-muted-foreground' : 'text-foreground',
          mono && 'font-mono'
        )}
      >
        {empty ? '-' : value}
      </p>
    </div>
  )
}

/** Kartu seksi di dalam modal detail, mengikuti gaya modal PPDB. */
function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="border-b border-border pb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-emerald-primary" />
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  )
}

/**
 * Tampilan detail pendaftar (read-only) yang datanya lengkap & tersusun
 * mengikuti formulir pendaftaran: Jalur, Identitas, Orang Tua/Wali, Kontak,
 * Domisili, dan Kuesioner Identifikasi Kesehatan.
 */
export default function ApplicantDetailView({
  detail,
  onResetPassword,
}: {
  detail: any
  onResetPassword?: () => void
}) {
  return (
    <div className="space-y-4">
      {detail.rejection_reason && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">
            Alasan Penolakan
          </p>
          <p className="mt-0.5 text-foreground">{detail.rejection_reason}</p>
        </div>
      )}

      {/* 1. Jalur Pendaftaran */}
      <Section
        icon={Compass}
        title="Jalur Pendaftaran"
        subtitle="Bagian 1 formulir pendaftaran"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow
            label="Jalur Pendaftaran"
            value={<span className="capitalize">{detail.registration_path || '-'}</span>}
          />
          <InfoRow label="Nomor Pendaftar" value={detail.id} mono />
          <InfoRow label="Tanggal Daftar" value={formatDate(detail.created_at)} />
        </div>
      </Section>

      {/* 2. Identitas Calon Murid */}
      <Section
        icon={UserRound}
        title="Identitas Calon Murid"
        subtitle="Bagian 2 formulir pendaftaran"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Nama Lengkap" value={detail.full_name} />
          <InfoRow label="Jenis Kelamin" value={genderLabel(detail.gender)} />
          <InfoRow label="Asal Sekolah" value={detail.previous_school} />
          <InfoRow
            label="Tempat, Tanggal Lahir"
            value={`${detail.birth_place || '-'}, ${formatDate(detail.birth_date)}`}
          />
          <InfoRow label="NISN" value={detail.nisn} mono />
          <InfoRow label="NIK" value={detail.nik} mono />
        </div>
      </Section>

      {/* 3. Data Orang Tua / Wali */}
      <Section
        icon={Users}
        title="Data Orang Tua / Wali"
        subtitle="Bagian 3 formulir pendaftaran"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Nama Ayah" value={detail.father_name || detail.parent_name} />
          <InfoRow label="Pekerjaan Ayah" value={detail.father_job} />
          <InfoRow label="No. WhatsApp Ayah" value={detail.father_phone} />
          <InfoRow label="Nama Ibu" value={detail.mother_name} />
          <InfoRow label="Pekerjaan Ibu" value={detail.mother_job} />
          <InfoRow label="No. WhatsApp Ibu" value={detail.mother_phone} />
          <InfoRow label="Nama Wali" value={detail.guardian_name} />
          <InfoRow label="Pekerjaan Wali" value={detail.guardian_job} />
          <InfoRow label="Penghasilan / Bulan" value={detail.parent_income} />
        </div>
      </Section>

      {/* 4. Kontak */}
      <Section icon={Phone} title="Kontak" subtitle="Bagian 4 formulir pendaftaran">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Email" value={detail.email} />
          <InfoRow label="No. WhatsApp Calon Santri" value={detail.phone} />
          <InfoRow label="No. WhatsApp Orang Tua/Wali" value={detail.parent_phone} />
          <InfoRow label="Email Orang Tua/Wali" value={detail.parent_email} />
        </div>
      </Section>

      {/* 5. Domisili */}
      <Section icon={MapPin} title="Domisili" subtitle="Bagian 5 formulir pendaftaran">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow
            label="Alamat Detail"
            value={detail.address}
            className="sm:col-span-2 lg:col-span-3"
          />
          <InfoRow label="Provinsi" value={detail.province} />
          <InfoRow label="Kota/Kabupaten" value={detail.city} />
          <InfoRow label="Kecamatan" value={detail.district} />
          <InfoRow label="Kelurahan/Desa" value={detail.village} />
          <InfoRow label="Kode Pos" value={detail.postal_code} mono />
        </div>
      </Section>

      {/* 6. Formulir Identifikasi Kesehatan */}
      <Section
        icon={HeartPulse}
        title="Formulir Identifikasi Kesehatan"
        subtitle="Bagian 6 formulir pendaftaran — kuesioner 10 pertanyaan (data sensitif)"
      >
        <HealthIdentificationViewer data={detail.disease_history} />
      </Section>

      {/* 7. Kredensial Login */}
      <Section icon={KeyRound} title="Kredensial Login">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow label="Username" value={detail.username} mono />
          <InfoRow label="Password" value="••••••" mono />
        </div>
        {onResetPassword && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={onResetPassword}
            >
              <KeyRound className="h-4 w-4 mr-1" />
              Reset Password (Generate)
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Password baru dibuat sistem lalu dikirim ke nomor WhatsApp pendaftar.
            </p>
          </>
        )}
      </Section>
    </div>
  )
}
