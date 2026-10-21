import type { Facility } from '@/app/lib/types'

const U = (id: string) => `https://images.unsplash.com/photo-${id}?q=80&w=1600&auto=format&fit=crop`

const DUMMY_FACILITIES: Facility[] = [
  {
    id: 'dummy-fac-1',
    image: U('1518770660439-4636190af475'),
    category: 'tech',
    content: {
      name: 'Ruang Programming (Lantai 3)',
      desc: 'Laboratorium khusus tempat santri belajar penulisan kode (coding), pengembangan web Next.js, pengelolaan basis data, dan ujian praktik Internet of Things (IoT).',
      features: [
        'Ruang kelas pemrograman khusus di Lantai 3',
        'Fasilitas praktik pengembangan web, database, & IoT',
        'Ruang diskusi proyek teknologi santri',
      ],
    },
  },
  {
    id: 'dummy-fac-2',
    image: U('1519817650390-64a93db51149'),
    category: 'worship',
    content: {
      name: 'Musholla & Area Halaqah (Lantai 3)',
      desc: "Pusat ibadah shalat berjamaah, dzikir, serta halaqah setoran tahfidz harian dan pelaksanaan ujian Tasmi' Bil Ghoib sekali duduk.",
      features: [
        'Musholla tenang dan kondusif di Lantai 3',
        'Tempat wudhu terintegrasi di lantai yang sama',
        "Area halaqah setoran ziyadah dan muraja'ah",
      ],
    },
  },
  {
    id: 'dummy-fac-3',
    image: U('1588072432836-e10032774350'),
    category: 'tech',
    content: {
      name: 'Ruang Podcast & Kreatif (Lantai 2)',
      desc: 'Studio produksi audio-visual bagi santri untuk melatih public speaking, merekam konten dakwah digital, dan menyiarkan kegiatan pesantren.',
      features: [
        'Ruang khusus produksi podcast di Lantai 2',
        'Sarana latihan pidato 3 bahasa & dakwah kreatif',
        "Dukungan penyiaran live streaming acara Tasmi'",
      ],
    },
  },
  {
    id: 'dummy-fac-4',
    image: U('1503676260728-1c00da094a0b'),
    category: 'academic',
    content: {
      name: 'Aula Serbaguna Pesantren (Lantai 2)',
      desc: 'Ruang pertemuan luas untuk kegiatan Sharing Session bersama praktisi industri, ujian terbuka, pembekalan santri, dan agenda kebersamaan.',
      features: [
        'Terletak strategis di Lantai 2 dekat area santri',
        'Lokasi Sharing Session & seminar teknologi',
        'Ruang evaluasi dan pertemuan komite pesantren',
      ],
    },
  },
  {
    id: 'dummy-fac-5',
    image: U('1555854877-bab0e564b8d5'),
    category: 'boarding',
    content: {
      name: 'Kamar Asrama Santri Putra (Lantai 2)',
      desc: 'Hunian asrama santri mukim yang teratur dan nyaman, menjadi tempat istirahat sekaligus pembentukan disiplin harian dan budaya hidup bersih.',
      features: [
        'Kamar santri representatif di Lantai 2',
        'Terjaga kebersihannya melalui program rutin GLI',
        'Pendampingan kemandirian oleh pembimbing asrama',
      ],
    },
  },
  {
    id: 'dummy-fac-6',
    image: U('1521587760476-6c12a4b040da'),
    category: 'academic',
    content: {
      name: 'Ruang Kelas Akademik (Lantai 3)',
      desc: "Ruang belajar tatap muka untuk pendalaman materi dirosah islamiyah, tafsir Al-Qur'an, bahasa Arab-Inggris, dan mata pelajaran akademik.",
      features: [
        'Terletak di Lantai 3 berdampingan dengan Musholla',
        'Lingkungan tenang yang mendukung fokus belajar',
        'Sarana evaluasi Sumatif Akhir Semester (SAS)',
      ],
    },
  },
  {
    id: 'dummy-fac-7',
    image: U('1566665797739-1674de7a421a'),
    category: 'boarding',
    content: {
      name: 'Ruang Makan, Kantin & Ruang Tamu (Lantai 1)',
      desc: 'Area layanan domestik di lantai dasar untuk memenuhi kebutuhan nutrisi harian santri serta menyambut kunjungan orang tua/wali santri.',
      features: [
        'Ruang makan bersama & kantin sehat di Lantai 1',
        'Ruang tamu dan teras depan yang ramah keluarga',
        'Fasilitas kamar mandi dan sanitasi lantai dasar',
      ],
    },
  },
  {
    id: 'dummy-fac-8',
    image: U('1530435460869-d13625c69bbf'),
    category: 'sports',
    content: {
      name: 'Area Rooftop & Sarana Olahraga',
      desc: 'Ruang terbuka di puncak gedung dan area olahraga untuk menjaga kebugaran fisik santri melalui latihan futsal, badminton, tenis meja, dan perlombaan.',
      features: [
        'Area terbuka rooftop gedung pesantren',
        'Sarana latihan futsal, badminton, dan tenis meja',
        'Area kegiatan perlombaan santri & apel pagi',
      ],
    },
  },
]

export function getFacilitiesDummyFallback(facilities: Facility[] | null): Facility[] {
  return facilities && facilities.length > 0 ? facilities : DUMMY_FACILITIES
}
