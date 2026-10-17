# Integrasi Webhook Google Apps Script TIU (Google Form ke PPDB)

Dokumen ini memuat panduan integrasi penilaian Tes Intelegensia Umum (TIU) antara Google Form Quiz dan backend PPDB Pesantren Ar-Rahman melalui Google Apps Script.

Sistem PPDB Ar-Rahman mengintegrasikan Google Form dengan **Safe Exam Browser (SEB)** menggunakan metode **Pre-filled URL**. Peserta mengerjakan ujian langsung di Google Form melalui SEB, dan saat kuis di-submit, Apps Script akan otomatis mengirimkan skor ke backend PPDB secara real-time.

---

## 1. Persiapan Google Form

1. Buat Google Form untuk soal kuis TIU.
2. Buka menu **Settings (Setelan)** di Google Form, aktifkan **"Make this a quiz" (Jadikan kuis)**.
3. Tentukan bobot poin pada kunci jawaban untuk masing-masing soal (misal total skor maksimal 100).
4. Tambahkan 1 pertanyaan bertipe **Short Answer (Jawaban Singkat)** dengan judul:
   * **Judul:** `Token Ujian` (wajib mengandung kata `Token`).
   * **Setelan:** Aktifkan **Required (Wajib diisi)**.
5. Klik menu titik tiga (⋮) di kanan atas Google Form, lalu pilih **Get pre-filled link (Dapatkan link yang terisi sebelumnya)**.
6. Masukkan sembarang teks pada kolom pertanyaan `Token Ujian` (misalnya: `TEST_TOKEN`), lalu klik tombol **Get link (Dapatkan link)** di bagian bawah dan klik **Copy link (Salin link)**.
7. Di backoffice PPDB (menu **Pengaturan TIU**):
   * Ganti bagian `TEST_TOKEN` pada link tadi dengan `{token}`.
   * Contoh hasil link: `https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.123456789={token}`
   * Tempelkan URL tersebut ke kolom **Pre-filled URL Google Form**, atur **Durasi Ujian** (menit), dan masukkan **Webhook Secret** (minimal 16 karakter). Simpan pengaturan.

---

## 2. Pemasangan Google Apps Script

1. Buka kembali Google Form kuis Anda.
2. Klik menu titik tiga (⋮) di kanan atas Google Form, lalu pilih **Script editor (Editor skrip)**.
3. Hapus kode default di file `Code.gs`, lalu tempelkan skrip berikut:

```javascript
function onSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  if (responses.length === 0) return;

  var latestResponse = responses[responses.length - 1];
  var itemResponses = latestResponse.getItemResponses();

  // 1. Ekstrak token pendaftar dari jawaban pertanyaan "Token"
  var token = "";
  for (var i = 0; i < itemResponses.length; i++) {
    var item = itemResponses[i].getItem();
    var title = item.getTitle().toLowerCase();
    if (title.indexOf("token") !== -1) {
      token = String(itemResponses[i].getResponse()).trim();
      break;
    }
  }

  if (!token) {
    Logger.log("Token tidak ditemukan pada respon terbaru.");
    return;
  }

  // 2. Hitung total skor kuis
  var score = 0;
  var gradableResponses = latestResponse.getGradableItemResponses();
  for (var j = 0; j < gradableResponses.length; j++) {
    score += gradableResponses[j].getScore() || 0;
  }

  // 3. Konfigurasi Endpoint & Secret
  var props = PropertiesService.getScriptProperties();
  var apiUrl = props.getProperty("PPDB_API_BASE") || "https://api.ptdarrahman.sch.id";
  var secret = props.getProperty("TIU_WEBHOOK_SECRET") || "MASUKKAN_SECRET_DI_PROPERTIES";

  var endpoint = apiUrl.replace(/\/+$/, "") + "/ppdb/webhook/tiu";

  var payload = {
    token: token,
    score: score
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "X-TIU-Secret": secret
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(endpoint, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();
    Logger.log("Status Webhook: " + statusCode + ", Respon: " + responseText);
  } catch (err) {
    Logger.log("Gagal mengirim webhook TIU: " + err);
  }
}
```

---

## 3. Konfigurasi Script Properties & Trigger

### A. Set Script Properties
1. Di halaman Apps Script, buka menu **Project Settings (Ikon Gerigi) → Script Properties (Properti skrip)**.
2. Tambahkan properti berikut:
   * `PPDB_API_BASE`: URL domain backend PPDB (contoh: `https://api.ptdarrahman.sch.id` atau URL IP backend Anda, tanpa slash di akhir).
   * `TIU_WEBHOOK_SECRET`: Secret yang sama persis dengan yang Anda simpan di halaman **Pengaturan TIU** backoffice PPDB.
3. Klik **Save script properties (Simpan properti skrip)**.

### B. Pasang Trigger Otomatis
1. Di bilah menu kiri Apps Script, klik menu **Triggers (Ikon Jam Weker)**.
2. Klik tombol **Add Trigger (Tambahkan Pemicu)** di pojok kanan bawah.
3. Atur konfigurasi pemicu:
   * **Choose which function to run:** `onSubmit`
   * **Choose which deployment should run:** `Head`
   * **Select event source:** `From form (Dari formulir)`
   * **Select event type:** `On form submit (Saat mengirimkan formulir)`
4. Klik **Save (Simpan)**. Berikan izin akses Google Account jika diminta.

---

## 4. Cara Kerja & Validasi di Backend PPDB

1. **Unduh SEB:** Saat pendaftar mengklik tombol **"Download Konfigurasi SEB"** di dashboard PPDB, sistem membuat attempt baru dengan token unik sekali pakai dan mencatat waktu mulai ujian.
2. **Kunci Layar:** File `.seb` otomatis membuka Google Form dengan token terisi pada kolom token pertanyaan. Layar terkunci dan URL bar tersembunyi.
3. **Pengiriman Webhook:** Ketika pendaftar mengklik tombol **Submit**, Apps Script langsung menembak `POST /ppdb/webhook/tiu`.
4. **Validasi Backend:**
   * Memeriksa header `X-TIU-Secret`.
   * Memvalidasi kepemilikan token attempt.
   * Memeriksa durasi: `waktu_submit <= waktu_mulai + durasi_menit + 5_menit_toleransi`.
5. **Hasil:** Skor tersimpan ke database, pemicu notifikasi WhatsApp `tiu_result_ready` terkirim ke pendaftar, dan jadwal Session 1:1 Tahfidz otomatis terbuka bagi pendaftar jalur TIU.

---

## 5. Penjelasan Durasi Ujian: Google Form vs Sistem PPDB

Perlu dipahami perbedaan fungsi antara pengaturan waktu di Google Form dan pengaturan **Durasi Ujian** di Backoffice PPDB.

- **Timer di Google Form (Quiz):** Bersifat visual/pengingat untuk peserta. Bisa menampilkan countdown di form. Ini **bukan** menjadi batas mutlak validasi di sisi server PPDB.
- **Durasi Ujian di Backoffice PPDB (Server-side Guard):** Digunakan sebagai **validasi waktu di sisi server**. Saat pendaftar mengunduh file `.seb` (`GET /selection/applicants/me/tiu-seb`), sistem membuat `PPDBTIUAttempt` dan mencatat `created_at` sebagai **waktu mulai ujian**.

**Aturan validasi waktu:**

```text
waktu_submit <= waktu_mulai + durasi_menit + 5_menit_toleransi
```

Artinya, webhook (`POST /ppdb/webhook/tiu`) **akan menolak** pengiriman nilai jika selisih waktu antara submit (Apps Script) dan waktu download `.seb` melebihi `(durasi + 5 menit)`. Penolakan ini mengembalikan HTTP `400` dengan pesan *"Ujian melewati batas waktu"* dan **nilai tidak akan tersimpan ke database**.

**Tujuan:** Melindungi integritas ujian dari kasus seperti peserta membuka ulang `.seb` terlalu lama setelah download, koneksi terputus berkepanjangan sebelum submit, atau upaya manipulasi waktu. Jadi meskipun Google Form bisa diatur timernya, sistem PPDB tetap melakukan **validasi waktu server-side** sebagai benteng pengaman.

---

## 6. Verifikasi & Uji Coba Sebelum Ujian (Wajib Dilakukan)

Sistem TIU **tidak bisa** dipastikan hanya dengan copy-paste. Lakukan verifikasi terkontrol berikut **minimal 1x di lingkungan staging/test** (atau sebelum hari H) untuk memastikan koneksi, secret dan penyimpanan data sudah bekerja dengan pasti.

### A. Verifikasi Backend Langsung (Tanpa Google/SEB) — Paling Cepat

Langkah ini untuk memastikan API webhook bisa menerima data dengan benar.

#### 1) Dapatkan token attempt valid
1. Login sebagai pendaftar (role `applicant`), buka tahap **Ujian TIU** di dashboard.
2. Klik **Download Konfigurasi SEB (.seb)**. Sistem akan membuat `PPDBTIUAttempt` baru (timer server mulai berjalan).
3. Buka file `ujian-tiu.seb` dengan Text Editor (Notepad/VS Code), cari `startURL`. Di dalam URL tersebut terdapat token yang sudah terisi (contoh: `...&entry.XXXXXX=abc123-uuid-...`). **Salin token tersebut**.

#### 2) Uji webhook via cURL
Gunakan terminal untuk mensimulasikan pengiriman dari Apps Script. Ganti nilai sesuai lingkungan Anda.

```bash
curl -X POST "https://api.ptdarrahman.sch.id/ppdb/webhook/tiu" \
  -H "Content-Type: application/json" \
  -H "X-TIU-Secret: TIU_WEBHOOK_SECRET_ANDA" \
  -d '{"token":"TOKEN_DARI_STARTURL","score":80}'
```

**Hasil yang diharapkan:**

| Response | Arti | Tindakan |
|---|---|---|
| `200 OK` + `{"status":"success","score":80}` | **Berhasil.** Backend terhubung & data tersimpan. | Periksa di Dashboard/Admin Penilaian → nilai `80` muncul. Lanjut ke langkah B. |
| `401 Unauthorized` ("Secret tidak valid") | Secret tidak cocok (spasi/beda huruf). | Cocokkan `X-TIU-Secret` dengan Webhook Secret di Backoffice & Script Properties. |
| `404 Not Found` ("Attempt tidak ditemukan") | Token tidak ditemukan/tidak sesuai attempt aktif. | Unduh `.seb` **baru** (fresh token), ambil token dari startURL terbaru, coba ulang. |
| `400 Bad Request` ("Ujian melewati batas waktu") | Submit melebihi `(durasi+5 menit)` sejak download SEB. | Lakukan pengujian dalam waktu < durasi+5 menit setelah download `.seb`. |

> **Tips:** Jika lolos poin A (curl return 200), artinya **backend, validasi secret dan penyimpanan nilai sudah pasti bekerja**.

### B. Verifikasi Google Apps Script (Pastikan Endpoint Benar)

Poin paling sering salah: **endpoint webhook harus mengarah ke API publik**, bukan `localhost`.

1. Buka **Google Form → Extensions → Apps Script**.
2. Pastikan `PPDB_API_BASE` di **Project Settings → Script Properties** menggunakan **URL API publik** (contoh: `https://api.ptdarrahman.sch.id`). **Jangan** menggunakan `http://localhost:5174` atau origin dev.
3. Pastikan `TIU_WEBHOOK_SECRET` sama persis dengan yang disimpan di Backoffice PPDB.
4. Pasang Trigger: `Add Trigger → onSubmit → From form → On form submit`.
5. Lakukan submit uji kecil di Google Form (isi token sembarang + beberapa jawaban). Buka **Apps Script → Executions**.
6. Periksa eksekusi terbaru: harus berstatus **Completed**. Klik eksekusi tersebut untuk melihat log (contoh: `Status Webhook: 200, Respon: {"status":"success",...}`).

**Target:** `Status Webhook: 200`. Jika muncul 401/404/400 di log Executions, ikuti tabel di poin A untuk memperbaikinya.

### C. Verifikasi End-to-End via Safe Exam Browser (Final Check)

Setelah A dan B lolos:

1. Login sebagai pendaftar → Unduh `.seb` **baru** (fresh token).
2. Jalankan file `ujian-tiu.seb` di perangkat Windows/macOS yang sudah terinstall SEB.
3. Pastikan SEB terbuka dan langsung menampilkan Google Form dengan **kolom Token terisi otomatis**.
4. Kerjakan beberapa soal sederhana, lalu klik **Submit**.
5. Dalam hitungan detik, periksa **Dashboard Pendaftar** atau **Admin → Penilaian**. **Nilai TIU harus langsung muncul**.

Jika langkah C ini lolos, maka alur TIU terkonfirmasi **berfungsi dengan benar dan siap digunakan** saat ujian berlangsung.
