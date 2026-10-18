# DOCKER PRODUCTION RUNBOOK (VPS Linux)

Dokumen ini menjelaskan cara deploy production sistem PTDARRAHMAN di **server publik** (VPS Ubuntu/Debian) menggunakan Docker Engine + nginx + Let's Encrypt.

> Dibuat untuk jalur **PRODUCTION**, berbeda dari pola WSL2 lokal yang ada di [`docs/DOCKER_SETUP.md`](./DOCKER_SETUP.md).

## 1. Arsitektur

```text
Internet → nginx (80/443, satu-satunya publik)
  ├── companyprofile → companyprofile:3000 (Next.js)
  ├── ppdb           → berkas statis hasil `vite build`
  ├── superadmin     → berkas statis hasil `vite build`
  └── api            → api:8000 (FastAPI)

api → MySQL remote + redis
whatsapp → redis + api (internal only)
redis, wa_session, uploads → named volumes
certbot → renewal otomatis + challenge webroot
```

**Karakteristik:**
- Tidak ada port `3000`, `5173`, `5174`, `8080`, `3100`, `6379` yang diekspos ke host. Hanya `80` dan `443`.
- ppdb & superadmin disajikan sebagai file statis (bukan `vite preview`), benar-benar production-grade.
- Router per subdomain di-generate otomatis oleh nginx saat start (domain-agnostic).
- HTTPS wajib pakai Let's Encrypt.

## 2. Prasyarat

- Server Linux (Ubuntu 24.04 LTS / Debian 12) dengan Docker Engine + Docker Compose (plugin v2) terinstall.
- Akses root/SSH ke VPS.
- DNS **A/AAAA** sudah diarahkan ke IP VPS:
  - `ptdarrahman.sch.id` → IP VPS (companyprofile)
  - `ppdb.ptdarrahman.sch.id` → IP VPS
  - `admin.ptdarrahman.sch.id` → IP VPS (superadmin)
  - `api.ptdarrahman.sch.id` → IP VPS (API)
- MySQL remote (Hostinger/srv lain) siap, creds lengkap di `apps/api/.env`.
- Domain dapat berupa subdomain dari domain yang "numpang", semua A/AAAA diarahkan ke VPS.

## 3. Clone Repo di VPS

Repo WAJIB berada di **filesystem Linux** (ext4), bukan `/mnt/`.

```bash
cd ~
git clone <repo-url> project-ppdb
cd ~/project-ppdb
```

## 4. Siapkan file `.env`

Ada 3 file env terpisah: infrastruktur, backend, whatsapp.

### A. Infrastruktur (domain, build URL)
```bash
cp .env.prod.example .env.prod
nano .env.prod  # isi DOMAIN_* , PUBLIC_* , LETSENCRYPT_EMAIL
```

Pastikan `PUBLIC_*` mengacu ke URL HTTPS yang benar (akan di-bake ke bundle frontend saat build).

### B. Backend API
```bash
cp apps/api/.env.example apps/api/.env
nano apps/api/.env  # sesuaikan
```

**Wajib prod:**
- `APP_ENV=production`
- `MYSQL_*` → MySQL remote
- `REDIS_URL=redis://redis:6379/0` (sudah benar untuk jaringan internal Docker)
- `JWT_SECRET` (min 32 karakter) — `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `CRON_SECRET` (min 16 karakter)
- `COOKIE_SECURE=true` (nginx forward `X-Forwarded-Proto: https`)
- `PAKASIR_SLUG`, `PAKASIR_API_KEY`, `PAKASIR_WEBHOOK_SECRET` **wajib** terisi
- `CORS_ORIGINS` = daftar origin frontend publik. Contoh:
  ```
  https://ptdarrahman.sch.id,https://ppdb.ptdarrahman.sch.id,https://admin.ptdarrahman.sch.id
  ```
- `TIU_WEBHOOK_SECRET` (jika pakai webhook Apps Script)
- `WA_SERVICE_URL=http://whatsapp:3100`
- `WA_SERVICE_API_KEY` = sama dengan `API_KEY` di `apps/whatsapp/.env`
- `WA_WEBHOOK_SECRET` = sama dengan `WEBHOOK_SECRET` di `apps/whatsapp/.env`

### C. WhatsApp Microservice
```bash
cp apps/whatsapp/.env.example apps/whatsapp/.env
nano apps/whatsapp/.env  # sesuaikan
```

Wajib:
- `NODE_ENV=production`
- `CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` (image install Chromium sistem)
- `API_KEY` — sama persis dengan `WA_SERVICE_API_KEY` di API
- `WEBHOOK_SECRET` — sama persis dengan `WA_WEBHOOK_SECRET` di API
- `WEBHOOK_URL=http://api:8000/notifications/webhook/whatsapp`
- `REDIS_HOST=redis`, `REDIS_PORT=6379`, `REDIS_DB=1`

## 5. Build & Jalankan stack

Build pertama: semua service (nginx, companyprofile, api, whatsapp, redis, certbot).

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Tunggu beberapa menit (ppdb/superadmin di-build Vite + Next + pip install). Cek status:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f nginx
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
```

Sampai semua container `Up` (dan `api`/`whatsapp`/`companyprofile`/`redis` mencapai `healthy`).

**Catatan:** Saat pertama kali, nginx akan berjalan dalam mode **HTTP-only** (karena belum ada sertifikat Let's Encrypt). Situs tetap bisa diakses via `http://<domain>`, namun HTTPS belum aktif.

## 6. Menerbitkan sertifikat HTTPS (pertama kali)

Setelah DNS resolv ke VPS dan nginx bisa diakses port 80, jalankan helper script.

```bash
chmod +x scripts/prod-certs.sh
./scripts/prod-certs.sh
```

Script ini akan:
- Membaca `.env.prod` (domain + email)
- Menjalankan `certbot certonly --webroot` untuk ke-4 domain sekaligus
- Menyimpan sertifikat di volume `certbot_certs`
- Me-reload nginx sehingga konfigurasi beralih ke **HTTPS + redirect HTTP→HTTPS**

Verifikasi HTTPS:

```bash
curl -I https://$DOMAIN_PPDB      # ganti sesuai nilai .env.prod
curl -I https://$DOMAIN_SUPERADMIN
curl -I https://$DOMAIN_COMPANYPROFILE
curl -I https://$DOMAIN_API/health
```

Semua harus 200/301 (sesuai endpoint).

## 7. Scan QR WhatsApp

WA service memerlukan scanning QR sekali saja. Setelah whatsapp `healthy`, buka:

- Panel Superadmin (https://`DOMAIN_SUPERADMIN`) → menu WhatsApp → scan QR
- Atau CLI (opsional):
```bash
# ambil API_KEY dari apps/whatsapp/.env
API_KEY=$(grep -E '^API_KEY=' apps/whatsapp/.env | cut -d= -f2-)
curl -s -H "X-API-Key: $API_KEY" http://localhost:3100/api/session
curl -s -H "X-API-Key: $API_KEY" http://localhost:3100/api/session/qr/raw
```

> Perhatikan: `localhost:3100` hanya bisa diakses dari dalam VPS (internal). Gunakan panel Superadmin atau `curl` via SSH.

## 8. Operasional harian

### Nyalakan/stop/restart
```bash
# up tanpa rebuild (hanya kalau tidak ganti kode/build arg)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d

# rebuild + up (setelah ubah kode, atau ubah PUBLIC_* di .env.prod)
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# stop semua
docker compose --env-file .env.prod -f docker-compose.prod.yml stop

# down (hentikan & hapus container; volumes TETAP)
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

### Log & troubleshooting
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f nginx
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api --since 1h
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f companyprofile
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f whatsapp
```

### Certbot renewal
Service `certbot` berjalan otomatis (renew setiap 12 jam) dan nginx di-reload otomatis bila ada sertifikat baru. **Tidak perlu cron manual**.

Untuk pengecekan manual:
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm --entrypoint certbot certbot renew --dry-run --webroot -w /var/www/certbot
```

## 9. Update kode

Setelah edit kode (sync dari repo), build ulang container yang relevan.

- Hanya ubah frontend: `up -d --build nginx companyprofile` (ppdb/superadmin dibuild oleh nginx Dockerfile)
- Ubah API: `up -d --build api`
- Ubah WA service: `up -d --build whatsapp`

Atau rebuild semua: `up -d --build` (aman, tapi lebih lambat).

> Penting: kalau mengubah `PUBLIC_API_URL`, `PUBLIC_COMPANYPROFILE_URL`, `PUBLIC_PPDB_URL` di `.env.prod`, **WAJIB** rebuild `nginx` dan `companyprofile` (`up -d --build nginx companyprofile`) karena URL di-bake saat build.

## 10. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| nginx gagal start: `host not found in upstream api` | api belum ada saat nginx load? tapi pakai variable+resolver; jarang terjadi | Cek `docker compose ps api`, tunggu api `Up (healthy)` lalu `docker compose exec nginx nginx -s reload` |
| HTTPS tidak aktif meski DNS benar | Cert belum diterbitkan | Jalankan `./scripts/prod-certs.sh` (pastikan port 80 terbuka ke dunia) |
| 502 Bad Gateway di api.companyprofile/ppdb | api/companyprofile down/unhealthy | Cek `docker compose ps`, logs api/companyprofile, pastikan MySQL/Redis terhubung |
| CORS error saat login di browser | `CORS_ORIGINS` di apps/api/.env kurang frontend origin | Tambah `https://ppdb.*`, `https://admin.*`, `https://ptdarrahman.*` |
| Cookie tidak terset (401 berulang) | `COOKIE_SECURE` salah atau reverse proxy tidak kirim `X-Forwarded-Proto` | Pastikan `COOKIE_SECURE=true` di api/.env (nginx sudah set `X-Forwarded-Proto $scheme`) |
| Upload besar gagal 413 | client_max_body_size kurang | Sudah di-set 30m di nginx (api location) |
| SSE berhenti / buffering | proxy_buffering aktif | Sudah di-disable khusus `/companyprofile/events` |

## 11. Keamanan & catatan

- Hanya port 80/443 publik. Jangan expose redis/api/whatsapp/companyprofile.
- `redis` pakai `--maxmemory-policy noeviction` (Wajib untuk BullMQ).
- `apps/api/.env`, `apps/whatsapp/.env`, `.env.prod` **TIDAK BOLEH** di-commit.
- Gunakan SSH key, non-aktifkan password auth, batasi SSH ke IP tertentu bila perlu.
- Update docker images berkala: `docker compose pull` lalu `up -d --build`.
- Volume `wa_session`, `uploads_data` berisi data penting — backup berkala.

**Selesai.** Stack siap melayani produksi.
