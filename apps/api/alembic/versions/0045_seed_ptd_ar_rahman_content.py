"""Seed konten resmi PTD Ar-Rahman (kit copywriting) ke CMS Company Profile.

Revision ID: 0045
Revises: 0044
Create Date: 2026-10-18

Kit copywriting resmi PTD Ar-Rahman (hero beranda, berita, program, fasilitas,
staff, prestasi, kontak, dan teks landing PPDB) diisi ke tabel konten CMS.
Tabel konten saat ini berisi konten dummy bawaan (foto stok Unsplash + teks
contoh berbahasa umum), sehingga migrasi ini MENGGANTI baris dummy tersebut
dengan konten kit. Penggantian hanya dilakukan saat seluruh baris pada tabel
masih berupa dummy stok (semua `image` berawalan Unsplash); tabel yang sudah
berisi konten asli/suntingan admin tidak disentuh. Tabel kosong diisi langsung.

Untuk tab PPDB (`ppdb_jalur_cards`, `ppdb_pillars`, `ppdb_page_copy`) konten
seed lama 0042 diperbarui ke teks kit hanya jika judulnya masih sama dengan
judul seed 0042 (bukti belum disunting admin); sisanya dibiarkan. `ppdb_steps`
tidak diubah karena kit tidak mendefinisikannya.

Migrasi ini juga menyiapkan tabel `ppdb_*` bila belum ada — jaring pengaman
untuk database yang ter-`stamp` di 0042 tetapi DDL 0042 tidak sempat berjalan
(gejala: alembic_version = 0042 tetapi tabel ppdb_* tidak ada) — dan
mendaftarkan halaman permission PPDB seperti yang dilakukan 0042. Semua
langkah idempoten (`IF NOT EXISTS`-style lewat inspeksi tabel baris).

`downgrade()` hanya membersihkan baris seed milik migrasi ini; konten dummy
lama tidak dikembalikan.
"""

import json
from collections.abc import Sequence
from datetime import datetime
from uuid import uuid4

import sqlalchemy as sa

from alembic import op

revision: str = "0045"
down_revision: str | None = "0044"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Foto stok bawaan selalu dari Unsplash; dipakai sebagai penanda baris dummy.
UNSPLASH_PREFIX = "https://images.unsplash.com/"

# Awalan id baris seed migrasi ini (dipakai juga oleh `downgrade`).
KIT_ID_PREFIXES = (
    "heroslide-",
    "news-kit-",
    "program-kit-",
    "fasilitas-kit-",
    "staff-kit-",
    "prestasi-kit-",
)


# ── Beranda: hero slider (kit §1.1A) ─────────────────────────────────────

HERO_SLIDES: list[dict] = [
    {
        "content": {
            "label": "Pesantren Tahfidz & Digital Khusus Putra • Berdiri Sejak 2021",
            "title": (
                "Mencetak Hafidz\nAl-Qur'an 30 Juz\n"
                "yang Ahli di Bidang\nTeknologi Digital"
            ),
            "subtitle": (
                "Pendidikan pesantren putra terpadu 6 tahun yang memadukan "
                "ketangguhan hafalan lewat tradisi Tasmi' 30 Juz Bil Ghoib "
                "dengan penguasaan rekayasa perangkat lunak modern (Next.js, "
                "Basis Data, hingga Internet of Things)."
            ),
            "button_label": "Daftar Sesuai Gelombang Aktif",
            "button_href": "/ppdb",
        },
    },
    {
        "content": {
            "label": "Terbukti Melahirkan Hafidz 30 Juz & Juara Nasional",
            "title": (
                "Dari Majelis Tasmi' Bil Ghoib\nhingga Ruang Programming\n"
                "Bersama Praktisi Industri"
            ),
            "subtitle": (
                "Santri PTD Ar-Rahman ditempa menyetorkan hafalan 10 hingga "
                "30 juz sekali duduk, menjuarai Olimpiade Tafsir Nasional, "
                "sekaligus belajar teknologi web langsung bersama Senior "
                "Software Engineer industri teknologi."
            ),
            "button_label": "Lihat Jejak Prestasi Santri",
            "button_href": "/achievements",
        },
    },
    {
        "content": {
            "label": "PPDB Pesantren Tahfidz & Digital Ar-Rahman Telah Dibuka",
            "title": (
                "Daftarkan Putra Anda\nSecara 100% Online\ndari Rumah"
            ),
            "subtitle": (
                "Proses seleksi terintegrasi mulai dari pengisian formulir, "
                "pembayaran QRIS instan, ujian TIU berbasis Safe Exam Browser, "
                "penjadwalan uji Tahfidz 1:1, hingga pengumuman kelulusan "
                "otomatis via WhatsApp."
            ),
            "button_label": "Buat Akun Pendaftaran",
            "button_href": "/register",
        },
    },
]


# ── Berita (kit §1.6, 6 artikel) ─────────────────────────────────────────

NEWS_ARTICLES: list[dict] = [
    {
        "slug": "dua-santri-ptd-ar-rahman-tuntaskan-tasmi-30-juz-bil-ghoib",
        "category": "Tahfidz & Tasmi'",
        "date": "2024-06-05",
        "content": {
            "title": (
                "Alhamdulillah, Dua Santri PTD Ar-Rahman Tuntaskan Tasmi' "
                "30 Juz Bil Ghoib dan Khotmul Qur'an"
            ),
            "excerpt": (
                "Dua santri putra PTD Ar-Rahman, Alvito Syarman Siregar dan "
                "Muhammad Ardan Sunda, menuntaskan ujian setoran hafalan "
                "30 Juz Bil Ghoib dari Juz 1 hingga Juz 30, ditutup prosesi "
                "Khotmul Qur'an pada 5 Juni 2024."
            ),
            "content": "\n\n".join(
                (
                    (
                        "Suasana haru dan penuh kesyukuran menyelimuti keluarga "
                        "besar Pesantren Tahfidz & Digital (PTD) Ar-Rahman. Dua "
                        "santri putra terbaik, yakni Alvito Syarman Siregar dan "
                        "Muhammad Ardan Sunda, berhasil menuntaskan ujian "
                        "setoran hafalan Al-Qur'an 30 Juz Bil Ghoib (tanpa "
                        "melihat mushaf) dari Juz 1 hingga Juz 30."
                    ),
                    (
                        "Rangkaian ujian Tasmi' 30 Juz Bil Ghoib dilaksanakan "
                        "selama dua hari penuh pada Senin hingga Selasa, "
                        "3-4 Juni 2024 mulai ba'da Subuh hingga selesai "
                        "bertempat di Kampus PTD Ar-Rahman, Mangunjaya, Tambun "
                        "Selatan, Bekasi. Setelah dinyatakan tuntas "
                        "menyetorkan seluruh hafalannya, prosesi puncak "
                        "Khotmul Qur'an digelar secara khidmat pada hari Rabu, "
                        "5 Juni 2024 di Gedung Ar-Rahman, Jatimakmur."
                    ),
                    (
                        "Capaian ini menjadi bukti nyata bahwa kurikulum "
                        "terpadu di PTD Ar-Rahman mampu mengantarkan para "
                        "santri mencapai target hafalan tertinggi sembari "
                        "tetap aktif mempelajari teknologi informasi. Semoga "
                        "Allah SWT senantiasa memberikan keberkahan dan "
                        "keistiqamahan kepada ananda berdua dalam menjaga "
                        "Kalamullah sepanjang hayat."
                    ),
                )
            ),
            "author": "",
        },
    },
    {
        "slug": "sharing-session-ptd-ar-rahman-senior-engineer-gojek-nextjs",
        "category": "Teknologi Digital",
        "date": "2025-09-19",
        "content": {
            "title": (
                "Sharing Session PTD Ar-Rahman Hadirkan Senior Engineer "
                "Gojek, Kupas Tuntas Framework Next.js"
            ),
            "excerpt": (
                "PTD Ar-Rahman menggelar Sharing Session bersama Hendiri "
                "Sudianto, Senior Software Engineer Gojek, membedah Next.js: "
                "arsitektur, best practices, optimasi performa, hingga "
                "integrasi API."
            ),
            "content": "\n\n".join(
                (
                    (
                        "Dalam rangka mendekatkan pembelajaran teknologi "
                        "santri dengan standar industri perangkat lunak "
                        "nasional, Pesantren Tahfidz & Digital (PTD) "
                        "Ar-Rahman menggelar kegiatan Sharing Session "
                        "inspiratif pada hari Ahad, 14 September 2025. Acara "
                        "ini menghadirkan narasumber tamu Hendiri Sudianto, "
                        "seorang Senior Software Engineer di Gojek yang telah "
                        "berpengalaman selama 9 tahun di bidang rekayasa "
                        "perangkat lunak."
                    ),
                    (
                        "Pada sesi tersebut, para santri PTD Ar-Rahman diajak "
                        "mengupas tuntas Next.js, salah satu framework "
                        "pengembangan web modern berbasis React yang "
                        "digunakan secara luas untuk membangun aplikasi "
                        "berskala besar. Materi yang dibahas mencakup konsep "
                        "fundamental arsitektur Next.js, penerapan best "
                        "practices di dunia kerja, teknik optimasi performa "
                        "aplikasi web, hingga cara mengintegrasikan "
                        "Application Programming Interface (API)."
                    ),
                    (
                        "Para santri tampak sangat antusias mengajukan "
                        "pertanyaan pada sesi diskusi interaktif sebelum "
                        "acara ditutup dengan foto bersama. Kehadiran "
                        "praktisi industri ini semakin memperkuat motivasi "
                        "santri PTD Ar-Rahman untuk menjadi penghafal "
                        "Al-Qur'an yang unggul dalam rekayasa teknologi."
                    ),
                )
            ),
            "author": "",
        },
    },
    {
        "slug": "santri-ptd-ar-rahman-porseni-pontren-2025-kabupaten-bekasi",
        "category": "Kegiatan & Prestasi",
        "date": "2025-10-19",
        "content": {
            "title": (
                "Santri PTD Ar-Rahman Tunjukkan Semangat Juang di PORSENI "
                "PONTREN 2025 Kabupaten Bekasi"
            ),
            "excerpt": (
                "Sebanyak 19 santri PTD Ar-Rahman berlaga pada enam cabang "
                "lomba di PORSENI PONTREN 2025 Kabupaten Bekasi, bersaing "
                "bersama 73 pesantren dan lebih dari 2.100 santri."
            ),
            "content": "\n\n".join(
                (
                    (
                        "Santri Pesantren Tahfidz & Digital (PTD) Ar-Rahman "
                        "turut ambil bagian dalam perhelatan Pekan Olahraga "
                        "dan Seni Antar Pondok Pesantren (PORSENI PONTREN) "
                        "2025 Tingkat Kabupaten Bekasi yang diselenggarakan "
                        "pada Kamis, 16 Oktober 2025 di Pesantren Darul "
                        "Azhar, Kecamatan Setu, Kabupaten Bekasi. Ajang "
                        "bergengsi ini diikuti oleh 73 pondok pesantren "
                        "dengan total lebih dari 2.100 santri se-Kabupaten "
                        "Bekasi."
                    ),
                    (
                        "Pada perhelatan ini, PTD Ar-Rahman mengutus "
                        "kontingen santri untuk berlaga pada enam cabang "
                        "perlombaan sekaligus, meliputi Pidato Bahasa Arab, "
                        "Pidato Bahasa Inggris, Pidato Bahasa Indonesia, "
                        "Kaligrafi, Badminton, Futsal, dan Tenis Meja. "
                        "Sebanyak 19 santri PTD Ar-Rahman hadir langsung di "
                        "lokasi guna bertanding sekaligus memberikan "
                        "dukungan penuh bagi rekan-rekan mereka."
                    ),
                    (
                        "Pembimbing santri PTD Ar-Rahman, Ustadz Nur, "
                        "menyampaikan bahwa keikutsertaan ini bertujuan "
                        "memotivasi santri untuk terus mengasah bakat "
                        "bahasa, seni, dan olahraga mereka. Beliau "
                        "menekankan bahwa pengalaman bertanding, keberanian "
                        "tampil di depan publik, dan silaturahmi "
                        "antar-pesantren merupakan pembelajaran berharga "
                        "yang membentuk mental juara para santri."
                    ),
                )
            ),
            "author": "",
        },
    },
    {
        "slug": "tradisi-tasmi-10-juz-sekali-duduk-dan-medali-emas-olimpiade-tafsir",
        "category": "Tahfidz & Prestasi",
        "date": "2024-07-15",
        "content": {
            "title": (
                "Tradisi Tasmi' 10 Juz Sekali Duduk dan Raihan Medali Emas "
                "Olimpiade Tafsir Qur'an Nasional"
            ),
            "excerpt": (
                "Tasmi' 10 Juz Bil Ghoib sekali duduk oleh Ashraf El-Haq dan "
                "Medali Emas Olimpiade Tafsir Qur'an Nasional oleh Alvito "
                "Syarman Siregar membuktikan kekuatan tahfidz dan tafsir "
                "santri PTD Ar-Rahman."
            ),
            "content": "\n\n".join(
                (
                    (
                        "Kualitas hafalan dan pemahaman Al-Qur'an di "
                        "Pesantren Tahfidz & Digital (PTD) Ar-Rahman terus "
                        "dibuktikan melalui evaluasi berjenjang dan "
                        "kompetisi tingkat nasional. Salah satu agenda rutin "
                        "unggulan pesantren adalah pelaksanaan Tasmi' "
                        "Al-Qur'an 10 Juz Bil Ghoib Sekali Duduk, seperti "
                        "yang telah dituntaskan oleh santri mukim Angkatan 1, "
                        "Ashraf El-Haq, yang menyetorkan Juz 1 hingga Juz 10 "
                        "dalam satu majelis mulai pukul 05.00 hingga 11.00 "
                        "WIB dan disiarkan secara langsung melalui Zoom serta "
                        "Instagram Live."
                    ),
                    (
                        "Tidak hanya unggul dalam kelancaran hafalan, santri "
                        "PTD Ar-Rahman juga menorehkan prestasi membanggakan "
                        "di tingkat nasional. Ananda Alvito Syarman Siregar "
                        "berhasil meraih Medali Emas dalam ajang Olimpiade "
                        "Tafsir Qur'an Tingkat Nasional. Capaian ganda "
                        "antara kekuatan tahfidz dan kedalaman tafsir ini "
                        "mencerminkan komitmen PTD Ar-Rahman dalam mencetak "
                        "generasi Qur'ani yang cerdas dan berwawasan luas."
                    ),
                )
            ),
            "author": "",
        },
    },
    {
        "slug": "evaluasi-kompetensi-digital-ujian-praktik-iot-dan-basis-data",
        "category": "Teknologi Digital",
        "date": "2024-12-10",
        "content": {
            "title": (
                "Evaluasi Kompetensi Digital: Santri PTD Ar-Rahman Jalani "
                "Ujian Praktik IoT dan Basis Data"
            ),
            "excerpt": (
                "Pada Sumatif Akhir Semester, santri PTD Ar-Rahman menjalani "
                "ujian praktik perakitan dan pemrograman IoT serta "
                "perancangan dan pengelolaan basis data di laboratorium."
            ),
            "content": "\n\n".join(
                (
                    (
                        "Sebagai pesantren yang memadukan tahfidz Al-Qur'an "
                        "dan teknologi informasi, pelaksanaan Sumatif Akhir "
                        "Semester (SAS) di PTD Ar-Rahman tidak hanya menguji "
                        "capaian hafalan Al-Qur'an, tetapi juga menguji "
                        "keterampilan rekayasa teknologi para santri secara "
                        "langsung di laboratorium."
                    ),
                    (
                        "Dalam rangkaian ujian praktik IT, para santri "
                        "mendemonstrasikan proyek perakitan dan pemrograman "
                        "Internet of Things (IoT) yang mengintegrasikan "
                        "perangkat keras (hardware) dengan logika "
                        "pemrograman. Selain itu, santri juga menjalani ujian "
                        "praktik perancangan serta pengelolaan Basis Data "
                        "(Database) untuk memastikan mereka menguasai "
                        "fondasi penyimpanan data aplikasi modern. Melalui "
                        "metode evaluasi berbasis praktik ini, setiap santri "
                        "terlatih menyelesaikan permasalahan teknis secara "
                        "mandiri dan terukur."
                    ),
                )
            ),
            "author": "",
        },
    },
    {
        "slug": (
            "gerakan-lingkungan-indah-ramadhan-dan-ukhuwah-santri-ptd-ar-rahman"
        ),
        "category": "Kehidupan Asrama",
        "date": "2025-03-12",
        "content": {
            "title": (
                "Menjemput Keberkahan Ramadhan dan Memupuk Ukhuwah Lewat "
                "Kegiatan Kebersamaan Santri PTD Ar-Rahman"
            ),
            "excerpt": (
                "Gerakan Lingkungan Indah menyambut Ramadhan dan aneka lomba "
                "kemerdekaan HUT RI ke-80 memupuk kemandirian, kebersamaan, "
                "dan kepemimpinan santri PTD Ar-Rahman."
            ),
            "content": "\n\n".join(
                (
                    (
                        "Pembentukan karakter kepemimpinan, kemandirian, dan "
                        "kebersamaan menjadi bagian tak terpisahkan dari "
                        "keseharian santri di Pesantren Tahfidz & Digital "
                        "(PTD) Ar-Rahman. Menjelang datangnya bulan suci "
                        "Ramadhan (Kamis, 27 Februari 2025 ba'da shalat "
                        "Dhuha), seluruh santri dan asatidz melaksanakan "
                        "program Gerakan Lingkungan Indah (GLI) dengan "
                        "bergotong royong membersihkan seluruh area gedung "
                        "pesantren."
                    ),
                    (
                        "Para santri dibagi ke dalam empat kelompok kerja "
                        "terpadu: Kelompok 1 menata area rooftop gedung "
                        "pesantren; Kelompok 2 membersihkan Lantai 3 yang "
                        "meliputi musholla, tempat wudhu, ruang kelas, dan "
                        "ruang programming; Kelompok 3 merapikan Lantai 2 "
                        "yang mencakup kamar santri, aula, dan ruang podcast; "
                        "sedangkan Kelompok 4 membersihkan Lantai 1 mulai "
                        "dari ruang makan, kantin, kamar mandi, ruang tamu, "
                        "hingga teras depan."
                    ),
                    (
                        "Selain budaya gotong royong, keakraban santri juga "
                        "terus dipupuk melalui berbagai perlombaan "
                        "ketangkasan dan kekompakan pada peringatan HUT "
                        "Kemerdekaan RI ke-80 (17 Agustus 2025), seperti "
                        "estafet sarung, balap kardus, dan tarik tambang "
                        "yang ditutup dengan doa bersama serta pembagian "
                        "hadiah."
                    ),
                )
            ),
            "author": "",
        },
    },
]


# ── Program (kit §1.3, 4 program) ────────────────────────────────────────

PROGRAMS: list[dict] = [
    {
        "slug": "tahfidz-al-quran",
        "icon": "book-quran",
        "content": {
            "title": "Tahfidz Al-Qur'an 30 Juz & Ulumul Qur'an",
            "tagline": (
                "Dari Tahsin Bacaan hingga Ujian Terbuka Tasmi' 30 Juz "
                "Bil Ghoib"
            ),
            "desc": (
                "Program inti yang membimbing santri putra menghafal 30 juz "
                "Al-Qur'an secara bertahap, terukur, dan terjaga sanad "
                "bacaannya. Setiap santri mengikuti halaqah harian ba'da "
                "Subuh dan waktu-waktu utama, dievaluasi melalui Sumatif "
                "Akhir Semester (SAS) Tahfidz, serta diuji ketahanan "
                "hafalannya melalui sidang Tasmi' 10 Juz Sekali Duduk "
                "hingga Tasmi' 30 Juz Bil Ghoib dan seremoni Khotmul Qur'an. "
                "Selain hafalan, santri juga mendalami Tafsir Al-Qur'an "
                "hingga mampu berprestasi di tingkat olimpiade nasional."
            ),
            "duration": "Program Terpadu 6 Tahun",
            "level": "30 Juz Mutqin",
            "highlights": [
                (
                    "Tradisi Tasmi' Bil Ghoib Terbuka: Uji hafalan 10 juz "
                    "sekali duduk hingga 30 juz penuh yang disiarkan "
                    "langsung (live streaming Zoom & Instagram) sebagai "
                    "bukti transparansi mutu hafalan."
                ),
                (
                    "Pendalaman Tafsir Al-Qur'an: Membekali santri dengan "
                    "pemahaman kandungan ayat, terbukti dengan raihan Medali "
                    "Emas Olimpiade Tafsir Qur'an Nasional oleh santri PTD."
                ),
                (
                    "Halaqah Intensif Bersama Muhaffidz: Pendampingan "
                    "setoran ziyadah (hafalan baru) dan muraja'ah "
                    "(pengulangan) setiap hari."
                ),
                (
                    "Wisuda Khotmul Qur'an: Apresiasi resmi bagi santri "
                    "yang telah merampungkan setoran 30 juz di hadapan "
                    "orang tua dan dewan pengasuh."
                ),
            ],
            "curriculum": [
                "Tahsin & Tajwid Terapan",
                "Ziyadah & Muraja'ah Harian",
                "Tasmi' Berjenjang (5, 10, 15, 30 Juz)",
                "Tafsir & Ulumul Qur'an",
            ],
            "outcomes": [
                (
                    "Hafal 30 juz Al-Qur'an secara mutqin, memahami tafsir "
                    "ayat pilihan, dan siap menjadi imam serta pengajar "
                    "Al-Qur'an di masyarakat."
                ),
            ],
        },
    },
    {
        "slug": "teknologi-digital",
        "icon": "laptop-code",
        "content": {
            "title": "Rekayasa Teknologi Digital, Web & IoT",
            "tagline": (
                "Menguasai Pemrograman Modern, Basis Data, dan Internet of "
                "Things di Ruang Programming Pesantren"
            ),
            "desc": (
                "Program Teknologi Digital di PTD Ar-Rahman dirancang "
                "melampaui pelajaran komputer sekolah biasa. Bertempat di "
                "Ruang Programming Lantai 3, para santri mempelajari "
                "rekayasa perangkat lunak modern, perancangan Basis Data, "
                "pengembangan aplikasi web dengan framework industri "
                "seperti Next.js, hingga perakitan perangkat cerdas "
                "Internet of Things (IoT). Santri juga mendapatkan wawasan "
                "langsung melalui Sharing Session bersama praktisi "
                "teknologi (seperti Senior Software Engineer Gojek) dan "
                "diuji melalui Ujian Praktik IT pada setiap akhir semester."
            ),
            "duration": "Program Terpadu 6 Tahun",
            "level": "Praktik Lab & Industri",
            "highlights": [
                (
                    "Kurikulum Web Modern (Next.js & Basis Data): "
                    "Mempelajari arsitektur aplikasi web skala besar, "
                    "pengelolaan database, optimasi performa, dan integrasi "
                    "API."
                ),
                (
                    "Praktikum Internet of Things (IoT): Eksperimen "
                    "langsung merakit sensor, mikrokontroler, dan "
                    "pemrograman perangkat keras cerdas."
                ),
                (
                    "Mentoring Praktisi Industri: Kuliah tamu (Sharing "
                    "Session) bersama engineer berpengalaman dari "
                    "perusahaan teknologi terkemuka."
                ),
                (
                    "Ujian Praktik Berbasis Proyek: Evaluasi Sumatif Akhir "
                    "Semester (SAS) melalui demonstrasi proyek coding, "
                    "basis data, dan IoT secara langsung."
                ),
            ],
            "curriculum": [
                "Algoritma & Pemrograman Web (HTML/CSS/JS/React/Next.js)",
                "Perancangan & Manajemen Basis Data",
                "Perakitan & Pemrograman IoT",
                "Produksi Konten Kreatif & Podcast Digital",
            ],
            "outcomes": [
                (
                    "Mampu membangun aplikasi web fungsional, merancang "
                    "sistem basis data, membuat prototipe perangkat IoT, "
                    "dan memiliki portofolio proyek IT yang siap bersaing."
                ),
            ],
        },
    },
    {
        "slug": "bilingual",
        "icon": "language",
        "content": {
            "title": "Program Bilingual (Bahasa Arab & Inggris Aktif)",
            "tagline": (
                "Cakap Berkomunikasi Global dan Tampil Percaya Diri di "
                "Panggung Pidato Tiga Bahasa"
            ),
            "desc": (
                "Program Bilingual membentuk kebiasaan berkomunikasi aktif "
                "dalam Bahasa Arab dan Bahasa Inggris di lingkungan asrama "
                "PTD Ar-Rahman. Selain menunjang pemahaman ayat-ayat "
                "Al-Qur'an dan dokumentasi pemrograman internasional, "
                "santri dilatih secara khusus dalam seni berpidato (public "
                "speaking) Bahasa Arab, Bahasa Inggris, dan Bahasa "
                "Indonesia-serta aktif diterjunkan mewakili pesantren dalam "
                "ajang perlombaan antar-pondok pesantren seperti PORSENI "
                "PONTREN."
            ),
            "duration": "Program Terpadu 6 Tahun",
            "level": "Komunikasi & Khitobah Aktif",
            "highlights": [
                (
                    "Pelatihan Pidato 3 Bahasa (Arab, Inggris, Indonesia): "
                    "Pembinaan intensif retorika dan muhadharah untuk "
                    "mencetak orator muda yang komunikatif."
                ),
                (
                    "Bahasa Arab untuk Studi Al-Qur'an & Tafsir: Memperkuat "
                    "penguasaan kosakata Al-Qur'an agar santri lebih cepat "
                    "menghafal dan meresapi makna ayat."
                ),
                (
                    "Bahasa Inggris untuk Teknologi Informasi: Membiasakan "
                    "santri membaca dokumentasi pemrograman, istilah "
                    "software engineering, dan literatur global."
                ),
                (
                    "Delegasi Kompetisi Eksternal: Kesempatan tampil "
                    "mewakili PTD Ar-Rahman pada cabang lomba pidato Bahasa "
                    "Arab dan Inggris tingkat kabupaten hingga nasional."
                ),
            ],
            "curriculum": [
                "Muhadatsah & Kaidah Bahasa Arab",
                "English for Communication & Tech",
                "Retorika Pidato Dwibahasa",
                "Seni Kaligrafi & Ekspresi Literasi",
            ],
            "outcomes": [
                (
                    "Mampu berpidato dan berkomunikasi aktif dalam Bahasa "
                    "Arab dan Inggris, serta mampu mempelajari kitab "
                    "keislaman maupun referensi IT berbahasa asing."
                ),
            ],
        },
    },
    {
        "slug": "akademi-kepemimpinan",
        "icon": "users",
        "content": {
            "title": "Akademi Kepemimpinan, Karakter & Kemandirian Santri",
            "tagline": (
                "Membentuk Pemimpin Muda yang Mandiri, Disiplin, Sportif, "
                "dan Peduli Lingkungan"
            ),
            "desc": (
                "Akademi Kepemimpinan di PTD Ar-Rahman menempa mentalitas, "
                "adab, dan kemandirian santri putra melalui kehidupan "
                "berasrama yang terstruktur. Santri dilatih bertanggung "
                "jawab atas kebersihan dan kerapian lingkungan melalui "
                "program Gerakan Lingkungan Indah (GLI), mengasah "
                "sportivitas lewat olahraga prestasi (futsal, badminton, "
                "tenis meja), mengembangkan dakwah kreatif di Ruang "
                "Podcast, serta mengikuti kegiatan rihlah dan perlombaan "
                "kebangsaan."
            ),
            "duration": "Program Terpadu 6 Tahun",
            "level": "Karakter Asrama & Organisasi",
            "highlights": [
                (
                    "Budaya Kemandirian & Gerakan Lingkungan Indah (GLI): "
                    "Pembagian tanggung jawab terorganisir dalam merawat "
                    "seluruh area pesantren dari lantai 1 hingga rooftop."
                ),
                (
                    "Pembinaan Olahraga & Sportivitas: Pelatihan rutin "
                    "cabang olahraga futsal, badminton, dan tenis meja "
                    "hingga berlaga di ajang PORSENI Pondok Pesantren."
                ),
                (
                    "Komunikasi Dakwah via Ruang Podcast: Melatih "
                    "kepemimpinan opini dan kemampuan berbicara di depan "
                    "kamera/mikrofon melalui fasilitas studio podcast "
                    "pesantren."
                ),
                (
                    "Ukhuwah, Rihlah & Semangat Kebangsaan: Kegiatan "
                    "tadabbur alam (rihlah), peringatan Hari Santri, dan "
                    "perlombaan kemerdekaan untuk memupuk kerja sama tim."
                ),
            ],
            "curriculum": [
                "Adab & Akhlak Keseharian Santri",
                "Kepemimpinan Kelompok & Manajemen Asrama",
                "Dakwah Digital & Podcast",
                "Olahraga Prestasi & Rihlah Alam",
            ],
            "outcomes": [
                (
                    "Pribadi muslim yang disiplin waktu, mandiri, tangguh "
                    "secara fisik dan mental, serta siap memimpin kerja tim "
                    "di masyarakat."
                ),
            ],
        },
    },
]

# Peta sumber gambar dummy → slug program kit (dipakai saat mengganti konten).
PROGRAM_IMAGE_SOURCE: dict[str, str | None] = {
    "tahfidz-al-quran": "tahfidz",
    "teknologi-digital": "digital",
    "bilingual": None,
    "akademi-kepemimpinan": "leadership",
}


# ── Fasilitas (kit §1.4, 8 ruangan) ──────────────────────────────────────

FACILITIES: list[dict] = [
    {
        "category": "tech",
        "content": {
            "name": "Ruang Programming (Lantai 3)",
            "desc": (
                "Laboratorium khusus tempat santri belajar penulisan kode "
                "(coding), pengembangan web Next.js, pengelolaan basis "
                "data, dan ujian praktik Internet of Things (IoT)."
            ),
            "features": [
                "Ruang kelas pemrograman khusus di Lantai 3",
                "Fasilitas praktik pengembangan web, database, & IoT",
                "Ruang diskusi proyek teknologi santri",
            ],
        },
    },
    {
        "category": "worship",
        "content": {
            "name": "Musholla & Area Halaqah (Lantai 3)",
            "desc": (
                "Pusat ibadah shalat berjamaah, dzikir, serta halaqah "
                "setoran tahfidz harian dan pelaksanaan ujian Tasmi' "
                "Bil Ghoib sekali duduk."
            ),
            "features": [
                "Musholla tenang dan kondusif di Lantai 3",
                "Tempat wudhu terintegrasi di lantai yang sama",
                "Area halaqah setoran ziyadah dan muraja'ah",
            ],
        },
    },
    {
        "category": "tech",
        "content": {
            "name": "Ruang Podcast & Kreatif (Lantai 2)",
            "desc": (
                "Studio produksi audio-visual bagi santri untuk melatih "
                "public speaking, merekam konten dakwah digital, dan "
                "menyiarkan kegiatan pesantren."
            ),
            "features": [
                "Ruang khusus produksi podcast di Lantai 2",
                "Sarana latihan pidato 3 bahasa & dakwah kreatif",
                "Dukungan penyiaran live streaming acara Tasmi'",
            ],
        },
    },
    {
        "category": "academic",
        "content": {
            "name": "Aula Serbaguna Pesantren (Lantai 2)",
            "desc": (
                "Ruang pertemuan luas untuk kegiatan Sharing Session "
                "bersama praktisi industri, ujian terbuka, pembekalan "
                "santri, dan agenda kebersamaan."
            ),
            "features": [
                "Terletak strategis di Lantai 2 dekat area santri",
                "Lokasi Sharing Session & seminar teknologi",
                "Ruang evaluasi dan pertemuan komite pesantren",
            ],
        },
    },
    {
        "category": "boarding",
        "content": {
            "name": "Kamar Asrama Santri Putra (Lantai 2)",
            "desc": (
                "Hunian asrama santri mukim yang teratur dan nyaman, "
                "menjadi tempat istirahat sekaligus pembentukan disiplin "
                "harian dan budaya hidup bersih."
            ),
            "features": [
                "Kamar santri representatif di Lantai 2",
                "Terjaga kebersihannya melalui program rutin GLI",
                "Pendampingan kemandirian oleh pembimbing asrama",
            ],
        },
    },
    {
        "category": "academic",
        "content": {
            "name": "Ruang Kelas Akademik (Lantai 3)",
            "desc": (
                "Ruang belajar tatap muka untuk pendalaman materi dirosah "
                "islamiyah, tafsir Al-Qur'an, bahasa Arab-Inggris, dan mata "
                "pelajaran akademik."
            ),
            "features": [
                "Terletak di Lantai 3 berdampingan dengan Musholla",
                "Lingkungan tenang yang mendukung fokus belajar",
                "Sarana evaluasi Sumatif Akhir Semester (SAS)",
            ],
        },
    },
    {
        "category": "boarding",
        "content": {
            "name": "Ruang Makan, Kantin & Ruang Tamu (Lantai 1)",
            "desc": (
                "Area layanan domestik di lantai dasar untuk memenuhi "
                "kebutuhan nutrisi harian santri serta menyambut kunjungan "
                "orang tua/wali santri."
            ),
            "features": [
                "Ruang makan bersama & kantin sehat di Lantai 1",
                "Ruang tamu dan teras depan yang ramah keluarga",
                "Fasilitas kamar mandi dan sanitasi lantai dasar",
            ],
        },
    },
    {
        "category": "sports",
        "content": {
            "name": "Area Rooftop & Sarana Olahraga",
            "desc": (
                "Ruang terbuka di puncak gedung dan area olahraga untuk "
                "menjaga kebugaran fisik santri melalui latihan futsal, "
                "badminton, tenis meja, dan perlombaan."
            ),
            "features": [
                "Area terbuka rooftop gedung pesantren",
                "Sarana latihan futsal, badminton, dan tenis meja",
                "Area kegiatan perlombaan santri & apel pagi",
            ],
        },
    },
]


# ── Staff (kit §1.2C & §1.7) ─────────────────────────────────────────────

STAFF: list[dict] = [
    {
        "id": "staff-kit-ziyad-khairy",
        "role": "leader",
        "content": {
            "name": "Ustadz Ziyad Khairy",
            "position": "Mudir Pesantren",
            "bio": (
                "Mudir Pesantren Tahfidz & Digital (PTD) Ar-Rahman. "
                "Memimpin pembinaan santri putra menuju hafalan 30 juz "
                "Al-Qur'an secara mutqin sekaligus penguasaan rekayasa "
                "teknologi digital."
            ),
            "expertise": [],
            "parentId": None,
            "order": 1,
        },
    },
    {
        "id": "staff-kit-leo-latul-agusta",
        "role": "leader",
        "content": {
            "name": "Leo Latul Agusta",
            "position": "Direktur Pendidikan",
            "bio": (
                "Direktur Pendidikan PTD Ar-Rahman. Menakhodai kurikulum "
                "terpadu 6 tahun yang memadukan tahfidz Al-Qur'an, "
                "teknologi digital, bilingual, dan akademi kepemimpinan."
            ),
            "expertise": [],
            "parentId": "staff-kit-ziyad-khairy",
            "order": 2,
        },
    },
    {
        "id": "staff-kit-nur",
        "role": "teacher",
        "content": {
            "name": "Ustadz Nur",
            "position": "Pembimbing Santri",
            "bio": (
                "Pembimbing santri PTD Ar-Rahman. Mendampingi pembinaan "
                "karakter, kedisiplinan asrama, serta pengembangan bakat "
                "bahasa, seni, dan olahraga santri."
            ),
            "expertise": [],
            "parentId": "staff-kit-ziyad-khairy",
            "order": 3,
        },
    },
]


# ── Prestasi (kit §1.5) ──────────────────────────────────────────────────
# `year` adalah kolom angka; rentang "2024 / 2025" memakai tahun akhir.

ACHIEVEMENTS: list[dict] = [
    {
        "year": 2025,
        "content": {
            "title": (
                "Delegasi 6 Cabang Lomba pada PORSENI PONTREN 2025 "
                "Kabupaten Bekasi"
            ),
            "desc": (
                "Sebanyak 19 santri PTD Ar-Rahman tampil mewakili pesantren "
                "dalam ajang Pekan Olahraga dan Seni Antar Pondok Pesantren "
                "(PORSENI PONTREN) Kabupaten Bekasi di Pesantren Darul "
                "Azhar, Setu (bersaing dengan 73 pesantren dan lebih dari "
                "2.100 santri) pada cabang Pidato Bahasa Arab, Pidato "
                "Bahasa Inggris, Pidato Bahasa Indonesia, Kaligrafi, "
                "Badminton, Futsal, dan Tenis Meja."
            ),
            "scope": "Kabupaten / Antar-Pesantren",
        },
    },
    {
        "year": 2025,
        "content": {
            "title": "Medali Emas Olimpiade Tafsir Qur'an Tingkat Nasional",
            "desc": (
                "Diraih oleh santri PTD Ar-Rahman, Alvito Syarman Siregar, "
                "yang berhasil meraih Medali Emas dalam ajang kompetisi "
                "Olimpiade Tafsir Al-Qur'an Tingkat Nasional."
            ),
            "scope": "Nasional",
        },
    },
    {
        "year": 2024,
        "content": {
            "title": (
                "Khotmatul Qur'an & Tasmi' 30 Juz Bil Ghoib "
                "(Alvito Syarman Siregar)"
            ),
            "desc": (
                "Menuntaskan ujian setoran hafalan Al-Qur'an 30 Juz Bil "
                "Ghoib (Juz 1-30) pada 3-4 Juni 2024 di Kampus PTD "
                "Ar-Rahman Mangunjaya, Tambun Selatan, dilanjutkan prosesi "
                "Khotmul Qur'an pada 5 Juni 2024."
            ),
            "scope": "Institusi / Publik",
        },
    },
    {
        "year": 2024,
        "content": {
            "title": (
                "Khotmatul Qur'an & Tasmi' 30 Juz Bil Ghoib "
                "(Muhammad Ardan Sunda)"
            ),
            "desc": (
                "Menuntaskan ujian setoran hafalan Al-Qur'an 30 Juz Bil "
                "Ghoib (Juz 1-30) pada 3-4 Juni 2024 di Kampus PTD "
                "Ar-Rahman Mangunjaya, Tambun Selatan, dilanjutkan prosesi "
                "Khotmul Qur'an pada 5 Juni 2024."
            ),
            "scope": "Institusi / Publik",
        },
    },
    {
        "year": 2024,
        "content": {
            "title": (
                "Tasmi' Al-Qur'an 10 Juz Bil Ghoib Sekali Duduk "
                "(Ashraf El-Haq)"
            ),
            "desc": (
                "Santri mukim Angkatan 1 PTD Ar-Rahman berhasil "
                "menyetorkan hafalan 10 Juz Bil Ghoib Sekali Duduk (Juz 1 "
                "s.d. Juz 10) mulai pukul 05.00 hingga 11.00 WIB yang "
                "disiarkan secara langsung melalui Zoom dan Instagram "
                "Live."
            ),
            "scope": "Institusi / Publik",
        },
    },
]


# ── Kontak & pengaturan (kit §1.7) ───────────────────────────────────────

CONTACT_PHONE_PRIMARY = "(021) 812-8361-2352"
CONTACT_PHONE_SECONDARY = "0812-8361-2352"
CONTACT_EMAIL_PRIMARY = "info@arrahmanic.org"
CONTACT_CAMPUS_NOTE = "(Kampus Asrama: Mangunjaya, Tambun Selatan, Bekasi)"

ABOUT_PREVIEW_TEXT = (
    "Dirintis sejak Januari 2020 dan memulai Kegiatan Belajar Mengajar "
    "(KBM) resmi berstandar Kemendikbud pada Agustus 2021, Pesantren "
    "Tahfidz & Digital (PTD) Ar-Rahman hadir khusus untuk mendidik "
    "generasi muda muslim putra. Di bawah kepemimpinan Mudir Ustadz "
    "Ziyad Khairy, kami membina santri agar mampu menuntaskan hafalan "
    "30 juz Al-Qur'an secara mutqin sekaligus menguasai keterampilan "
    "pemrograman web, basis data, dan Internet of Things (IoT)."
)


# ── Landing PPDB (kit §1.8) ──────────────────────────────────────────────

PPDB_JALUR: list[dict] = [
    {
        "id": "ppdbjalur-1",
        "icon": "GraduationCap",
        "content": {
            "order": 1,
            "accent": "emerald",
            "kicker": "Seleksi Reguler Berbasis Minat",
            "title": "Jalur Reguler",
            "desc": (
                "Bagi calon santri putra yang siap mengikuti pembinaan "
                "terpadu tahfidz 30 juz dan teknologi informasi dari "
                "tingkat dasar hingga mahir."
            ),
            "items": [],
            "cta_label": "Daftar Jalur Reguler",
            "cta_href": "/register",
        },
    },
    {
        "id": "ppdbjalur-2",
        "icon": "Award",
        "content": {
            "order": 2,
            "accent": "amber",
            "kicker": "Uji Tahfidz 1:1",
            "title": "Jalur Prestasi Tahfidz",
            "desc": (
                "Bagi calon santri putra yang telah memiliki bekal hafalan "
                "Al-Qur'an dan siap diuji pada sesi Tahfidz 1:1."
            ),
            "items": [],
            "cta_label": "Daftar Jalur Prestasi Tahfidz",
            "cta_href": "/register",
        },
    },
    {
        "id": "ppdbjalur-3",
        "icon": "Laptop",
        "content": {
            "order": 3,
            "accent": "sky",
            "kicker": "Prestasi Olimpiade & Minat Teknologi",
            "title": "Jalur Prestasi Akademik & Digital",
            "desc": (
                "Bagi calon santri putra yang memiliki prestasi olimpiade "
                "sains/tafsir, bahasa, atau minat kuat di bidang "
                "pemrograman dan teknologi."
            ),
            "items": [],
            "cta_label": "Daftar Jalur Prestasi Akademik",
            "cta_href": "/register",
        },
    },
    {
        "id": "ppdbjalur-4",
        "icon": "Users",
        "content": {
            "order": 4,
            "accent": "violet",
            "kicker": "Program Orang Tua Asuh",
            "title": "Jalur Beasiswa / Orang Tua Asuh",
            "desc": (
                "Dukungan pendidikan bagi calon santri putra yatim/dhuafa "
                "yang memiliki tekad kuat menghafal Al-Qur'an 30 juz di "
                "PTD Ar-Rahman."
            ),
            "items": [],
            "cta_label": "Daftar Jalur Beasiswa",
            "cta_href": "/register",
        },
    },
]

PPDB_PILLARS: list[dict] = [
    {
        "id": "ppdbpillar-1",
        "content": {
            "order": 1,
            "title": "Tahfidz Al-Qur'an",
            "desc": (
                "Pembinaan tahsin, ziyadah, dan muraja'ah harian hingga "
                "ujian terbuka Tasmi' 10 Juz & 30 Juz Bil Ghoib serta "
                "kajian Tafsir Al-Qur'an."
            ),
        },
    },
    {
        "id": "ppdbpillar-2",
        "content": {
            "order": 2,
            "title": "Teknologi Digital",
            "desc": (
                "Praktik langsung di Ruang Programming mencakup "
                "pengembangan web modern (Next.js), pengelolaan Basis "
                "Data, dan perakitan Internet of Things (IoT)."
            ),
        },
    },
    {
        "id": "ppdbpillar-3",
        "content": {
            "order": 3,
            "title": "Bilingual (Arab & Inggris)",
            "desc": (
                "Pembiasaan komunikasi aktif dwibahasa dan pelatihan "
                "pidato (khitobah) Bahasa Arab serta Inggris untuk "
                "kompetisi maupun literasi global."
            ),
        },
    },
    {
        "id": "ppdbpillar-4",
        "content": {
            "order": 4,
            "title": "Akademi Kepemimpinan",
            "desc": (
                "Pembentukan adab santri, kemandirian asrama melalui "
                "Gerakan Lingkungan Indah (GLI), olahraga prestasi, dan "
                "produksi dakwah di Ruang Podcast."
            ),
        },
    },
]

# Field hero pada singleton `ppdb-copy` (dipakai komponen hero 3D /ppdb).
PPDB_COPY_HERO: dict[str, str] = {
    "hero_title": (
        "Tempat Tumbuhnya Para Hafidz 30 Juz\n"
        "yang Menguasai Rekayasa Teknologi"
    ),
    "hero_desc": (
        "Pendidikan pesantren putra terpadu 6 tahun dengan rekam jejak "
        "nyata kelulusan Tasmi' 30 Juz Bil Ghoib, prestasi Olimpiade "
        "Tafsir Nasional, dan pembelajaran teknologi langsung dari "
        "praktisi industri. Pendaftaran dibuka sesuai periode dan kuota "
        "gelombang aktif."
    ),
    "hero_proof": "30 Juz | 6 Tahun | 4 Pilar",
    "hero_cta_label": "Daftar Online Sekarang",
    "hero_cta_href": "/register",
    "hero_register_label": "Daftar PPDB",
    "hero_register_href": "/register",
}

# Isi dasar `ppdb-copy` (seed 0042) untuk database yang baris copy-nya belum ada.
PPDB_COPY_BASE: dict[str, str] = {
    "jalur_title": "Jalur Pendaftaran Santri Baru",
    "jalur_desc": (
        "Pilihlah jalur penerimaan yang sesuai dengan minat dan potensi "
        "ananda untuk bergabung bersama Pesantren Tahfidz Qur'an dan "
        "Digital Ar-Rahman."
    ),
    "kurikulum_title": "Kurikulum Holistik Masa Depan",
    "kurikulum_desc": (
        "Keseimbangan antara ilmu ukhrawi dan bekal teknologi kontemporer"
    ),
    "alur_kicker": "Langkah Mudah",
    "alur_title": "Alur Pendaftaran PPDB",
    "cta_title": "Konsultasi Pendaftaran Santri Baru?",
    "cta_desc": (
        "Tim panitia PPDB siap melayani pertanyaan mengenai kurikulum, "
        "program beasiswa, dan kunjungan kampus pesantren."
    ),
    "cta_primary_label": "Hubungi Panitia",
    "cta_primary_href": "/contact",
    "cta_secondary_label": "Lihat Fasilitas & Asrama",
    "cta_secondary_href": "/programs",
}

# Judul seed 0042 — penanda bahwa baris belum disunting admin.
OLD_JALUR_TITLES: dict[str, str] = {
    "ppdbjalur-1": "Jalur Prestasi Tahfidz & Sains",
    "ppdbjalur-2": "Jalur Reguler Terpadu",
}

OLD_PILLAR_TITLES: dict[str, str] = {
    "ppdbpillar-1": "Tahfidz Mutqin 30 Juz",
    "ppdbpillar-2": "Coding & AI Academy",
    "ppdbpillar-3": "Bahasa Internasional",
    "ppdbpillar-4": "Adab & Kepemimpinan",
}

# (key, label, icon, sort_order) — sama dengan daftar di 0042.
PPDB_PAGES: list[tuple[str, str, str, int]] = [
    ("ppdb-jalur", "Jalur PPDB", "Route", 110),
    ("ppdb-pillars", "Pilar Kurikulum", "LayoutGrid", 120),
    ("ppdb-steps", "Alur PPDB", "ListOrdered", 130),
    ("ppdb-copy", "Teks & CTA PPDB", "Type", 140),
]


# ── Helper ───────────────────────────────────────────────────────────────


def _table_names(bind: sa.engine.Connection) -> set[str]:
    return set(sa.inspect(bind).get_table_names())


def _table(bind: sa.engine.Connection, name: str) -> sa.Table:
    return sa.Table(name, sa.MetaData(), autoload_with=bind)


def _all_stock(rows: list, image_index: int) -> bool:
    """True bila tabel non-kosong dan SEMUA barisnya memakai foto stok Unsplash."""
    return bool(rows) and all(
        (row[image_index] or "").startswith(UNSPLASH_PREFIX) for row in rows
    )


def _insert_rows(bind: sa.engine.Connection, table_name: str, rows: list[dict]) -> None:
    table = _table(bind, table_name)
    now = datetime.now()
    for row in rows:
        values = dict(row)
        if "content" in values:
            values["content"] = json.dumps(values["content"], ensure_ascii=False)
        values.setdefault("created_at", now)
        values["updated_at"] = now
        bind.execute(table.insert().values(**values))


def _load_json(value: str | None) -> dict:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, ValueError):
        return {}


def _subtitle_from_unsplash(bind: sa.engine.Connection, table_name: str) -> bool:
    """Deteksi konten dummy: semua baris (jika ada) memakai gambar Unsplash.

    Mengembalikan True bila tabel kosong atau seluruh isinya dummy stok —
    artinya aman diganti konten kit. Tabel dengan konten asli mengembalikan
    False dan tidak boleh disentuh.
    """
    if table_name not in _table_names(bind):
        return False
    table = _table(bind, table_name)
    rows = bind.execute(sa.select(table.c.image)).all()
    return not rows or all(
        (row[0] or "").startswith(UNSPLASH_PREFIX) for row in rows
    )


# ── Seed per entitas ─────────────────────────────────────────────────────


def _seed_hero_slides(bind: sa.engine.Connection) -> None:
    if "hero_slides" not in _table_names(bind):
        return
    table = _table(bind, "hero_slides")
    if bind.execute(sa.select(sa.func.count()).select_from(table)).scalar():
        return
    payload = [
        {
            "id": f"heroslide-{index + 1}",
            "image": None,
            "order": index + 1,
            "content": slide["content"],
        }
        for index, slide in enumerate(HERO_SLIDES)
    ]
    _insert_rows(bind, "hero_slides", payload)


def _seed_news(bind: sa.engine.Connection) -> None:
    if not _subtitle_from_unsplash(bind, "news_articles"):
        return
    table = _table(bind, "news_articles")
    images: list[str | None] = []
    rows = bind.execute(sa.select(table.c.id, table.c.image)).all()
    if rows:
        images = [row[1] for row in sorted(rows, key=lambda row: row[0])]
        bind.execute(table.delete())
    payload = [
        {
            "id": f"news-kit-{index + 1}",
            "slug": article["slug"],
            "image": images[index] if index < len(images) else None,
            "category": article["category"],
            "date": article["date"],
            "gallery": None,
            "content": article["content"],
        }
        for index, article in enumerate(NEWS_ARTICLES)
    ]
    _insert_rows(bind, "news_articles", payload)


def _seed_programs(bind: sa.engine.Connection) -> None:
    if not _subtitle_from_unsplash(bind, "programs"):
        return
    table = _table(bind, "programs")
    images: dict[str, str | None] = {}
    rows = bind.execute(sa.select(table.c.id, table.c.slug, table.c.image)).all()
    if rows:
        images = {row[1]: row[2] for row in rows}
        bind.execute(table.delete())
    payload = []
    for index, program in enumerate(PROGRAMS):
        source = PROGRAM_IMAGE_SOURCE.get(program["slug"])
        payload.append(
            {
                "id": f"program-kit-{program['slug']}",
                "slug": program["slug"],
                "icon": program["icon"],
                "image": images.get(source) if source else None,
                "order": index + 1,
                "content": program["content"],
            }
        )
    _insert_rows(bind, "programs", payload)


def _seed_facilities(bind: sa.engine.Connection) -> None:
    if not _subtitle_from_unsplash(bind, "facilities"):
        return
    table = _table(bind, "facilities")
    # Gambar dummy dipasangkan berdasarkan kategori agar foto tetap relevan
    # dengan ruangan kit (mis. foto laboratorium -> Ruang Programming).
    pool: list[tuple[str, str | None]] = []
    rows = bind.execute(
        sa.select(table.c.id, table.c.image, table.c.category)
    ).all()
    if rows:
        pool = sorted((row[2] or "", row[1]) for row in rows)
        bind.execute(table.delete())
    payload = []
    for index, facility in enumerate(FACILITIES):
        pick = next(
            (item for item in pool if item[0] == facility["category"]), None
        )
        if pick is None and pool:
            # Sisa tanpa kategori sepadan: ambil elemen terakhir agar gambar
            # olahraga tetap tersedia untuk fasilitas olahraga berikutnya.
            pick = pool[-1]
        image: str | None = None
        if pick is not None:
            pool.remove(pick)
            image = pick[1]
        payload.append(
            {
                "id": f"fasilitas-kit-{index + 1}",
                "image": image,
                "category": facility["category"],
                "content": facility["content"],
            }
        )
    _insert_rows(bind, "facilities", payload)


def _seed_staff(bind: sa.engine.Connection) -> None:
    if not _subtitle_from_unsplash(bind, "staff"):
        return
    table = _table(bind, "staff")
    if bind.execute(sa.select(sa.func.count()).select_from(table)).scalar():
        bind.execute(table.delete())
    # Foto stok bukan wajah orang yang sebenarnya — kartu staff memakai
    # inisial nama sampai admin mengunggah foto resmi.
    payload = [
        {
            "id": member["id"],
            "image": None,
            "role": member["role"],
            "content": member["content"],
        }
        for member in STAFF
    ]
    _insert_rows(bind, "staff", payload)


def _seed_achievements(bind: sa.engine.Connection) -> None:
    if not _subtitle_from_unsplash(bind, "achievements"):
        return
    table = _table(bind, "achievements")
    images: list[str | None] = []
    rows = bind.execute(sa.select(table.c.id, table.c.image)).all()
    if rows:
        images = [row[1] for row in sorted(rows, key=lambda row: row[0])]
        bind.execute(table.delete())
    payload = [
        {
            "id": f"prestasi-kit-{index + 1}",
            "year": achievement["year"],
            "image": images[index] if index < len(images) else None,
            "content": achievement["content"],
        }
        for index, achievement in enumerate(ACHIEVEMENTS)
    ]
    _insert_rows(bind, "achievements", payload)


def _seed_contact(bind: sa.engine.Connection) -> None:
    if "contact_info" not in _table_names(bind):
        return
    table = _table(bind, "contact_info")
    row = bind.execute(sa.select(table).limit(1)).mappings().first()
    if not row:
        return
    values: dict[str, str] = {}
    if (row["phone_primary"] or "").strip() != CONTACT_PHONE_PRIMARY:
        values["phone_primary"] = CONTACT_PHONE_PRIMARY
    if (row["phone_secondary"] or "").strip() != CONTACT_PHONE_SECONDARY:
        values["phone_secondary"] = CONTACT_PHONE_SECONDARY
    if (row["email_primary"] or "").strip().lower() != CONTACT_EMAIL_PRIMARY:
        values["email_primary"] = CONTACT_EMAIL_PRIMARY
    address = (row["address"] or "").rstrip()
    if "Mangunjaya" not in address:
        values["address"] = f"{address} {CONTACT_CAMPUS_NOTE}".strip()
    if values:
        values["updated_at"] = datetime.now()
        bind.execute(
            table.update().where(table.c.id == row["id"]).values(**values)
        )


def _seed_about_text(bind: sa.engine.Connection) -> None:
    """Isi teks AboutPreview beranda; jangan menimpa bila admin sudah mengisi."""
    if "site_settings" not in _table_names(bind):
        return
    table = _table(bind, "site_settings")
    existing = bind.execute(
        sa.select(table.c.key).where(table.c.key == "about_text")
    ).first()
    if existing:
        return
    now = datetime.now()
    bind.execute(
        table.insert().values(
            key="about_text",
            value=ABOUT_PREVIEW_TEXT,
            created_at=now,
            updated_at=now,
        )
    )


# ── Landing PPDB ─────────────────────────────────────────────────────────


def _ensure_ppdb_tables(bind: sa.engine.Connection) -> None:
    """Buat tabel `ppdb_*` bila belum ada (mis. DB ter-stamp 0042 tanpa DDL-nya)."""
    existing = _table_names(bind)

    if "ppdb_jalur_cards" not in existing:
        op.create_table(
            "ppdb_jalur_cards",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("icon", sa.String(length=255), nullable=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    if "ppdb_pillars" not in existing:
        op.create_table(
            "ppdb_pillars",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("icon", sa.String(length=255), nullable=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    if "ppdb_steps" not in existing:
        op.create_table(
            "ppdb_steps",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )

    if "ppdb_page_copy" not in existing:
        op.create_table(
            "ppdb_page_copy",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("content", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
        )


def _ensure_ppdb_pages(bind: sa.engine.Connection) -> None:
    """Daftarkan halaman permission PPDB agar bisa di-grant dari Superadmin."""
    tables = _table_names(bind)
    if "pages" not in tables or "modules" not in tables:
        return

    modules = _table(bind, "modules")
    pages = _table(bind, "pages")
    module = bind.execute(
        sa.select(modules.c.id).where(modules.c.key == "companyprofile")
    ).first()
    if not module:
        return

    now = datetime.now()
    for key, label, icon, sort_order in PPDB_PAGES:
        existing = bind.execute(
            sa.select(pages.c.id).where(
                pages.c.module_id == module.id, pages.c.key == key
            )
        ).first()
        values = {
            "label": label,
            "icon": icon,
            "sort_order": sort_order,
            "updated_at": now,
        }
        if existing:
            bind.execute(
                pages.update().where(pages.c.id == existing.id).values(**values)
            )
        else:
            bind.execute(
                pages.insert().values(
                    id=str(uuid4()),
                    module_id=module.id,
                    key=key,
                    created_at=now,
                    **values,
                )
            )


def _seed_ppdb_jalur(bind: sa.engine.Connection) -> None:
    table = _table(bind, "ppdb_jalur_cards")
    current = {
        row[0]: _load_json(row[1])
        for row in bind.execute(sa.select(table.c.id, table.c.content)).all()
    }
    now = datetime.now()
    for card in PPDB_JALUR:
        content = json.dumps(card["content"], ensure_ascii=False)
        if card["id"] in current:
            if current[card["id"]].get("title") != OLD_JALUR_TITLES.get(card["id"]):
                continue  # sudah disunting admin — biarkan
            bind.execute(
                table.update()
                .where(table.c.id == card["id"])
                .values(icon=card["icon"], content=content, updated_at=now)
            )
        else:
            bind.execute(
                table.insert().values(
                    id=card["id"],
                    icon=card["icon"],
                    content=content,
                    created_at=now,
                    updated_at=now,
                )
            )


def _seed_ppdb_pillars(bind: sa.engine.Connection) -> None:
    table = _table(bind, "ppdb_pillars")
    current = {
        row[0]: _load_json(row[1])
        for row in bind.execute(sa.select(table.c.id, table.c.content)).all()
    }
    now = datetime.now()
    for pillar in PPDB_PILLARS:
        content = json.dumps(pillar["content"], ensure_ascii=False)
        if pillar["id"] in current:
            if current[pillar["id"]].get("title") != OLD_PILLAR_TITLES.get(
                pillar["id"]
            ):
                continue
            bind.execute(
                table.update()
                .where(table.c.id == pillar["id"])
                .values(content=content, updated_at=now)
            )
        else:
            bind.execute(
                table.insert().values(
                    id=pillar["id"],
                    icon=None,
                    content=content,
                    created_at=now,
                    updated_at=now,
                )
            )


def _seed_ppdb_copy(bind: sa.engine.Connection) -> None:
    table = _table(bind, "ppdb_page_copy")
    row = bind.execute(sa.select(table.c.id, table.c.content).limit(1)).first()
    now = datetime.now()
    if not row:
        content = {**PPDB_COPY_BASE, **PPDB_COPY_HERO}
        bind.execute(
            table.insert().values(
                id="ppdbcopy-main",
                content=json.dumps(content, ensure_ascii=False),
                created_at=now,
                updated_at=now,
            )
        )
        return

    parsed = _load_json(row[1])
    changed = False
    for key, value in PPDB_COPY_HERO.items():
        if not str(parsed.get(key) or "").strip():
            parsed[key] = value
            changed = True
    if changed:
        bind.execute(
            table.update()
            .where(table.c.id == row[0])
            .values(content=json.dumps(parsed, ensure_ascii=False), updated_at=now)
        )


# ── Migrasi ──────────────────────────────────────────────────────────────


def upgrade() -> None:
    bind = op.get_bind()
    _seed_hero_slides(bind)
    _seed_news(bind)
    _seed_programs(bind)
    _seed_facilities(bind)
    _seed_staff(bind)
    _seed_achievements(bind)
    _seed_contact(bind)
    _seed_about_text(bind)
    _ensure_ppdb_tables(bind)
    _ensure_ppdb_pages(bind)
    _seed_ppdb_jalur(bind)
    _seed_ppdb_pillars(bind)
    _seed_ppdb_copy(bind)


def downgrade() -> None:
    bind = op.get_bind()
    names = _table_names(bind)

    for table_name in (
        "news_articles",
        "programs",
        "facilities",
        "staff",
        "achievements",
        "hero_slides",
    ):
        if table_name not in names:
            continue
        table = _table(bind, table_name)
        for prefix in KIT_ID_PREFIXES:
            bind.execute(table.delete().where(table.c.id.like(f"{prefix}%")))

    if "ppdb_jalur_cards" in names:
        table = _table(bind, "ppdb_jalur_cards")
        bind.execute(
            table.delete().where(table.c.id.in_(["ppdbjalur-3", "ppdbjalur-4"]))
        )

    if "site_settings" in names:
        table = _table(bind, "site_settings")
        bind.execute(
            table.delete().where(
                table.c.key == "about_text", table.c.value == ABOUT_PREVIEW_TEXT
            )
        )
