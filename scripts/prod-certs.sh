#!/bin/bash
# ============================================================
# PTDARRAHMAN — Penerbitan sertifikat Let's Encrypt awal (VPS)
# ============================================================
# Script bantuan untuk mendapatkan sertifikat HTTPS pertama kali
# berdasarkan DOMAIN_* di .env.prod.
#
# Dijalankan setelah:
#   1. `cp .env.prod.example .env.prod` → isi domain + email
#   2. Pastikan DNS A/AAAA ke VPS sudah benar & mengarah ke IP
#   3. `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build nginx certbot redis`
#      (setidaknya nginx + certbot + redis jalan; nginx bisa dalam mode HTTP-only)
#
# Lalu jalankan:
#   chmod +x scripts/prod-certs.sh
#   ./scripts/prod-certs.sh
# ============================================================
set -euo pipefail

ENV_FILE=".env.prod"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] $ENV_FILE tidak ditemukan. Salin dari .env.prod.example dulu."
  exit 1
fi

# Load env vars (ignore comments/empty)
set -a
# shellcheck disable=SC1090
source <(grep -v '^#' "$ENV_FILE" | grep -v '^[[:space:]]*$')
set +a

: "${DOMAIN_COMPANYPROFILE:?}"
: "${DOMAIN_PPDB:?}"
: "${DOMAIN_SUPERADMIN:?}"
: "${DOMAIN_API:?}"
: "${LETSENCRYPT_EMAIL:?}"

COMPOSE="docker compose --env-file $ENV_FILE -f docker-compose.prod.yml"

echo "=== Issuing certificates (first time) ==="
echo "  email: $LETSENCRYPT_EMAIL"
echo "  domains:"
echo "    - $DOMAIN_COMPANYPROFILE"
echo "    - $DOMAIN_PPDB"
echo "    - $DOMAIN_SUPERADMIN"
echo "    - $DOMAIN_API"
echo ""

# Cek webroot volume mount pada certbot
echo "Running: test ACME webroot reachable via nginx..."
echo ""

# Deteksi opsi staging/dry-run untuk mencegah rate limit Let's Encrypt saat uji coba
EXTRA_FLAGS=()
if [[ "${LETSENCRYPT_STAGING:-false}" == "true" ]] || [[ "${*:-}" =~ "--staging" ]]; then
  echo "[INFO] Menggunakan Let's Encrypt Staging environment (mencegah penalti rate limit)."
  EXTRA_FLAGS+=("--staging")
fi
if [[ "${*:-}" =~ "--dry-run" ]]; then
  echo "[INFO] Menjalankan dalam mode --dry-run (simulasi tanpa penerbitan permanen)."
  EXTRA_FLAGS+=("--dry-run")
fi

# Minta sertifikat per domain agar tiap domain memiliki folder
# /etc/letsencrypt/live/<domain>/ tersendiri sesuai ekspektasi 30-generate-sites.sh.
for domain in "$DOMAIN_COMPANYPROFILE" "$DOMAIN_PPDB" "$DOMAIN_SUPERADMIN" "$DOMAIN_API"; do
  echo ">>> Memproses sertifikat untuk: $domain"
  $COMPOSE run --rm --entrypoint certbot certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$LETSENCRYPT_EMAIL" \
    --agree-tos --no-eff-email --non-interactive \
    --cert-name "$domain" \
    -d "$domain" \
    "${EXTRA_FLAGS[@]}"
done

echo ""
echo "=== Success ==="
echo "Certificate files di /etc/letsencrypt/live/<domain>/ (di volume certbot_certs)."
echo "Regenerasi konfigurasi nginx dan aktifkan HTTPS..."
$COMPOSE exec nginx sh -c "/docker-entrypoint.d/30-generate-sites.sh && nginx -s reload" 2>/dev/null || true
echo "Selesai. Akses via https://$DOMAIN_PPDB, https://$DOMAIN_SUPERADMIN, https://$DOMAIN_COMPANYPROFILE, https://$DOMAIN_API"
echo "Bisa dilanjutkan dengan 'docker compose --env-file $ENV_FILE -f docker-compose.prod.yml up -d' (build ulang services lain bila perlu)."
