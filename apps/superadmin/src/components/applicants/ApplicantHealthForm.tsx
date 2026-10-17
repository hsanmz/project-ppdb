import type { ChangeEvent, ReactNode } from 'react'
import { Checkbox, Input, Label, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  ALLERGY_OPTIONS,
  DIAGNOSED_CONDITIONS_OPTIONS,
  type HealthIdentificationData,
} from './health'

/** Tombol pilihan Ya / Tidak. */
function YesNo({
  value,
  onChange,
}: {
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          'rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all',
          value
            ? 'border-emerald-primary bg-emerald-primary text-white shadow-sm'
            : 'border-border bg-muted text-muted-foreground hover:bg-muted/70'
        )}
      >
        Ya
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          'rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all',
          !value
            ? 'border-slate-700 bg-slate-800 text-white shadow-sm'
            : 'border-border bg-muted text-muted-foreground hover:bg-muted/70'
        )}
      >
        Tidak
      </button>
    </div>
  )
}

function QuestionCard({
  number,
  question,
  value,
  onChange,
  children,
  error,
}: {
  number: number
  question: string
  value: boolean
  onChange: (v: boolean) => void
  children?: ReactNode
  error?: string
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <Label className="text-sm font-semibold leading-snug text-foreground">
          {number}. {question}
        </Label>
        <YesNo value={value} onChange={onChange} />
      </div>
      {value && children && (
        <div className="space-y-2 border-t border-border pt-3">{children}</div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function CheckOption({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (c: boolean) => void
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors',
        checked
          ? 'border-emerald-primary bg-emerald-light font-semibold text-emerald-dark'
          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted/70'
      )}
    >
      <Checkbox checked={checked} onCheckedChange={(c) => onCheckedChange(c === true)} />
      <span>{label}</span>
    </label>
  )
}

/**
 * Formulir Identifikasi Kesehatan yang dapat diedit, mengikuti susunan &
 * kalimat pertanyaan pada formulir pendaftaran (10 pertanyaan + pernyataan).
 */
export default function ApplicantHealthForm({
  value,
  onChange,
  errors,
}: {
  value: HealthIdentificationData
  onChange: (next: HealthIdentificationData) => void
  errors?: Record<string, string>
}) {
  const set = (patch: Partial<HealthIdentificationData>) =>
    onChange({ ...value, ...patch })

  const conditionOptions = Array.from(
    new Set([...DIAGNOSED_CONDITIONS_OPTIONS, ...value.diagnosed_conditions])
  )
  const allergyOptions = Array.from(
    new Set([...ALLERGY_OPTIONS, ...value.allergy_types])
  )

  return (
    <div className="space-y-3">
      {/* 1. Riwayat penyakit kronis */}
      <QuestionCard
        number={1}
        question="Apakah calon santri memiliki riwayat penyakit kronis?"
        value={value.chronic_disease}
        onChange={(v) =>
          set({ chronic_disease: v, ...(v ? {} : { chronic_disease_description: '' }) })
        }
        error={errors?.chronic_disease}
      >
        <Label className="text-xs font-semibold text-muted-foreground">
          Jika Ya, jelaskan nama penyakit kronis:
        </Label>
        <Textarea
          rows={2}
          placeholder="Sebutkan riwayat penyakit kronis yang diderita..."
          value={value.chronic_disease_description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            set({ chronic_disease_description: e.target.value })
          }
        />
      </QuestionCard>

      {/* 2. Kondisi yang pernah didiagnosis */}
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <Label className="text-sm font-semibold text-foreground">
            2. Apakah calon santri pernah didiagnosis memiliki salah satu kondisi
            berikut?
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Centang yang sesuai (kosongkan jika tidak ada).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {conditionOptions.map((cond) => {
            const checked = value.diagnosed_conditions.includes(cond)
            return (
              <CheckOption
                key={cond}
                label={cond}
                checked={checked}
                onCheckedChange={(c) => {
                  const next = c
                    ? [...value.diagnosed_conditions, cond]
                    : value.diagnosed_conditions.filter((item) => item !== cond)
                  set({
                    diagnosed_conditions: next,
                    diagnosed_conditions_other: next.includes('Lainnya')
                      ? value.diagnosed_conditions_other
                      : '',
                  })
                }}
              />
            )
          })}
        </div>
        {value.diagnosed_conditions.includes('Lainnya') && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <Label className="text-xs font-semibold text-muted-foreground">
              Sebutkan kondisi diagnosis lainnya: <span className="text-destructive">*</span>
            </Label>
            <Input
              value={value.diagnosed_conditions_other}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                set({ diagnosed_conditions_other: e.target.value })
              }
              placeholder="Tuliskan nama kondisi..."
            />
          </div>
        )}
        <div className="space-y-1.5 border-t border-border pt-3">
          <Label className="text-xs font-semibold text-muted-foreground">
            Keterangan tambahan diagnosis (opsional):
          </Label>
          <Textarea
            rows={2}
            value={value.diagnosed_conditions_description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              set({ diagnosed_conditions_description: e.target.value })
            }
          />
        </div>
        {errors?.diagnosed_conditions && (
          <p className="text-xs text-destructive">{errors.diagnosed_conditions}</p>
        )}
      </div>

      <QuestionCard
        number={3}
        question="Apakah calon santri memiliki alergi?"
        value={value.allergies}
        onChange={(v) =>
          set(
            v
              ? { allergies: true }
              : {
                  allergies: false,
                  allergy_types: [],
                  allergy_other: '',
                  allergy_description: '',
                }
          )
        }
        error={errors?.allergy_types || errors?.allergy_other}
      >
        <Label className="text-xs font-semibold text-muted-foreground">
          Pilih jenis alergi:
        </Label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {allergyOptions.map((al) => {
            const checked = value.allergy_types.includes(al)
            return (
              <CheckOption
                key={al}
                label={al}
                checked={checked}
                onCheckedChange={(c) => {
                  const next = c
                    ? [...value.allergy_types, al]
                    : value.allergy_types.filter((item) => item !== al)
                  set({
                    allergy_types: next,
                    allergy_other: next.includes('Lainnya') ? value.allergy_other : '',
                  })
                }}
              />
            )
          })}
        </div>
        {value.allergy_types.includes('Lainnya') && (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              Sebutkan alergi lainnya: <span className="text-destructive">*</span>
            </Label>
            <Input
              value={value.allergy_other}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                set({ allergy_other: e.target.value })
              }
              placeholder="Tuliskan jenis alergi..."
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">
            Keterangan gejala dan penanganan:
          </Label>
          <Textarea
            rows={2}
            value={value.allergy_description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              set({ allergy_description: e.target.value })
            }
            placeholder="Contoh: Gejala gatal/sesak jika terkena udang, obat penanganan..."
          />
        </div>
      </QuestionCard>

      <QuestionCard
        number={4}
        question="Apakah calon santri sedang menjalani pengobatan rutin atau mengonsumsi obat berkala?"
        value={value.regular_medication}
        onChange={(v) =>
          set({
            regular_medication: v,
            regular_medication_description: v
              ? value.regular_medication_description
              : '',
          })
        }
        error={errors?.regular_medication}
      >
        <Label className="text-xs font-semibold text-muted-foreground">
          Jika Ya, sebutkan nama obat, dosis, atau jadwal konsumsi:{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          rows={2}
          value={value.regular_medication_description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            set({ regular_medication_description: e.target.value })
          }
          placeholder="Nama obat, dosis, dan instruksi konsumsi..."
        />
      </QuestionCard>

      <QuestionCard
        number={5}
        question="Apakah calon santri memiliki kondisi kesehatan atau keterbatasan fisik khusus?"
        value={value.physical_limitation}
        onChange={(v) =>
          set({
            physical_limitation: v,
            physical_limitation_description: v
              ? value.physical_limitation_description
              : '',
          })
        }
        error={errors?.physical_limitation}
      >
        <Label className="text-xs font-semibold text-muted-foreground">
          Jika Ya, jelaskan kondisi yang perlu diketahui pihak pesantren:{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          rows={2}
          value={value.physical_limitation_description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            set({ physical_limitation_description: e.target.value })
          }
        />
      </QuestionCard>

      <QuestionCard
        number={6}
        question="Apakah calon santri pernah menjalani rawat inap atau operasi dalam 2 tahun terakhir?"
        value={value.hospitalization_history}
        onChange={(v) =>
          set({
            hospitalization_history: v,
            hospitalization_history_description: v
              ? value.hospitalization_history_description
              : '',
          })
        }
        error={errors?.hospitalization_history}
      >
        <Label className="text-xs font-semibold text-muted-foreground">
          Jika Ya, jelaskan diagnosa dan riwayat tindakan medis:{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          rows={2}
          value={value.hospitalization_history_description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            set({ hospitalization_history_description: e.target.value })
          }
          placeholder="Jelaskan alasan rawat inap/operasi..."
        />
      </QuestionCard>

      <QuestionCard
        number={7}
        question="Apakah calon santri memiliki kebutuhan khusus terkait kesehatan saat kegiatan belajar?"
        value={value.special_needs}
        onChange={(v) =>
          set({
            special_needs: v,
            special_needs_description: v ? value.special_needs_description : '',
          })
        }
        error={errors?.special_needs}
      >
        <Label className="text-xs font-semibold text-muted-foreground">
          Jika Ya, jelaskan kebutuhan khusus yang diperlukan:{' '}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          rows={2}
          value={value.special_needs_description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            set({ special_needs_description: e.target.value })
          }
          placeholder="Jelaskan kebutuhan khusus saat belajar atau asrama..."
        />
      </QuestionCard>

      {/* 8-10. Kontak darurat */}
      <div className="space-y-4 rounded-xl border border-emerald-primary/25 bg-emerald-light/40 p-4">
        <h5 className="border-b border-emerald-primary/20 pb-2 text-sm font-semibold text-emerald-dark">
          8–10. Kontak Darurat Terdekat
        </h5>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              8. Nama Kontak Darurat <span className="text-destructive">*</span>
            </Label>
            <Input
              maxLength={150}
              value={value.emergency_contact_name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                set({ emergency_contact_name: e.target.value })
              }
              placeholder="Nama lengkap kontak..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              9. Hubungan dengan Calon Siswa <span className="text-destructive">*</span>
            </Label>
            <Input
              maxLength={100}
              value={value.emergency_contact_relation}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                set({ emergency_contact_relation: e.target.value })
              }
              placeholder="Ayah / Ibu / Paman / Wali..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              10. Nomor Telepon Darurat <span className="text-destructive">*</span>
            </Label>
            <Input
              inputMode="numeric"
              maxLength={16}
              value={value.emergency_contact_phone}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                set({
                  emergency_contact_phone: e.target.value.replace(/\D/g, ''),
                })
              }
              placeholder="08xxxxxxxxxx (9–16 digit)"
            />
          </div>
        </div>
        {(errors?.emergency_contact_name ||
          errors?.emergency_contact_relation ||
          errors?.emergency_contact_phone) && (
          <p className="text-xs text-destructive">
            {errors?.emergency_contact_name ||
              errors?.emergency_contact_relation ||
              errors?.emergency_contact_phone}
          </p>
        )}
      </div>

      {/* Pernyataan */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4">
        <Checkbox
          className="mt-0.5"
          checked={value.health_declaration_confirmed}
          onCheckedChange={(c) =>
            set({ health_declaration_confirmed: c === true })
          }
        />
        <span className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
          <span className="mb-1 block font-semibold text-foreground">
            Pernyataan Kebenaran Data Kesehatan
          </span>
          <span className="italic">
            &ldquo;Saya menyatakan bahwa informasi riwayat kesehatan yang saya
            berikan adalah benar dan dapat dipertanggungjawabkan. Apabila terdapat
            perubahan kondisi kesehatan di kemudian hari, saya bersedia
            memberitahukan kepada pihak pesantren.&rdquo;
          </span>
        </span>
      </label>
    </div>
  )
}
