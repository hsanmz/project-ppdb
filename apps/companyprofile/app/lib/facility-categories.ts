/**
 * Konfigurasi kategori & saran fitur fasilitas.
 *
 * Nilai yang disimpan ke backend tetap string pada kolom `category` (lihat
 * `ENTITY_COLUMNS.facilities` di `apps/api/src/modules/companyprofile/schemas.py`).
 * Supaya data lama tetap kompatibel:
 *
 * - `value` adalah kunci standar yang stabil (dipakai untuk filter publik).
 * - `label` adalah teks yang dilihat admin & pengunjung.
 * - `aliases` memetakan kategori lama (mis. `tech`) ke kunci standar tanpa
 *   mengubah nilai yang sudah tersimpan sampai admin memilih kategori baru.
 *
 * Jangan menambahkan `value` baru tanpa memperbarui alias/feature di sini —
 * file ini adalah satu-satunya sumber kebenaran kategori fasilitas.
 */

export interface FacilityCategoryOption {
  value: string
  label: string
  /** Fitur yang paling relevan untuk kategori ini. */
  features: string[]
}

export const FACILITY_CATEGORY_OPTIONS: FacilityCategoryOption[] = [
  {
    value: 'akademik-pendidikan',
    label: 'Akademik & Pendidikan',
    features: ['Proyektor', 'Whiteboard', 'Meja & Kursi', 'Papan Tulis', 'AC'],
  },
  {
    value: 'perpustakaan-literasi',
    label: 'Perpustakaan & Literasi',
    features: ['Rak Buku', 'Meja Baca', 'Katalog Digital', 'Ruang Diskusi', 'Pencahayaan'],
  },
  {
    value: 'laboratorium',
    label: 'Laboratorium',
    features: ['Meja Praktikum', 'Alat Peraga', 'Ventilasi', 'Kotak P3K', 'Komputer'],
  },
  {
    value: 'ibadah-keagamaan',
    label: 'Ibadah & Keagamaan',
    features: ['Tempat Wudhu', 'Karpet', 'Pengeras Suara', "Al-Qur'an", 'AC'],
  },
  {
    value: 'asrama-hunian',
    label: 'Asrama & Hunian',
    features: ['Kasur', 'Lemari', 'Kamar Mandi', 'Kipas Angin', 'CCTV'],
  },
  {
    value: 'kesehatan-medis',
    label: 'Kesehatan & Medis',
    features: ['Ranjang Pemeriksaan', 'Kotak Obat', 'Air Bersih', 'Ruang Tunggu', 'Ventilasi'],
  },
  {
    value: 'olahraga-kebugaran',
    label: 'Olahraga & Kebugaran',
    features: ['Peralatan Olahraga', 'Area Outdoor', 'Loker', 'Kamar Mandi', 'Pencahayaan'],
  },
  {
    value: 'seni-kreativitas',
    label: 'Seni & Kreativitas',
    features: ['Sound System', 'Proyektor', 'Panggung', 'Meja Kerja', 'Pencahayaan'],
  },
  {
    value: 'aula-pertemuan',
    label: 'Aula & Pertemuan',
    features: ['Sound System', 'Proyektor', 'Kursi', 'Panggung', 'AC'],
  },
  {
    value: 'administrasi-perkantoran',
    label: 'Administrasi & Perkantoran',
    features: ['Meja & Kursi', 'Komputer', 'Printer', 'Internet', 'Ruang Tunggu'],
  },
  {
    value: 'kantin-kuliner',
    label: 'Kantin & Kuliner',
    features: ['Meja & Kursi', 'Tempat Sampah', 'Air Bersih', 'Ventilasi', 'Area Cuci Tangan'],
  },
  {
    value: 'sanitasi-kebersihan',
    label: 'Sanitasi & Kebersihan',
    features: ['Air Bersih', 'Tempat Sampah', 'Sabun', 'Ventilasi', 'Akses Disabilitas'],
  },
  {
    value: 'teknologi-digital',
    label: 'Teknologi & Digital',
    features: ['Komputer', 'Internet', 'WiFi', 'Proyektor', 'AC'],
  },
  {
    value: 'keamanan-keselamatan',
    label: 'Keamanan & Keselamatan',
    features: ['CCTV', 'Pos Keamanan', 'Alat Pemadam', 'Pencahayaan', 'Akses Terbatas'],
  },
  {
    value: 'area-outdoor-lingkungan',
    label: 'Area Outdoor & Lingkungan',
    features: ['Area Parkir', 'Taman', 'Tempat Sampah', 'Pencahayaan', 'Bangku'],
  },
  {
    value: 'transportasi-parkir',
    label: 'Transportasi & Parkir',
    features: ['Area Parkir', 'CCTV', 'Pencahayaan', 'Pos Keamanan', 'Akses Disabilitas'],
  },
  {
    value: 'fasilitas-umum',
    label: 'Fasilitas Umum',
    features: ['Toilet', 'Ruang Tunggu', 'Air Minum', 'Akses Disabilitas', 'Tempat Sampah'],
  },
  {
    value: 'lainnya',
    label: 'Lainnya',
    features: [],
  },
]

/** Saran fitur umum yang selalu relevan, di luar fitur khusus kategori. */
export const COMMON_FACILITY_FEATURES: string[] = [
  'AC',
  'WiFi',
  'Proyektor',
  'Smart TV',
  'Whiteboard',
  'Meja & Kursi',
  'Sound System',
  'CCTV',
  'Toilet',
  'Tempat Wudhu',
  'Loker',
  'Kasur',
  'Lemari',
  'Kipas Angin',
  'Komputer',
  'Printer',
  'Internet',
  'Area Parkir',
  'Akses Disabilitas',
  'Ventilasi',
  'Pencahayaan',
  'Ruang Tunggu',
  'Tempat Sampah',
  'Air Bersih',
]

/**
 * Kategori lama yang mungkin sudah tersimpan di database. Nilainya tidak
 * diubah otomatis saat edit — hanya dipetakan ke label standar agar tampilan
 * konsisten. Admin dapat memilih kategori standar bila ingin menormalkan.
 */
export const FACILITY_CATEGORY_ALIASES: Record<string, string> = {
  academic: 'akademik-pendidikan',
  library: 'perpustakaan-literasi',
  lab: 'laboratorium',
  laboratory: 'laboratorium',
  worship: 'ibadah-keagamaan',
  boarding: 'asrama-hunian',
  dormitory: 'asrama-hunian',
  health: 'kesehatan-medis',
  medical: 'kesehatan-medis',
  sports: 'olahraga-kebugaran',
  sport: 'olahraga-kebugaran',
  arts: 'seni-kreativitas',
  art: 'seni-kreativitas',
  hall: 'aula-pertemuan',
  office: 'administrasi-perkantoran',
  canteen: 'kantin-kuliner',
  cafeteria: 'kantin-kuliner',
  sanitation: 'sanitasi-kebersihan',
  tech: 'teknologi-digital',
  technology: 'teknologi-digital',
  security: 'keamanan-keselamatan',
  safety: 'keamanan-keselamatan',
  outdoor: 'area-outdoor-lingkungan',
  parking: 'transportasi-parkir',
  transport: 'transportasi-parkir',
  public: 'fasilitas-umum',
  other: 'lainnya',
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

/** Cari opsi kategori standar dari nilai tersimpan (termasuk alias lama). */
export function findFacilityCategory(value: string | null | undefined): FacilityCategoryOption | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const direct = FACILITY_CATEGORY_OPTIONS.find((option) => option.value === raw)
  if (direct) return direct

  const byLabel = FACILITY_CATEGORY_OPTIONS.find(
    (option) => normalize(option.label) === normalize(raw),
  )
  if (byLabel) return byLabel

  const aliasKey = FACILITY_CATEGORY_ALIASES[normalize(raw)]
  if (!aliasKey) return null
  return FACILITY_CATEGORY_OPTIONS.find((option) => option.value === aliasKey) ?? null
}

/** True bila nilai sudah memakai kunci standar (bukan alias/kategori kustom). */
export function isStandardFacilityCategory(value: string | null | undefined): boolean {
  const raw = String(value ?? '').trim()
  return FACILITY_CATEGORY_OPTIONS.some((option) => option.value === raw)
}

/**
 * Label yang ramah dibaca untuk nilai kategori apa pun.
 * Nilai kustom yang tidak dikenal dikembalikan apa adanya (tidak dibuang).
 */
export function facilityCategoryLabel(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return findFacilityCategory(raw)?.label ?? raw
}

/**
 * Kunci untuk pengelompokan/filter. Alias lama dan kunci standar menghasilkan
 * kunci yang sama, sehingga fasilitas lama tetap muncul di filter yang benar.
 */
export function facilityCategoryKey(value: string | null | undefined): string {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  return findFacilityCategory(raw)?.value ?? normalize(raw)
}

/** Apakah nilai termasuk varian "Lainnya" (standar maupun alias lama). */
export function isOtherFacilityCategory(value: string | null | undefined): boolean {
  return facilityCategoryKey(value) === 'lainnya'
}

/**
 * Saran fitur untuk kategori terpilih: fitur khusus kategori lebih dulu,
 * lalu fitur umum yang belum tercakup (perbandingan tanpa membedakan
 * kapitalisasi).
 */
export function suggestedFacilityFeatures(categoryValue: string | null | undefined): {
  contextual: string[]
  common: string[]
} {
  const category = findFacilityCategory(categoryValue)
  const contextual = category?.features ?? []
  const used = new Set(contextual.map(normalize))
  const common = COMMON_FACILITY_FEATURES.filter((feature) => !used.has(normalize(feature)))
  return { contextual, common }
}
