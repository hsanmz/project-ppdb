/**
 * Utilitas Formulir Identifikasi Kesehatan (pengganti Medcheck).
 *
 * Struktur ini sengaja dibuat identik dengan kuesioner 10 pertanyaan pada
 * formulir pendaftaran PPDB (`apps/ppdb/src/pages/public/RegisterPage.tsx`)
 * dan skema backend `HealthIdentificationForm`, supaya data yang ditampilkan
 * & diedit di panel Superadmin benar-benar sesuai formulir.
 */

/** Opsi kondisi yang pernah didiagnosis (sama dengan backend). */
export const DIAGNOSED_CONDITIONS_OPTIONS = [
  'Asma',
  'Diabetes',
  'Epilepsi',
  'Penyakit jantung',
  'Hipertensi',
  'TBC',
  'Lainnya',
]

/** Opsi jenis alergi (sama dengan formulir pendaftaran). */
export const ALLERGY_OPTIONS = ['Makanan', 'Obat-obatan', 'Debu', 'Lainnya']

export interface HealthIdentificationData {
  chronic_disease: boolean
  chronic_disease_description: string
  diagnosed_conditions: string[]
  diagnosed_conditions_other: string
  diagnosed_conditions_description: string
  allergies: boolean
  allergy_types: string[]
  allergy_other: string
  allergy_description: string
  regular_medication: boolean
  regular_medication_description: string
  physical_limitation: boolean
  physical_limitation_description: string
  hospitalization_history: boolean
  hospitalization_history_description: string
  special_needs: boolean
  special_needs_description: string
  emergency_contact_name: string
  emergency_contact_relation: string
  emergency_contact_phone: string
  health_declaration_confirmed: boolean
}

/** Nilai awal kuesioner kesehatan (semua kosong / "Tidak"). */
export function emptyHealth(): HealthIdentificationData {
  return {
    chronic_disease: false,
    chronic_disease_description: '',
    diagnosed_conditions: [],
    diagnosed_conditions_other: '',
    diagnosed_conditions_description: '',
    allergies: false,
    allergy_types: [],
    allergy_other: '',
    allergy_description: '',
    regular_medication: false,
    regular_medication_description: '',
    physical_limitation: false,
    physical_limitation_description: '',
    hospitalization_history: false,
    hospitalization_history_description: '',
    special_needs: false,
    special_needs_description: '',
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: '',
    health_declaration_confirmed: false,
  }
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function bool(value: unknown): boolean {
  return value === true
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

/**
 * Parse `disease_history` menjadi struktur kuesioner.
 * Mengembalikan `null` bila nilainya bukan JSON kesehatan (mis. data lama berupa
 * teks bebas).
 */
export function parseHealthData(raw?: string | null): HealthIdentificationData | null {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (!('chronic_disease' in parsed) && !('emergency_contact_name' in parsed))
    ) {
      return null
    }
    const base = emptyHealth()
    return {
      ...base,
      chronic_disease: bool(parsed.chronic_disease),
      chronic_disease_description: str(parsed.chronic_disease_description),
      diagnosed_conditions: arr(parsed.diagnosed_conditions),
      diagnosed_conditions_other: str(parsed.diagnosed_conditions_other),
      diagnosed_conditions_description: str(parsed.diagnosed_conditions_description),
      allergies: bool(parsed.allergies),
      allergy_types: arr(parsed.allergy_types),
      allergy_other: str(parsed.allergy_other),
      allergy_description: str(parsed.allergy_description),
      regular_medication: bool(parsed.regular_medication),
      regular_medication_description: str(parsed.regular_medication_description),
      physical_limitation: bool(parsed.physical_limitation),
      physical_limitation_description: str(parsed.physical_limitation_description),
      hospitalization_history: bool(parsed.hospitalization_history),
      hospitalization_history_description: str(parsed.hospitalization_history_description),
      special_needs: bool(parsed.special_needs),
      special_needs_description: str(parsed.special_needs_description),
      emergency_contact_name: str(parsed.emergency_contact_name),
      emergency_contact_relation: str(parsed.emergency_contact_relation),
      emergency_contact_phone: str(parsed.emergency_contact_phone),
      health_declaration_confirmed: bool(parsed.health_declaration_confirmed),
    }
  } catch {
    return null
  }
}

/** Apakah kuesioner masih benar-benar kosong (belum pernah diisi). */
export function isHealthEmpty(h: HealthIdentificationData): boolean {
  return (
    !h.chronic_disease &&
    !h.allergies &&
    !h.regular_medication &&
    !h.physical_limitation &&
    !h.hospitalization_history &&
    !h.special_needs &&
    h.diagnosed_conditions.length === 0 &&
    h.allergy_types.length === 0 &&
    !h.emergency_contact_name.trim() &&
    !h.emergency_contact_relation.trim() &&
    !h.emergency_contact_phone.trim()
  )
}

/**
 * Validasi kuesioner mengikuti aturan backend `HealthIdentificationForm`.
 * Mengembalikan daftar pesan kesalahan (kosong = valid).
 */
export function validateHealthData(
  h: HealthIdentificationData
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (h.chronic_disease && !h.chronic_disease_description.trim()) {
    errors.chronic_disease = 'Keterangan penyakit kronis wajib diisi jika menjawab Ya'
  }
  if (h.diagnosed_conditions.includes('Lainnya') && !h.diagnosed_conditions_other.trim()) {
    errors.diagnosed_conditions = 'Isian kondisi diagnosis lainnya wajib diisi'
  }
  if (h.allergies) {
    if (!h.allergy_types.length) {
      errors.allergy_types = 'Pilih minimal satu jenis alergi'
    } else if (h.allergy_types.includes('Lainnya') && !h.allergy_other.trim()) {
      errors.allergy_other = 'Isian alergi lainnya wajib diisi'
    }
  }
  if (h.regular_medication && !h.regular_medication_description.trim()) {
    errors.regular_medication = 'Keterangan pengobatan rutin wajib diisi jika menjawab Ya'
  }
  if (h.physical_limitation && !h.physical_limitation_description.trim()) {
    errors.physical_limitation = 'Keterangan keterbatasan fisik wajib diisi jika menjawab Ya'
  }
  if (h.hospitalization_history && !h.hospitalization_history_description.trim()) {
    errors.hospitalization_history = 'Keterangan rawat inap/operasi wajib diisi jika menjawab Ya'
  }
  if (h.special_needs && !h.special_needs_description.trim()) {
    errors.special_needs = 'Keterangan kebutuhan khusus wajib diisi jika menjawab Ya'
  }
  if (!h.emergency_contact_name.trim()) {
    errors.emergency_contact_name = 'Nama kontak darurat wajib diisi'
  }
  if (!h.emergency_contact_relation.trim()) {
    errors.emergency_contact_relation = 'Hubungan kontak darurat wajib diisi'
  }
  const phone = h.emergency_contact_phone.trim()
  if (!/^\d+$/.test(phone)) {
    errors.emergency_contact_phone = 'Nomor telepon darurat hanya boleh angka'
  } else if (phone.length < 9 || phone.length > 16) {
    errors.emergency_contact_phone = 'Nomor telepon darurat harus 9-16 digit angka'
  }

  return errors
}

/**
 * Serialisasi kuesioner ke string JSON `disease_history` dengan normalisasi
 * yang sama seperti saat registrasi (keterangan di-null-kan bila menjawab
 * "Tidak", dsb).
 */
export function serializeHealthData(h: HealthIdentificationData): string {
  const payload = {
    chronic_disease: h.chronic_disease,
    chronic_disease_description: h.chronic_disease
      ? h.chronic_disease_description.trim()
      : null,

    diagnosed_conditions: h.diagnosed_conditions,
    diagnosed_conditions_other:
      h.diagnosed_conditions.includes('Lainnya') && h.diagnosed_conditions_other.trim()
        ? h.diagnosed_conditions_other.trim()
        : null,
    diagnosed_conditions_description:
      h.diagnosed_conditions_description.trim() || null,

    allergies: h.allergies,
    allergy_types: h.allergies ? h.allergy_types : [],
    allergy_other:
      h.allergies && h.allergy_types.includes('Lainnya') && h.allergy_other.trim()
        ? h.allergy_other.trim()
        : null,
    allergy_description: h.allergies ? h.allergy_description.trim() || null : null,

    regular_medication: h.regular_medication,
    regular_medication_description: h.regular_medication
      ? h.regular_medication_description.trim()
      : null,

    physical_limitation: h.physical_limitation,
    physical_limitation_description: h.physical_limitation
      ? h.physical_limitation_description.trim()
      : null,

    hospitalization_history: h.hospitalization_history,
    hospitalization_history_description: h.hospitalization_history
      ? h.hospitalization_history_description.trim()
      : null,

    special_needs: h.special_needs,
    special_needs_description: h.special_needs
      ? h.special_needs_description.trim()
      : null,

    emergency_contact_name: h.emergency_contact_name.trim(),
    emergency_contact_relation: h.emergency_contact_relation.trim(),
    emergency_contact_phone: h.emergency_contact_phone.replace(/\D/g, ''),

    health_declaration_confirmed: h.health_declaration_confirmed,
  }
  return JSON.stringify(payload)
}
