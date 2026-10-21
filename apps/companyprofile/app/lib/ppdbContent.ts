/**
 * Konten landing PPDB halaman `/ppdb` (copy hero 3D + seksi di bawah hero).
 *
 * Sumber utama data adalah CMS Company Profile (`GET /companyprofile/ppdb-*`)
 * sehingga panitia bisa mengubahnya lewat dashboard tanpa deploy. Konstanta di
 * file ini adalah *fallback* yang meniru seed migrasi CMS terbaru (0042 + kit
 * copywriting PTD Ar-Rahman pada 0045): halaman tetap utuh walau API/DB sedang
 * tidak terjangkau.
 */

import { getPpdbCopy, getPpdbJalur, getPpdbPillars, getPpdbSteps } from './api'
import type {
  PpdbCopyContent,
  PpdbJalurCard,
  PpdbPillar,
  PpdbStep,
} from './types'

export interface PpdbContent {
  jalur: PpdbJalurCard[]
  pillars: PpdbPillar[]
  steps: PpdbStep[]
  copy: PpdbCopyContent
}

// ── Ikon & warna aksen ───────────────────────────────────────────────────

/** Nama ikon lucide yang dipetakan halaman publik. Di luar daftar ini → Sparkles. */
export const PPDB_ICON_NAMES = [
  'Award',
  'GraduationCap',
  'BookOpen',
  'Laptop',
  'Users',
  'ShieldCheck',
  'Sparkles',
  'Target',
  'Rocket',
  'Globe',
] as const

export type PpdbIconName = (typeof PPDB_ICON_NAMES)[number]

/** Cocokkan nama ikon dari CMS tanpa peduli huruf besar/kecil. */
export function resolveIconName(value: unknown): PpdbIconName {
  if (typeof value === 'string') {
    const wanted = value.trim().toLowerCase()
    const found = PPDB_ICON_NAMES.find((name) => name.toLowerCase() === wanted)
    if (found) return found
  }
  return 'Sparkles'
}

export const ACCENT_KEYS = ['emerald', 'amber', 'sky', 'violet', 'rose', 'teal'] as const

export type AccentKey = (typeof ACCENT_KEYS)[number]

export function pickAccent(value: unknown): AccentKey {
  if (typeof value === 'string') {
    const wanted = value.trim().toLowerCase()
    const found = ACCENT_KEYS.find((key) => key === wanted)
    if (found) return found
  }
  return 'emerald'
}

// ── Urutan & penggabungan ────────────────────────────────────────────────

function orderValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Urutkan naik berdasarkan `content.order`; tanpa order → paling akhir, stabil. */
export function sortByOrder<T>(items: T[], getOrder: (item: T) => unknown): T[] {
  return items
    .map((item, index) => ({ item, index, order: orderValue(getOrder(item)) }))
    .sort((a, b) => {
      const ao = a.order ?? Number.MAX_SAFE_INTEGER
      const bo = b.order ?? Number.MAX_SAFE_INTEGER
      if (ao !== bo) return ao - bo
      return a.index - b.index
    })
    .map((entry) => entry.item)
}

/** Field kosong dari API tidak boleh menimpa teks default. */
export function mergeCopy(row: PpdbCopyContent | null | undefined): PpdbCopyContent {
  const merged: PpdbCopyContent = { ...DEFAULT_PPDB_COPY }
  if (row) {
    for (const key of Object.keys(DEFAULT_PPDB_COPY) as (keyof PpdbCopyContent)[]) {
      const value = row[key]
      if (typeof value === 'string' && value.trim() !== '') {
        merged[key] = value
      }
    }
  }
  return merged
}

// ── Fetch ────────────────────────────────────────────────────────────────

async function withFallback<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load()
  } catch {
    return fallback
  }
}

/** Ambil seluruh konten landing PPDB; tidak pernah melempar (fallback ke default). */
export async function fetchPpdbContent(): Promise<PpdbContent> {
  const [jalur, pillars, steps, copyRow] = await Promise.all([
    withFallback<PpdbJalurCard[]>(getPpdbJalur, []),
    withFallback<PpdbPillar[]>(getPpdbPillars, []),
    withFallback<PpdbStep[]>(getPpdbSteps, []),
    withFallback(getPpdbCopy, null),
  ])

  return {
    jalur:
      jalur.length > 0
        ? sortByOrder(jalur, (card) => card.content?.order)
        : DEFAULT_PPDB_CONTENT.jalur,
    pillars:
      pillars.length > 0
        ? sortByOrder(pillars, (item) => item.content?.order)
        : DEFAULT_PPDB_CONTENT.pillars,
    steps:
      steps.length > 0
        ? sortByOrder(steps, (item) => item.content?.order)
        : DEFAULT_PPDB_CONTENT.steps,
    copy: mergeCopy(copyRow?.content),
  }
}

// ── Default (hero: teks bawaan komponen hero; seksi: seed migrasi 0042) ─

export const DEFAULT_PPDB_COPY: PpdbCopyContent = {
  hero_title: `Tempat Tumbuhnya Para Hafidz 30 Juz
yang Menguasai Rekayasa Teknologi`,
  hero_desc:
    "Pendidikan pesantren putra terpadu 6 tahun dengan rekam jejak nyata kelulusan Tasmi' 30 Juz Bil Ghoib, prestasi Olimpiade Tafsir Nasional, dan pembelajaran teknologi langsung dari praktisi industri. Pendaftaran dibuka sesuai periode dan kuota gelombang aktif.",
  hero_proof: '30 Juz | 6 Tahun | 4 Pilar',
  hero_cta_label: 'Daftar Online Sekarang',
  hero_cta_href: '/register',
  hero_register_label: 'Daftar PPDB',
  hero_register_href: '/register',
  jalur_title: 'Jalur Pendaftaran Santri Baru',
  jalur_desc:
    'Pilihlah jalur penerimaan yang sesuai dengan minat dan potensi ananda untuk bergabung bersama Pesantren Tahfidz Qur\u2019an dan Digital Ar-Rahman.',
  kurikulum_title: 'Kurikulum Holistik Masa Depan',
  kurikulum_desc:
    'Keseimbangan antara ilmu ukhrawi dan bekal teknologi kontemporer',
  alur_kicker: 'Langkah Mudah',
  alur_title: 'Alur Pendaftaran PPDB',
  cta_title: 'Konsultasi Pendaftaran Santri Baru?',
  cta_desc:
    'Tim panitia PPDB siap melayani pertanyaan mengenai kurikulum, program beasiswa, dan kunjungan kampus pesantren.',
  cta_primary_label: 'Hubungi Panitia',
  cta_primary_href: '/contact',
  cta_secondary_label: 'Lihat Fasilitas & Asrama',
  cta_secondary_href: '/programs',
}

const DEFAULT_JALUR: PpdbJalurCard[] = [
  {
    id: 'default-jalur-1',
    icon: 'GraduationCap',
    content: {
      order: 1,
      accent: 'emerald',
      kicker: 'Seleksi Reguler Berbasis Minat',
      title: 'Jalur Reguler',
      desc: 'Bagi calon santri putra yang siap mengikuti pembinaan terpadu tahfidz 30 juz dan teknologi informasi dari tingkat dasar hingga mahir.',
      items: [],
      cta_label: 'Daftar Jalur Reguler',
      cta_href: '/register',
    },
  },
  {
    id: 'default-jalur-2',
    icon: 'Award',
    content: {
      order: 2,
      accent: 'amber',
      kicker: 'Uji Tahfidz 1:1',
      title: 'Jalur Prestasi Tahfidz',
      desc: "Bagi calon santri putra yang telah memiliki bekal hafalan Al-Qur'an dan siap diuji pada sesi Tahfidz 1:1.",
      items: [],
      cta_label: 'Daftar Jalur Prestasi Tahfidz',
      cta_href: '/register',
    },
  },
  {
    id: 'default-jalur-3',
    icon: 'Laptop',
    content: {
      order: 3,
      accent: 'sky',
      kicker: 'Prestasi Olimpiade & Minat Teknologi',
      title: 'Jalur Prestasi Akademik & Digital',
      desc: 'Bagi calon santri putra yang memiliki prestasi olimpiade sains/tafsir, bahasa, atau minat kuat di bidang pemrograman dan teknologi.',
      items: [],
      cta_label: 'Daftar Jalur Prestasi Akademik',
      cta_href: '/register',
    },
  },
  {
    id: 'default-jalur-4',
    icon: 'Users',
    content: {
      order: 4,
      accent: 'violet',
      kicker: 'Program Orang Tua Asuh',
      title: 'Jalur Beasiswa / Orang Tua Asuh',
      desc: "Dukungan pendidikan bagi calon santri putra yatim/dhuafa yang memiliki tekad kuat menghafal Al-Qur'an 30 juz di PTD Ar-Rahman.",
      items: [],
      cta_label: 'Daftar Jalur Beasiswa',
      cta_href: '/register',
    },
  },
]

const DEFAULT_PILLARS: PpdbPillar[] = [
  {
    id: 'default-pillar-1',
    icon: 'BookOpen',
    content: {
      order: 1,
      title: "Tahfidz Al-Qur'an",
      desc: "Pembinaan tahsin, ziyadah, dan muraja'ah harian hingga ujian terbuka Tasmi' 10 Juz & 30 Juz Bil Ghoib serta kajian Tafsir Al-Qur'an.",
    },
  },
  {
    id: 'default-pillar-2',
    icon: 'Laptop',
    content: {
      order: 2,
      title: 'Teknologi Digital',
      desc: 'Praktik langsung di Ruang Programming mencakup pengembangan web modern (Next.js), pengelolaan Basis Data, dan perakitan Internet of Things (IoT).',
    },
  },
  {
    id: 'default-pillar-3',
    icon: 'Users',
    content: {
      order: 3,
      title: 'Bilingual (Arab & Inggris)',
      desc: 'Pembiasaan komunikasi aktif dwibahasa dan pelatihan pidato (khitobah) Bahasa Arab serta Inggris untuk kompetisi maupun literasi global.',
    },
  },
  {
    id: 'default-pillar-4',
    icon: 'ShieldCheck',
    content: {
      order: 4,
      title: 'Akademi Kepemimpinan',
      desc: 'Pembentukan adab santri, kemandirian asrama melalui Gerakan Lingkungan Indah (GLI), olahraga prestasi, dan produksi dakwah di Ruang Podcast.',
    },
  },
]

const DEFAULT_STEPS: PpdbStep[] = [
  {
    id: 'default-step-1',
    content: {
      order: 1,
      title: 'Pendaftaran Online',
      desc: 'Isi formulir biodata santri dan unggah dokumen pendukung melalui sistem.',
    },
  },
  {
    id: 'default-step-2',
    content: {
      order: 2,
      title: 'Verifikasi Berkas',
      desc: 'Tim panitia memvalidasi data akademik dan administrasi calon santri.',
    },
  },
  {
    id: 'default-step-3',
    content: {
      order: 3,
      title: 'Ujian Seleksi & Tasmi',
      desc: "Tes kemampuan dasar, observasi minat digital, dan tes baca Al-Qur'an.",
    },
  },
  {
    id: 'default-step-4',
    content: {
      order: 4,
      title: 'Pengumuman & Daftar Ulang',
      desc: "Penerimaan santri baru resmi dan persiapan orientasi santri (khutbah & ta'aruf).",
    },
  },
]

export const DEFAULT_PPDB_CONTENT: PpdbContent = {
  jalur: DEFAULT_JALUR,
  pillars: DEFAULT_PILLARS,
  steps: DEFAULT_STEPS,
  copy: DEFAULT_PPDB_COPY,
}
