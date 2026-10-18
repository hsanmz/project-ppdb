#!/bin/sh
# ============================================================
# PTDARRAHMAN — Nginx edge config generator (production)
# ------------------------------------------------------------
# Dijalankan otomatis oleh /docker-entrypoint.sh milik image nginx
# (folder /docker-entrypoint.d/) SEBELUM nginx start.
#
# File ini men-generate /etc/nginx/conf.d/default.conf dari variabel
# environment DOMAIN_* sehingga konfigurasi TIDAK terikat ke satu
# domain tertentu (subdomain final belum ditetapkan).
#
# Aturan penting:
#   - Sertifikat Let's Encrypt dibaca dari /etc/letsencrypt/live/<domain>.
#   - Jika sertifikat belum ada, situs tetap disajikan lewat HTTP (port 80)
#     agar stack bisa dipakai & certbot bisa menyelesaikan challenge.
#   - Jika sertifikat sudah ada, port 80 hanya melayani ACME + redirect 301
#     ke HTTPS, dan server TLS di port 443 diaktifkan.
# ============================================================
set -eu

CONF=/etc/nginx/conf.d/default.conf
SNIPPETS=/etc/nginx/snippets
CERT_ROOT=/etc/letsencrypt/live
ACME_ROOT=/var/www/certbot

: "${DOMAIN_COMPANYPROFILE:?DOMAIN_COMPANYPROFILE belum diisi (lihat .env.prod)}"
: "${DOMAIN_PPDB:?DOMAIN_PPDB belum diisi (lihat .env.prod)}"
: "${DOMAIN_SUPERADMIN:?DOMAIN_SUPERADMIN belum diisi (lihat .env.prod)}"
: "${DOMAIN_API:?DOMAIN_API belum diisi (lihat .env.prod)}"

mkdir -p "$SNIPPETS" "$ACME_ROOT" /var/log/nginx

# ── Blok lokasi proxy bersama ────────────────────────────────────────────────
proxy_headers() {
  cat <<'EOF'
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
EOF
}

# ── Lokasi untuk tiap jenis aplikasi ─────────────────────────────────────────
app_locations() {
  case "$1" in
    static-ppdb)
      cat <<'EOF'
        include /etc/nginx/snippets/security-headers.conf;
        root /usr/share/nginx/html/ppdb;
        index index.html;

        location ~* ^/assets/ {
            include /etc/nginx/snippets/security-headers.conf;
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
            try_files $uri =404;
        }

        location = /index.html {
            include /etc/nginx/snippets/security-headers.conf;
            add_header Cache-Control "no-store" always;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
EOF
      ;;
    static-superadmin)
      cat <<'EOF'
        include /etc/nginx/snippets/security-headers.conf;
        root /usr/share/nginx/html/superadmin;
        index index.html;

        location ~* ^/assets/ {
            include /etc/nginx/snippets/security-headers.conf;
            expires 1y;
            add_header Cache-Control "public, max-age=31536000, immutable";
            try_files $uri =404;
        }

        location = /index.html {
            include /etc/nginx/snippets/security-headers.conf;
            add_header Cache-Control "no-store" always;
        }

        location / {
            try_files $uri $uri/ /index.html;
        }
EOF
      ;;
    proxy-companyprofile)
      cat <<'EOF'
        location / {
            proxy_pass $upstream_companyprofile;
EOF
      proxy_headers
      cat <<'EOF'
            proxy_read_timeout 120s;
            proxy_send_timeout 120s;
        }
EOF
      ;;
    proxy-api)
      cat <<'EOF'
        # Server-Sent Events (/companyprofile/events) — wajib tanpa buffering.
        location = /companyprofile/events {
            proxy_pass $upstream_api;
            proxy_buffering off;
            proxy_cache off;
            proxy_read_timeout 24h;
            proxy_send_timeout 24h;
EOF
      proxy_headers
      cat <<'EOF'
        }

        location / {
            proxy_pass $upstream_api;
            client_max_body_size 30m;
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
EOF
      proxy_headers
      cat <<'EOF'
        }
EOF
      ;;
    *)
      echo "Tidak ada blok aplikasi untuk jenis '$1'" >&2
      exit 1
      ;;
  esac
}

# ── Server HTTP (port 80) ────────────────────────────────────────────────────
emit_http_server() {
  domain="$1"
  app="$2"
  cert="$3"

  echo "server {"
  echo "    listen 80;"
  echo "    listen [::]:80;"
  echo "    server_name ${domain};"
  echo ""
  echo "    # ACME (Let's Encrypt) — selalu aktif agar renew bisa kapan saja."
  echo "    location ^~ /.well-known/acme-challenge/ {"
  echo "        root ${ACME_ROOT};"
  echo "        default_type text/plain;"
  echo "    }"
  echo ""
  if [ "$cert" = "yes" ]; then
    echo "    location / {"
    echo "        return 301 https://\$host\$request_uri;"
    echo "    }"
  else
    app_locations "$app"
  fi
  echo "}"
  echo ""
}

# ── Server HTTPS (port 443) ──────────────────────────────────────────────────
emit_https_server() {
  domain="$1"
  app="$2"

  echo "server {"
  echo "    listen 443 ssl;"
  echo "    listen [::]:443 ssl;"
  echo "    http2 on;"
  echo "    server_name ${domain};"
  echo ""
  echo "    ssl_certificate     ${CERT_ROOT}/${domain}/fullchain.pem;"
  echo "    ssl_certificate_key ${CERT_ROOT}/${domain}/privkey.pem;"
  echo "    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\" always;"
  echo ""
  app_locations "$app"
  echo "}"
  echo ""
}

# ── Tulis konfigurasi ────────────────────────────────────────────────────────
{
  echo "# ============================================================"
  echo "# AUTO-GENERATED oleh 30-generate-sites.sh — JANGAN diedit manual."
  echo "# Ubah DOMAIN_* di .env.prod lalu recreate service nginx."
  echo "# ============================================================"
  echo ""
  echo "# Docker embedded DNS (127.0.0.11) supaya proxy_pass dengan variabel"
  echo "# tetap bisa resolve nama service walau container restart."
  echo "resolver 127.0.0.11 valid=10s ipv6=off;"
  echo "resolver_timeout 5s;"
  echo ""
  echo "server_tokens off;"
  echo "client_max_body_size 30m;"
  echo ""
  echo "map \$http_upgrade \$connection_upgrade {"
  echo "    default upgrade;"
  echo "    ''      close;"
  echo "}"
  echo ""
  echo "gzip on;"
  echo "gzip_comp_level 5;"
  echo "gzip_min_length 256;"
  echo "gzip_vary on;"
  echo "gzip_proxied any;"
  echo "gzip_types text/plain text/css text/xml application/json application/javascript application/xml application/xml+rss image/svg+xml font/woff2;"
  echo ""
  echo "ssl_protocols TLSv1.2 TLSv1.3;"
  echo "ssl_prefer_server_ciphers off;"
  echo "ssl_session_cache shared:SSL:10m;"
  echo "ssl_session_timeout 1d;"
  echo "ssl_session_tickets off;"
  echo ""
  echo "map \$http_host \$upstream_api { default http://api:8000; }"
  echo "map \$http_host \$upstream_companyprofile { default http://companyprofile:3000; }"
  echo ""

  for spec in \
    "proxy-companyprofile|${DOMAIN_COMPANYPROFILE}" \
    "static-ppdb|${DOMAIN_PPDB}" \
    "static-superadmin|${DOMAIN_SUPERADMIN}" \
    "proxy-api|${DOMAIN_API}"
  do
    app="${spec%%|*}"
    domain="${spec##*|}"

    if [ -f "${CERT_ROOT}/${domain}/fullchain.pem" ] && [ -f "${CERT_ROOT}/${domain}/privkey.pem" ]; then
      cert="yes"
    else
      cert="no"
    fi

    echo "# ── ${app} → ${domain} (cert: ${cert}) ──"
    emit_http_server "$domain" "$app" "$cert"
    if [ "$cert" = "yes" ]; then
      emit_https_server "$domain" "$app"
    fi
  done
} > "$CONF"

echo "[nginx] Konfigurasi di-generate:"
echo "[nginx]   companyprofile : ${DOMAIN_COMPANYPROFILE}"
echo "[nginx]   ppdb           : ${DOMAIN_PPDB}"
echo "[nginx]   superadmin     : ${DOMAIN_SUPERADMIN}"
echo "[nginx]   api            : ${DOMAIN_API}"

nginx -t

# ── Reload berkala ───────────────────────────────────────────────────────────
# Sertifikat diperbarui oleh container `certbot`; nginx perlu di-reload agar
# memuat sertifikat baru. Loop ringan ini aman (nginx -s reload no-op jika
# konfigurasi tidak berubah).
if ! pgrep -f "sleep 6h" >/dev/null 2>&1; then
  (
    while :; do
      sleep 6h
      nginx -s reload 2>/dev/null || true
    done
  ) &
fi

exit 0
