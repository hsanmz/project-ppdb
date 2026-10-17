import { Phone, ShieldCheck, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui'
import { parseHealthData } from './health'

interface HealthIdentificationViewerProps {
  data?: string | null
  className?: string
}

/**
 * Penampil Formulir Identifikasi Kesehatan (10 pertanyaan).
 * Disusun persis mengikuti urutan & kalimat pertanyaan pada formulir
 * pendaftaran calon santri.
 */
export function HealthIdentificationViewer({
  data,
  className,
}: HealthIdentificationViewerProps) {
  const parsed = parseHealthData(data)

  if (!data || !data.trim()) {
    return (
      <span className="text-xs italic text-muted-foreground">
        Belum ada data identifikasi kesehatan.
      </span>
    )
  }

  // Data lama berupa teks bebas (bukan JSON kuesioner).
  if (!parsed) {
    return (
      <p className="whitespace-pre-line rounded-lg border border-border bg-muted/40 p-3 text-sm font-medium text-foreground">
        {data}
      </p>
    )
  }

  const conditions = parsed.diagnosed_conditions ?? []
  const allergyTypes = parsed.allergy_types ?? []

  return (
    <div className={`space-y-2.5 ${className || ''}`}>
      {/* 1. Riwayat penyakit kronis */}
      <QaRow
        n={1}
        question="Apakah calon santri memiliki riwayat penyakit kronis?"
        yes={parsed.chronic_disease}
        detail={parsed.chronic_disease_description}
      />

      {/* 2. Kondisi yang pernah didiagnosis */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-foreground sm:text-sm">
            <span className="font-semibold text-emerald-primary">2.</span>{' '}
            Apakah calon santri pernah didiagnosis memiliki salah satu kondisi
            berikut?
          </p>
          <Badge
            variant={conditions.length ? 'warning' : 'secondary'}
            className="shrink-0"
          >
            {conditions.length ? `${conditions.length} kondisi` : 'Tidak ada'}
          </Badge>
        </div>
        {conditions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {conditions.map((c, i) => (
              <Badge key={i} variant="outline" className="text-[11px]">
                {c === 'Lainnya' && parsed.diagnosed_conditions_other
                  ? `Lainnya: ${parsed.diagnosed_conditions_other}`
                  : c}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs italic text-muted-foreground">
            Tidak ada kondisi yang dicentang.
          </p>
        )}
        {parsed.diagnosed_conditions_description && (
          <p className="mt-2 border-l-2 border-emerald-primary/60 bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
            {parsed.diagnosed_conditions_description}
          </p>
        )}
      </div>

      {/* 3. Alergi */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-foreground sm:text-sm">
            <span className="font-semibold text-emerald-primary">3.</span>{' '}
            Apakah calon santri memiliki alergi?
          </p>
          <Badge variant={parsed.allergies ? 'warning' : 'secondary'} className="shrink-0">
            {parsed.allergies ? 'Ya' : 'Tidak'}
          </Badge>
        </div>
        {parsed.allergies && (
          <div className="mt-2 space-y-2">
            {allergyTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allergyTypes.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-[11px]">
                    {a === 'Lainnya' && parsed.allergy_other
                      ? `Lainnya: ${parsed.allergy_other}`
                      : a}
                  </Badge>
                ))}
              </div>
            )}
            {parsed.allergy_description && (
              <p className="border-l-2 border-amber-400 bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                {parsed.allergy_description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 4. Pengobatan rutin */}
      <QaRow
        n={4}
        question="Apakah calon santri sedang menjalani pengobatan rutin atau mengonsumsi obat berkala?"
        yes={parsed.regular_medication}
        detail={parsed.regular_medication_description}
      />

      {/* 5. Keterbatasan fisik */}
      <QaRow
        n={5}
        question="Apakah calon santri memiliki kondisi kesehatan atau keterbatasan fisik khusus?"
        yes={parsed.physical_limitation}
        detail={parsed.physical_limitation_description}
      />

      {/* 6. Rawat inap / operasi */}
      <QaRow
        n={6}
        question="Apakah calon santri pernah menjalani rawat inap atau operasi dalam 2 tahun terakhir?"
        yes={parsed.hospitalization_history}
        detail={parsed.hospitalization_history_description}
      />

      {/* 7. Kebutuhan khusus saat belajar */}
      <QaRow
        n={7}
        question="Apakah calon santri memiliki kebutuhan khusus terkait kesehatan saat kegiatan belajar?"
        yes={parsed.special_needs}
        detail={parsed.special_needs_description}
      />

      {/* 8-10. Kontak darurat */}
      <div className="rounded-lg border border-emerald-primary/25 bg-emerald-light/40 p-3">
        <div className="flex items-center gap-2 border-b border-emerald-primary/20 pb-2">
          <Phone className="h-3.5 w-3.5 text-emerald-primary" />
          <span className="text-xs font-semibold text-emerald-dark">
            8–10. Kontak Darurat Terdekat
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] text-muted-foreground">8. Nama Kontak Darurat</p>
            <p className="text-sm font-medium text-foreground">
              {parsed.emergency_contact_name || '-'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">9. Hubungan dengan Calon Siswa</p>
            <p className="text-sm font-medium text-foreground">
              {parsed.emergency_contact_relation || '-'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">10. Nomor Telepon Darurat</p>
            <p className="text-sm font-medium text-foreground">
              {parsed.emergency_contact_phone || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Pernyataan kesehatan */}
      {parsed.health_declaration_confirmed ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-primary/20 bg-emerald-light/60 p-3 text-xs text-emerald-dark">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Pendaftar telah menyatakan bahwa informasi riwayat kesehatan yang
            diberikan adalah benar dan dapat dipertanggungjawabkan.
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Pernyataan kebenaran data kesehatan belum dikonfirmasi pendaftar.</span>
        </div>
      )}
    </div>
  )
}

/** Baris Ya/Tidak dengan nomor urut formulir. */
function QaRow({
  n,
  question,
  yes,
  detail,
}: {
  n: number
  question: string
  yes: boolean
  detail?: string | null
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-foreground sm:text-sm">
          <span className="font-semibold text-emerald-primary">{n}.</span> {question}
        </p>
        <Badge variant={yes ? 'warning' : 'secondary'} className="shrink-0">
          {yes ? 'Ya' : 'Tidak'}
        </Badge>
      </div>
      {yes && detail && (
        <p className="mt-2 whitespace-pre-line border-l-2 border-emerald-primary/60 bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          {detail}
        </p>
      )}
    </div>
  )
}
