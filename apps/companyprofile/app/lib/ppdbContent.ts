/**
 * Konten statis landing PPDB halaman `/ppdb` (copy hero 3D + seksi di bawah hero).
 *
 * Kartu Jalur Pendaftaran, Pilar Kurikulum, langkah Alur Pendaftaran, dan
 * teks seksi/CTA TIDAK lagi dikelola dari CMS Company Profile — semuanya
 * ditulis langsung di sini (mengikuti kit copywriting PTD Ar-Rahman yang
 * semula disemai migrasi 0042 + 0045). Satu-satunya data yang tetap dinamis
 * adalah gelombang PPDB aktif dari backend PPDB (`fetchActivePpdbWave`).
 */

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

/** Cocokkan nama ikon tanpa peduli huruf besar/kecil. */
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

// ── Konten statis ────────────────────────────────────────────────────────

export const STATIC_PPDB_COPY: PpdbCopyContent = {
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

const STATIC_JALUR: PpdbJalurCard[] = [
  {
    id: 'static-jalur-1',
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
    id: 'static-jalur-2',
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
    id: 'static-jalur-3',
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
    id: 'static-jalur-4',
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

const STATIC_PILLARS: PpdbPillar[] = [
  {
    id: 'static-pillar-1',
    icon: 'BookOpen',
    content: {
      order: 1,
      title: "Tahfidz Al-Qur'an",
      desc: "Pembinaan tahsin, ziyadah, dan muraja'ah harian hingga ujian terbuka Tasmi' 10 Juz & 30 Juz Bil Ghoib serta kajian Tafsir Al-Qur'an.",
    },
  },
  {
    id: 'static-pillar-2',
    icon: 'Laptop',
    content: {
      order: 2,
      title: 'Teknologi Digital',
      desc: 'Praktik langsung di Ruang Programming mencakup pengembangan web modern (Next.js), pengelolaan Basis Data, dan perakitan Internet of Things (IoT).',
    },
  },
  {
    id: 'static-pillar-3',
    icon: 'Users',
    content: {
      order: 3,
      title: 'Bilingual (Arab & Inggris)',
      desc: 'Pembiasaan komunikasi aktif dwibahasa dan pelatihan pidato (khitobah) Bahasa Arab serta Inggris untuk kompetisi maupun literasi global.',
    },
  },
  {
    id: 'static-pillar-4',
    icon: 'ShieldCheck',
    content: {
      order: 4,
      title: 'Akademi Kepemimpinan',
      desc: 'Pembentukan adab santri, kemandirian asrama melalui Gerakan Lingkungan Indah (GLI), olahraga prestasi, dan produksi dakwah di Ruang Podcast.',
    },
  },
]

const STATIC_STEPS: PpdbStep[] = [
  {
    id: 'static-step-1',
    content: {
      order: 1,
      title: 'Pendaftaran Online',
      desc: 'Isi formulir biodata santri dan unggah dokumen pendukung melalui sistem.',
    },
  },
  {
    id: 'static-step-2',
    content: {
      order: 2,
      title: 'Verifikasi Berkas',
      desc: 'Tim panitia memvalidasi data akademik dan administrasi calon santri.',
    },
  },
  {
    id: 'static-step-3',
    content: {
      order: 3,
      title: 'Ujian Seleksi & Tasmi',
      desc: "Tes kemampuan dasar, observasi minat digital, dan tes baca Al-Qur'an.",
    },
  },
  {
    id: 'static-step-4',
    content: {
      order: 4,
      title: 'Pengumuman & Daftar Ulang',
      desc: "Penerimaan santri baru resmi dan persiapan orientasi santri (khutbah & ta'aruf).",
    },
  },
]

export const STATIC_PPDB_CONTENT: PpdbContent = {
  jalur: STATIC_JALUR,
  pillars: STATIC_PILLARS,
  steps: STATIC_STEPS,
  copy: STATIC_PPDB_COPY,
}
