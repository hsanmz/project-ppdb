# Panduan Ujian TIU (Safe Exam Browser)

Pendaftaran PPDB Pesantren Ar-Rahman jalur tertentu mewajibkan peserta untuk mengikuti Tes Intelegensia Umum (TIU) secara online. Untuk menjaga integritas ujian, tes ini dilaksanakan menggunakan aplikasi **Safe Exam Browser (SEB)**.

SEB akan mengunci layar komputer Anda sehingga Anda tidak bisa membuka aplikasi lain atau tab baru selama ujian berlangsung.

## 1. Spesifikasi Perangkat yang Didukung
- Komputer Desktop atau Laptop
- Sistem Operasi: **Windows** (Windows 10/11) atau **macOS**
- *Perangkat seluler (HP/Tablet) Android atau iOS tidak didukung.*

## 2. Cara Mengunduh & Instalasi SEB
1. Buka browser Anda dan kunjungi situs resmi: [https://safeexambrowser.org/download_en.html](https://safeexambrowser.org/download_en.html)
2. Klik tombol **Download** sesuai dengan sistem operasi komputer Anda (Pilih versi Windows atau macOS terbaru).
3. Setelah file installer selesai diunduh, klik ganda (double-click) file tersebut.
4. Ikuti petunjuk instalasi di layar (klik *Next / Install* hingga selesai).
5. Anda tidak perlu membuka aplikasi SEB secara manual setelah diinstal. Cukup biarkan terinstal di komputer.

## 3. Cara Memulai Ujian di Portal PPDB
1. Login ke *Dashboard* Pendaftar PPDB Ar-Rahman.
2. Masuk ke tahap **Ujian / Seleksi**.
3. Pastikan Anda sudah siap secara fisik dan mental, serta memiliki koneksi internet yang stabil.
4. Klik tombol **Download Konfigurasi SEB (.seb)**.
   *PERHATIAN: Waktu hitung mundur ujian (timer server) akan mulai berjalan sejak Anda mengeklik tombol ini!*
5. File bernama `ujian_tiu.seb` akan terunduh.
6. Klik ganda file `ujian_tiu.seb` tersebut. Komputer akan otomatis membuka SEB, mengunci layar, dan menampilkan soal ujian Google Form yang sudah terhubung dengan akun Anda.
7. Silakan kerjakan soal, lalu klik **Submit** jika sudah selesai.

## 4. Solusi Masalah / Error (Troubleshooting)

### A. File `.seb` Terbuka di Aplikasi Lain (Bukan SEB)
**Penyebab:** Ekstensi file `.seb` belum terasosiasi dengan aplikasi Safe Exam Browser.
**Solusi:**
- **Windows:** Klik kanan pada file `ujian_tiu.seb`, pilih **Open With...** -> **Choose another app**. Cari dan pilih "Safe Exam Browser", lalu centang *Always use this app to open .seb files*.
- **macOS:** Klik kanan file `ujian_tiu.seb`, pilih **Get Info**. Pada bagian *Open with:*, pilih "Safe Exam Browser", lalu klik tombol *Change All...*.

### B. SEB Meminta *Password* Saat Dibuka
**Penyebab:** Terjadi konflik konfigurasi atau file konfigurasi rusak/usang.
**Solusi:** Tutup SEB, hapus file `ujian_tiu.seb` yang lama. Kembali ke Dashboard PPDB, dan unduh ulang konfigurasinya. (Catatan: Waktu Anda terus berjalan, segera lakukan langkah ini).

### C. Komputer Tiba-tiba *Hang* atau Koneksi Internet Terputus Saat Ujian
**Penyebab:** Masalah teknis dari sisi perangkat atau jaringan peserta.
**Solusi:**
- Jangan panik. Anda bisa me-restart komputer dengan menekan dan menahan tombol Power/Daya.
- Setelah komputer menyala kembali dan koneksi internet terhubung, segera buka kembali file `ujian_tiu.seb` (jika waktu ujian Anda belum habis).
- Google Form memiliki fitur *auto-save* (bila Anda login Google) atau Anda mungkin harus mengulang pengisian jika form diatur tanpa login. Segera isi jawaban dan klik Submit sebelum batas waktu backend habis. Waktu timer di server PPDB tidak akan berhenti atau di-reset saat Anda offline.

### D. Muncul Peringatan "Session Not Allowed" atau Terblokir Antivirus
**Penyebab:** Antivirus pihak ketiga memblokir SEB karena SEB membatasi sistem.
**Solusi:** Matikan sementara (Disable) Antivirus Anda selama ujian berlangsung. SEB aman dan dirancang khusus untuk ujian institusi resmi di seluruh dunia.

---

## 5. Memastikan Ujian TIU Berfungsi dengan Benar (Verifikasi Wajib)

Sistem ini **tidak cukup hanya di-copy-paste**. Sebelum ujian dilaksanakan (terutama saat uji coba/perdana), panitia wajib melakukan verifikasi singkat untuk memastikan koneksi, pengiriman data, dan penyimpanan nilai berjalan dengan pasti.

### 5.1 Penjelasan Singkat: Timer Google Form vs Durasi Server

Perlu dipahami perbedaan berikut agar tidak keliru saat mengatur waktu ujian:

- **Timer di Google Form (Kuis):** Hanya berfungsi sebagai **penghitung mundur (countdown)** yang terlihat oleh peserta. Timer ini **tidak divalidasi** oleh server PPDB.
- **Durasi Ujian di Backoffice PPDB:** Berfungsi sebagai **validasi waktu di sisi server (server-side guard)**. Saat peserta mengunduh file `.seb`, sistem mencatat **waktu mulai ujian** (`created_at`). Ketika nilai dikirim via webhook, sistem akan memeriksa selisih waktu submit:

  ```text
  waktu_submit <= waktu_mulai + durasi_menit + 5_menit_toleransi
  ```

Jika peserta mengirim jawaban **melebihi batas waktu tersebut**, webhook akan **menolak** dengan HTTP `400` ("Ujian melewati batas waktu") dan **nilai tidak akan tersimpan** ke database. Tujuannya untuk menjaga integritas ujian (mengantisipasi koneksi terputus lama, SEB dibuka ulang dalam jeda lama, atau keterlambatan submit).

> **Catatan:** Pengaturan timer di Google Form bisa digunakan sebagai pengingat visual, namun **bukan** menggantikan validasi server-side di atas.

### 5.2 Checklist Verifikasi Wajib (3 Langkah Singkat)

Lakukan minimal sekali sebelum hari-H untuk mendapatkan kepastian sistem bekerja dengan benar.

#### Langkah 1 – Pastikan Backend Bisa Menerima Nilai (Uji Cepat via cURL)
Ini langkah tercepat untuk memastikan koneksi & secret sudah benar.

1. Login sebagai **Pendaftar** → Buka tahap **Ujian TIU** → Klik **Download Konfigurasi SEB (.seb)** (buat attempt fresh).
2. Buka file `ujian-tiu.seb` dengan **Notepad/Text Editor** → cari `startURL`, lalu **salin token** yang tertera di dalam URL tersebut (bagian `entry.XXXXXX=...`).
3. Buka Terminal/Command Prompt, jalankan perintah berikut (ganti nilainya):

```bash
curl -X POST "https://api.ptdarrahman.sch.id/ppdb/webhook/tiu" \
  -H "Content-Type: application/json" \
  -H "X-TIU-Secret: WEBHOOK_SECRET_DI_BACKOFFICE" \
  -d '{"token":"TOKEN_DARI_STARTURL","score":75}'
```

**Hasil yang diharapkan:**

| Respons | Keterangan | Tindakan |
|---|---|---|
| `200 OK` + `{"status":"success","score":75}` | **Berhasil.** Data tersimpan dengan pasti. | Lanjut ke Langkah 2. |
| `401` ("Secret tidak valid") | Secret webhook tidak cocok. | Cocokkan `X-TIU-Secret` dengan Webhook Secret di Pengaturan TIU Backoffice. |
| `404` ("Attempt tidak ditemukan") | Token tidak valid/expired. | Unduh `.seb` **baru**, ambil token terbaru, ulangi. |
| `400` ("Ujian melewati batas waktu") | Terlambat kirim (> durasi+5 menit). | Uji ulang dalam waktu < (durasi+5 menit) setelah download `.seb`. |

> Jika Langkah 1 berhasil (200), **backend sudah pasti berfungsi dengan benar**.

#### Langkah 2 – Pastikan Google Apps Script Terhubung ke Endpoint Publik
1. Di Google Form, buka **Extensions → Apps Script → Project Settings → Script Properties**.
2. Pastikan `PPDB_API_BASE` adalah **URL API publik** (contoh: `https://api.ptdarrahman.sch.id`). **Jangan** biarkan mengarah ke `localhost`.
3. Pastikan `TIU_WEBHOOK_SECRET` **sama persis** dengan yang diatur di Backoffice PPDB.
4. Buat submit uji kecil di Google Form, lalu cek **Apps Script → Executions**. Eksekusi terakhir harus berstatus **Completed** dan menampilkan log `Status Webhook: 200`.
5. Jika log menunjukkan 200 → koneksi Google Form ↔ API **sudah benar**.

#### Langkah 3 – Uji End-to-End via SEB (Verifikasi Terpenting)
1. Login sebagai Pendaftar → **Download Konfigurasi SEB (.seb)** baru.
2. Jalankan file `ujian-tiu.seb` di komputer (Windows/macOS) yang sudah terinstal SEB.
3. Pastikan SEB terbuka dan **Google Form langsung tampil dengan kolom Token terisi otomatis**.
4. Kerjakan beberapa soal, lalu klik **Submit**.
5. Segera periksa **Dashboard Pendaftar** atau **Admin → Penilaian**. **Nilai TIU harus muncul dalam hitungan detik**.

**Jika Langkah 3 berhasil → sistem TIU terkonfirmasi berfungsi dengan benar dan siap digunakan saat ujian berlangsung.**
