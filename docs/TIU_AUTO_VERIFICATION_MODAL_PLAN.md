# Rencana Implementasi: Modal Verifikasi Otomatis TIU (Konektivitas & Kesiapan)

Tujuannya: bikin admin bisa klik **"Uji Koneksi & Verifikasi"** setelah isi `Pre-filled URL`, `Durasi`, `Webhook Secret` di halaman `/admin/tiu-settings`. Sistem yang akan menjalankan pengecekan bertahap, menampilkan animasi checklist (kiri animasi, kanan langkah), mencoret yang lolos, centang/silang, lalu evaluasi akhir (berhasil/gagal) dengan saran perbaikan.

## Konsep UX

- **Tombol baru**: Ganti atau tambahkan tombol "Simpan & Verifikasi" / "Uji Koneksi" (setelah validasi form).
- **Modal Verifikasi**: Fullscreen/dialog dengan 2 panel
  - Kiri: animasi (gear/connect dots/check) atau ilustrasi proses
  - Kanan: daftar langkah verifikasi, status tiap langkah (pending/in-progress/passed/failed/warn), bisa expand detail error + fix suggestion
- **Progres bertahap**: animasi step by step, auto-scroll ke langkah aktif
- **Hasil akhir**: "Siap Digunakan" (all passed) atau "Perlu Perbaikan" (ada failed) dengan tombol "Perbaiki" / "Coba Lagi" / "Tutup"

## Checklist yang akan diverifikasi sistem

Sistem harus bisa memverifikasi tanpa harus nyuruh admin jadi pendaftar beneran (gunakan data/config yg sudah disimpan + simulasi aman).

| Urutan | Langkah | Metode | Kriteria Lolos | Pesan Gagal + Saran |
|---|---|---|---|---|
| 1 | **Konfigurasi Tersimpan** | Backend cek DB | URL form + durasi + secret tersimpan & valid format | "URL Google Form belum diisi / format salah" + panduan ambil pre-filled URL |
| 2 | **Format URL Google Form** | Validasi regex | HTTPS, domain `docs.google.com` atau `forms.gle`, mengandung placeholder `{token}` | "URL harus mengandung {token} di query pre-filled" |
| 3 | **Webhook Secret** | Validasi | Minimal 16 karakter (kalo baru diisi) atau sudah ada yg tersimpan | "Webhook Secret minimal 16 karakter" |
| 4 | **Durasi Valid** | Validasi | Integer 1-1440 | "Durasi harus antara 1-1440 menit" |
| 5 | **Kesesuaian Secret** | Simulasi | Bandingkan dengan secret tersimpan (hanya saat bisa dicek) | "Secret belum disimpan/beda konteks" |
| 6 | **Endpoint Webhook Dapat Dijangkau (Reachability)** | HTTP HEAD/GET ringan atau POST test ke endpoint internal | API bisa resolve route `/ppdb/webhook/tiu` (tanpa harus kirim token valid) - atau test ke health | "Endpoint webhook tidak ditemukan/route error" |
| 7 | **Validasi Secret Webhook (Test Auth)** | Kirim request test dengan secret yg disimpan ke webhook (mode safe-test) | Backend menolak dengan **401** kalo secret salah ATAU menolak dengan **404** "Attempt tidak ditemukan" kalo secret bener tapi token dummy tidak ada. **Yang penting bukan 500** | "Secret tidak valid (401)" vs "Konfigurasi secret tidak konsisten" |
| 8 | **Apps Script Readiness Guide Check** | Static check | Cek struktur konfigurasi (base URL publik) - beri warning kalo terdeteksi localhost di konteks tertentu | "PPDB_API_BASE sebaiknya pakai URL API publik (bukan localhost)" |
| 9 | **SEB Flow Readiness** | Validasi logic | URL pre-filled + attempt flow bisa dibuat (cek fungsi generate SEB bisa diakses) | "File .seb belum bisa digenerate" |
| 10 | **Ringkasan & Rekomendasi** | Aggregasi | Hitung passed/failed/warn | Tampilkan aksi: "Coba perbaiki", "Lihat Panduan", "Uji End-to-End Manual" |

**Catatan penting:**
- Jangan kirim skor beneran ke pendaftar. Gunakan **dummy token** atau endpoint khusus `POST /ppdb/tiu-settings/verify` yg **hanya menguji validasi** (secret check + routing) tanpa menyimpan SelectionScore.
- Webhook yg ada saat ini butuh token attempt valid. Jadi endpoint verifikasi harus bisa bedain "secret salah" vs "token tidak ditemukan" tanpa menciptakan attempt sembarangan / tanpa menyimpan nilai.

## Backend

### Endpoint baru
Buat di `apps/api/src/modules/ppdb/router.py` (atau pisah service)

```python
POST /ppdb/tiu-settings/verify
Auth: require_ppdb_admin (CRUD)
Body: { google_form_url?, duration_minutes?, webhook_secret? } (bisa ambil dari form yg belum disimpan atau yg sudah disimpan)
Response:
{
  "overall": "passed" | "warning" | "failed",
  "checks": [
    { "key": "config_saved", "status": "passed|failed|warn|pending", "label": "Konfigurasi tersimpan", "detail": "...", "fix": "..." },
    ...
  ],
  "summary": { "passed": N, "failed": N, "warn": N },
  "recommendations": ["..."]
}
```

### Validasi di backend
- Cek setting tersimpan / yg dikirim
- Cek secret (bandingkan dengan DB; kalo secret dikirim di body, bisa diuji tanpa overwrite permanen)
- **Safe probe**: Kirim `POST /ppdb/webhook/tiu` internal dengan dummy token + header `X-TIU-Secret` yg diuji.
  - 401 → secret invalid
  - 404 → secret valid, route ok (token dummy ga ketemu) **INI YG DIANGGAP LULUS UNTUK "KONEKSI"**
  - 400 → tergantung; bisa jadi waktu dll
  - 500 → gagal
- Jangan commit nilai apapun ke `SelectionScore`. Cukup tracing/respon HTTP.

### Service
Tambahkan `TIUVerificationService` di `apps/api/src/services/ppdb_service.py` atau modul terpisah. Pisahkan logic verifikasi dari webhook utama.

## Frontend

### Halaman `apps/ppdb/src/pages/admin/ppdb/TIUSettingsPage.tsx`
- Tambahkan state: `verifyOpen`, `verifyLoading`, `verifyResult`
- Ubah tombol: "Simpan Pengaturan" → bisa jadi "Simpan & Uji Koneksi" atau tambah tombol "Uji Koneksi & Verifikasi" (secondary) setelah simpan
- Modal baru: `TIUVerificationModal` (buat komponen baru `apps/ppdb/src/pages/admin/ppdb/components/TIUVerificationModal.tsx`)

### Komponen Modal
Props:
```tsx
interface TIUVerificationModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formData: { googleFormUrl: string; durationMinutes: number; webhookSecret: string };
  onRetry: () => void;
}
```

Tampilan:
- Header: "Verifikasi Koneksi TIU"
- Body 2 kol</article>
</main>
</body>
</html>
## Rencana Dokumen & Panduan yang Perlu Diupdate

Setelah implementasi, update hal-hal ini biar konsisten:

- **`apps/ppdb/src/pages/admin/ppdb/TIUSettingsPage.tsx`** — ganti "Panduan Integrasi" sisi kanan (step 4) dengan penjelasan "Sistem akan otomatis memverifikasi" + tombol arahan.
- **`packages/ui/src/components/ui/doc-sheet.tsx`** (`docKey="ppdb-tiu-settings"`) — tambah section "Verifikasi Otomatis" menjelaskan modal checklist, status per langkah, evaluasi akhir.
- **`docs/INTEGRASI_TIU_APPS_SCRIPT.md`** — tambahkan "Bagian 6b: Verifikasi Otomatis Melalui Backoffice" (bisa tetap pertahankan manual cURL sebagai fallback).
- **`docs/PANDUAN_UJIAN_TIU_SEB.md`** — update bagian 5 jadi lebih singkat: "Cukup klik Uji Koneksi & Verifikasi di Pengaturan TIU", pertahankan manual sebagai cadangan.
- **`apps/ppdb/AGENTS.md`** — tambahkan catatan fitur verifikasi otomatis TIU (opsional tapi disarankan).

## Prioritas Implementasi
1. Backend endpoint `POST /ppdb/tiu-settings/verify` (safe probe)
2. Frontend modal + UI checklist
3. Integrasi tombol "Uji Koneksi & Verifikasi" di TIUSettingsPage
4. Update dokumen & doc-sheet
5. Testing end-to-end (secret salah/bener, URL salah, durasi salah)

## Catatan Teknis
- Gun
## Risiko & Mitigasi
| Risiko | Mitigasi
|---|---|
| Webhook butuh token valid | Gunakan dummy token; anggap 404 + secret header valid sebagai "route + secret ok" |
| Endpoint bisa dipanggil sembarangan | Hanya require_ppdb_admin, rate-limit ringan |
| Admin nge-submit test berulang | Debounce/throttling UI, state loading |
| False positive | Jangan hanya cek reachability, cek response code + pola pesan |

## Kesimpulan
Dengan modal ini, **"cuma copas" jadi "coba & sistem validasi"**. Admin cukup isi 3 parameter, klik uji, liat checklist yang dicoret/centang, langsung tau apa yg masih kurang. Ini sejalan sama permintaan: sistem yang mastiin aman siap dipakai, bukan cuma dokumentasi.
