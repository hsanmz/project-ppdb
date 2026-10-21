import { getPrograms } from './api'
import type { Program, ProgramContent } from './types'

const FALLBACK_CONTENT: Record<string, ProgramContent> = {
  'tahfidz-al-quran': {
    title: "Tahfidz Al-Qur'an 30 Juz & Ulumul Qur'an",
    tagline: "Dari Tahsin Bacaan hingga Ujian Terbuka Tasmi' 30 Juz Bil Ghoib",
    desc: "Program inti yang membimbing santri putra menghafal 30 juz Al-Qur'an secara bertahap, terukur, dan terjaga sanad bacaannya. Setiap santri mengikuti halaqah harian ba'da Subuh dan waktu-waktu utama, dievaluasi melalui Sumatif Akhir Semester (SAS) Tahfidz, serta diuji ketahanan hafalannya melalui sidang Tasmi' 10 Juz Sekali Duduk hingga Tasmi' 30 Juz Bil Ghoib dan seremoni Khotmul Qur'an. Selain hafalan, santri juga mendalami Tafsir Al-Qur'an hingga mampu berprestasi di tingkat olimpiade nasional.",
    duration: 'Program Terpadu 6 Tahun',
    level: '30 Juz Mutqin',
    highlights: [
      "Tradisi Tasmi' Bil Ghoib Terbuka: Uji hafalan 10 juz sekali duduk hingga 30 juz penuh yang disiarkan langsung (live streaming Zoom & Instagram) sebagai bukti transparansi mutu hafalan.",
      "Pendalaman Tafsir Al-Qur'an: Membekali santri dengan pemahaman kandungan ayat, terbukti dengan raihan Medali Emas Olimpiade Tafsir Qur'an Nasional oleh santri PTD.",
      "Halaqah Intensif Bersama Muhaffidz: Pendampingan setoran ziyadah (hafalan baru) dan muraja'ah (pengulangan) setiap hari.",
      "Wisuda Khotmul Qur'an: Apresiasi resmi bagi santri yang telah merampungkan setoran 30 juz di hadapan orang tua dan dewan pengasuh.",
    ],
    curriculum: [
      'Tahsin & Tajwid Terapan',
      "Ziyadah & Muraja'ah Harian",
      "Tasmi' Berjenjang (5, 10, 15, 30 Juz)",
      "Tafsir & Ulumul Qur'an",
    ],
    outcomes: [
      "Hafal 30 juz Al-Qur'an secara mutqin, memahami tafsir ayat pilihan, dan siap menjadi imam serta pengajar Al-Qur'an di masyarakat.",
    ],
  },
  'teknologi-digital': {
    title: 'Rekayasa Teknologi Digital, Web & IoT',
    tagline:
      'Menguasai Pemrograman Modern, Basis Data, dan Internet of Things di Ruang Programming Pesantren',
    desc: 'Program Teknologi Digital di PTD Ar-Rahman dirancang melampaui pelajaran komputer sekolah biasa. Bertempat di Ruang Programming Lantai 3, para santri mempelajari rekayasa perangkat lunak modern, perancangan Basis Data, pengembangan aplikasi web dengan framework industri seperti Next.js, hingga perakitan perangkat cerdas Internet of Things (IoT). Santri juga mendapatkan wawasan langsung melalui Sharing Session bersama praktisi teknologi (seperti Senior Software Engineer Gojek) dan diuji melalui Ujian Praktik IT pada setiap akhir semester.',
    duration: 'Program Terpadu 6 Tahun',
    level: 'Praktik Lab & Industri',
    highlights: [
      'Kurikulum Web Modern (Next.js & Basis Data): Mempelajari arsitektur aplikasi web skala besar, pengelolaan database, optimasi performa, dan integrasi API.',
      'Praktikum Internet of Things (IoT): Eksperimen langsung merakit sensor, mikrokontroler, dan pemrograman perangkat keras cerdas.',
      'Mentoring Praktisi Industri: Kuliah tamu (Sharing Session) bersama engineer berpengalaman dari perusahaan teknologi terkemuka.',
      'Ujian Praktik Berbasis Proyek: Evaluasi Sumatif Akhir Semester (SAS) melalui demonstrasi proyek coding, basis data, dan IoT secara langsung.',
    ],
    curriculum: [
      'Algoritma & Pemrograman Web (HTML/CSS/JS/React/Next.js)',
      'Perancangan & Manajemen Basis Data',
      'Perakitan & Pemrograman IoT',
      'Produksi Konten Kreatif & Podcast Digital',
    ],
    outcomes: [
      'Mampu membangun aplikasi web fungsional, merancang sistem basis data, membuat prototipe perangkat IoT, dan memiliki portofolio proyek IT yang siap bersaing.',
    ],
  },
  bilingual: {
    title: 'Program Bilingual (Bahasa Arab & Inggris Aktif)',
    tagline:
      'Cakap Berkomunikasi Global dan Tampil Percaya Diri di Panggung Pidato Tiga Bahasa',
    desc: "Program Bilingual membentuk kebiasaan berkomunikasi aktif dalam Bahasa Arab dan Bahasa Inggris di lingkungan asrama PTD Ar-Rahman. Selain menunjang pemahaman ayat-ayat Al-Qur'an dan dokumentasi pemrograman internasional, santri dilatih secara khusus dalam seni berpidato (public speaking) Bahasa Arab, Bahasa Inggris, dan Bahasa Indonesia-serta aktif diterjunkan mewakili pesantren dalam ajang perlombaan antar-pondok pesantren seperti PORSENI PONTREN.",
    duration: 'Program Terpadu 6 Tahun',
    level: 'Komunikasi & Khitobah Aktif',
    highlights: [
      'Pelatihan Pidato 3 Bahasa (Arab, Inggris, Indonesia): Pembinaan intensif retorika dan muhadharah untuk mencetak orator muda yang komunikatif.',
      "Bahasa Arab untuk Studi Al-Qur'an & Tafsir: Memperkuat penguasaan kosakata Al-Qur'an agar santri lebih cepat menghafal dan meresapi makna ayat.",
      'Bahasa Inggris untuk Teknologi Informasi: Membiasakan santri membaca dokumentasi pemrograman, istilah software engineering, dan literatur global.',
      'Delegasi Kompetisi Eksternal: Kesempatan tampil mewakili PTD Ar-Rahman pada cabang lomba pidato Bahasa Arab dan Inggris tingkat kabupaten hingga nasional.',
    ],
    curriculum: [
      'Muhadatsah & Kaidah Bahasa Arab',
      'English for Communication & Tech',
      'Retorika Pidato Dwibahasa',
      'Seni Kaligrafi & Ekspresi Literasi',
    ],
    outcomes: [
      'Mampu berpidato dan berkomunikasi aktif dalam Bahasa Arab dan Inggris, serta mampu mempelajari kitab keislaman maupun referensi IT berbahasa asing.',
    ],
  },
  'akademi-kepemimpinan': {
    title: 'Akademi Kepemimpinan, Karakter & Kemandirian Santri',
    tagline:
      'Membentuk Pemimpin Muda yang Mandiri, Disiplin, Sportif, dan Peduli Lingkungan',
    desc: 'Akademi Kepemimpinan di PTD Ar-Rahman menempa mentalitas, adab, dan kemandirian santri putra melalui kehidupan berasrama yang terstruktur. Santri dilatih bertanggung jawab atas kebersihan dan kerapian lingkungan melalui program Gerakan Lingkungan Indah (GLI), mengasah sportivitas lewat olahraga prestasi (futsal, badminton, tenis meja), mengembangkan dakwah kreatif di Ruang Podcast, serta mengikuti kegiatan rihlah dan perlombaan kebangsaan.',
    duration: 'Program Terpadu 6 Tahun',
    level: 'Karakter Asrama & Organisasi',
    highlights: [
      'Budaya Kemandirian & Gerakan Lingkungan Indah (GLI): Pembagian tanggung jawab terorganisir dalam merawat seluruh area pesantren dari lantai 1 hingga rooftop.',
      'Pembinaan Olahraga & Sportivitas: Pelatihan rutin cabang olahraga futsal, badminton, dan tenis meja hingga berlaga di ajang PORSENI Pondok Pesantren.',
      'Komunikasi Dakwah via Ruang Podcast: Melatih kepemimpinan opini dan kemampuan berbicara di depan kamera/mikrofon melalui fasilitas studio podcast pesantren.',
      'Ukhuwah, Rihlah & Semangat Kebangsaan: Kegiatan tadabbur alam (rihlah), peringatan Hari Santri, dan perlombaan kemerdekaan untuk memupuk kerja sama tim.',
    ],
    curriculum: [
      'Adab & Akhlak Keseharian Santri',
      'Kepemimpinan Kelompok & Manajemen Asrama',
      'Dakwah Digital & Podcast',
      'Olahraga Prestasi & Rihlah Alam',
    ],
    outcomes: [
      'Pribadi muslim yang disiplin waktu, mandiri, tangguh secara fisik dan mental, serta siap memimpin kerja tim di masyarakat.',
    ],
  },
}

const FALLBACK_ICONS: Record<string, string> = {
  'tahfidz-al-quran': 'book-quran',
  'teknologi-digital': 'laptop-code',
  bilingual: 'language',
  'akademi-kepemimpinan': 'users',
}

export function fallbackProgram(slug: string): Program | null {
  const content = FALLBACK_CONTENT[slug]
  if (!content) return null
  return { id: slug, slug, icon: FALLBACK_ICONS[slug] ?? 'book-quran', image: '', content }
}


export interface KnownProgram {
  id: string
  label: string
  fallbackSlug: string
  keywords: string[]
}

export const KNOWN_PROGRAMS: KnownProgram[] = [
  { id: 'tahfidz', label: "Tahfidz Al-Qur'an 30 Juz & Ulumul Qur'an", fallbackSlug: 'tahfidz-al-quran', keywords: ['tahfidz', 'al-quran', 'quran'] },
  { id: 'digital', label: 'Rekayasa Teknologi Digital, Web & IoT', fallbackSlug: 'teknologi-digital', keywords: ['digital', 'teknologi', 'it'] },
  { id: 'bilingual', label: 'Program Bilingual (Bahasa Arab & Inggris Aktif)', fallbackSlug: 'bilingual', keywords: ['bilingual'] },
  { id: 'leadership', label: 'Akademi Kepemimpinan, Karakter & Kemandirian Santri', fallbackSlug: 'akademi-kepemimpinan', keywords: ['kepemimpinan', 'leadership'] },
]

export function fallbackProgramSlugs(): Record<string, string> {
  return Object.fromEntries(KNOWN_PROGRAMS.map((p) => [p.id, p.fallbackSlug]))
}

/**
 * Daftar program cadangan, dipakai halaman /programs ketika API tidak
 * tersedia atau mengembalikan kosong.
 *
 * Sebelumnya halaman daftar ini tidak punya cadangan sama sekali: `page.tsx`
 * mengirim `programs ?? []` dan `ProgramsClient` mengembalikan null untuk array
 * kosong, jadi seluruh isi program hilang — halaman jadi kosong total antara
 * navbar dan footer. Padahal halaman detail (`/programs/[slug]`) dan link di
 * navbar sudah memakai `fallbackProgram` / `resolveProgramSlugs`, sehingga
 * keduanya tetap jalan. Dari tiga pemakai data program, hanya halaman daftar
 * yang bolong.
 *
 * Urutan prioritas tetap: kalau API mengembalikan data, data itu yang dipakai
 * (CRUD tidak berubah). Cadangan ini hanya menyala saat fetch gagal atau
 * kosong, supaya `/programs` — halaman yang paling sering dibagikan — tidak
 * ikut kosong hanya karena MySQL timeout sesaat.
 */
export function fallbackPrograms(): Program[] {
  return KNOWN_PROGRAMS.map((p) => fallbackProgram(p.fallbackSlug)).filter(
    (p): p is Program => p !== null,
  )
}

/** Batas jumlah program di menu supaya dropdown navbar tidak kepanjangan. */
export const MAX_PROGRAM_MENU_LINKS = 6

export interface ProgramMenuLink {
  href: string
  label: string
}

/**
 * Ubah daftar program dari CMS menjadi item menu navbar/footer.
 *
 * Menu ini sepenuhnya mengikuti CMS — label = judul program, tautan =
 * `/programs/{slug}` — supaya menambah/mengubah/menghapus program dari
 * backoffice langsung terlihat di navigasi. `KNOWN_PROGRAMS` hanya dipakai
 * sebagai cadangan saat API kosong/gagal: menu tidak boleh kosong, dan
 * tautannya tetap hidup karena halaman detail punya konten cadangan sendiri.
 */
export function programMenuLinks(programs: Program[]): ProgramMenuLink[] {
  const fromCms = programs
    .map((p) => ({
      href: `/programs/${p.slug || p.id}`,
      label: (p.content?.title ?? '').trim(),
    }))
    .filter((l) => l.label && l.href !== '/programs/')

  if (fromCms.length === 0) {
    return KNOWN_PROGRAMS.map((k) => ({ href: `/programs/${k.fallbackSlug}`, label: k.label }))
  }
  if (fromCms.length <= MAX_PROGRAM_MENU_LINKS) return fromCms
  return [
    ...fromCms.slice(0, MAX_PROGRAM_MENU_LINKS),
    { href: '/programs', label: 'Lihat Semua Program' },
  ]
}

/**
 * Item "Program Lainnya" di sidebar halaman detail `/programs/[slug]`.
 *
 * Berbeda dari `programMenuLinks`, fungsi ini TIDAK menambahkan daftar
 * cadangan bawaan ketika daftarnya kosong: sidebar hanya boleh menautkan
 * halaman yang benar-benar ada, dan tidak boleh memuat halaman yang sedang
 * dibuka (`currentSlug`).
 */
export function siblingProgramLinks(programs: Program[], currentSlug: string): ProgramMenuLink[] {
  const current = `/programs/${currentSlug}`
  return programs
    .map((p) => ({
      href: `/programs/${p.slug || p.id}`,
      label: (p.content?.title ?? '').trim(),
    }))
    .filter((l) => l.label && l.href !== '/programs/' && l.href !== current)
    .slice(0, MAX_PROGRAM_MENU_LINKS)
}

export async function resolveProgramSlugs(): Promise<Record<string, string>> {
  const resolved = fallbackProgramSlugs()
  let programs: Program[] = []
  try {
    programs = await getPrograms()
  } catch {
    return resolved
  }

  const bySlug = new Map(programs.map((p) => [p.slug, p]))
  for (const known of KNOWN_PROGRAMS) {
    if (bySlug.has(known.id)) {
      resolved[known.id] = known.id
      continue
    }
    const match = programs.find((prog) => {
      const title = prog.content?.title?.toLowerCase() ?? ''
      const slug = prog.slug.toLowerCase()
      return known.keywords.some((k) => title.includes(k) || slug.includes(k))
    })
    if (match) resolved[known.id] = match.slug
  }
  return resolved
}
