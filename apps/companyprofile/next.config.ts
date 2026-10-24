import path from "path";
import type { NextConfig } from "next";

// Origin API digunakan di CSP connect-src. Di produksi isi NEXT_PUBLIC_API_URL
// dengan domain API yang sebenarnya. localhost:8000 hanya safety net untuk dev.
const apiOrigin =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "") || "";
const cspConnectSrc = [
  "'self'",
  ...(apiOrigin ? [apiOrigin] : []),
  ...(apiOrigin.includes("localhost") ? [] : ["http://localhost:8000"]),
  "https:",
].join(" ");

// Origin API juga menyajikan `/uploads/...` (UPLOAD_PROVIDER=local|db). Di dev
// origin itu `http://localhost:8000`, sehingga pratinjau gambar di modal admin
// akan diblokir CSP kalau hanya `https:` yang diizinkan untuk `img-src`.
const cspImageSrc = [
  "'self'",
  "data:",
  "blob:",
  "https:",
  ...(apiOrigin ? [apiOrigin] : []),
  ...(apiOrigin.includes("localhost") ? [] : ["http://localhost:8000"]),
].join(" ");

// Host gambar untuk `next/image`.
//
// Selain CDN sendiri, backend juga menyajikan berkas unggahan: dengan
// `UPLOAD_PROVIDER=db` (atau `local`) respons `/companyprofile/upload` berisi
// `<base_url>/uploads/{id}`. next/image menolak host yang tidak terdaftar, dan
// penolakan itu *melempar* error — dialog CRUD admin ikut mati dan halaman
// publik yang memuat gambar tersebut balas 500. Karena itu origin API wajib
// ikut diizinkan.
//
// Fallback localhost hanya dipakai di non-produksi supaya daftar pola tidak
// tertinggal host dev pada build produksi.
const isProduction = process.env.NODE_ENV === "production";
const apiImageOrigin =
  apiOrigin || (isProduction ? "" : "http://localhost:8000");

const remotePatterns: {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
}[] = [
  { protocol: "https", hostname: "res.cloudinary.com" },
  { protocol: "https", hostname: "img.youtube.com" },
  { protocol: "https", hostname: "ui-avatars.com" },
  { protocol: "https", hostname: "images.unsplash.com" },
];

let apiImageHostname = "";
if (apiImageOrigin) {
  try {
    const api = new URL(apiImageOrigin);
    apiImageHostname = api.hostname;
    if (api.protocol === "http:" || api.protocol === "https:") {
      remotePatterns.push({
        protocol: api.protocol === "https:" ? "https" : "http",
        hostname: api.hostname,
        ...(api.port ? { port: api.port } : {}),
      });
    }
  } catch {
    // NEXT_PUBLIC_API_URL tidak valid: biarkan daftar apa adanya. Gambar
    // unggahan akan ditolak next/image ("hostname not configured").
  }
}

// Optimizer `next/image` menolak fetch ke IP privat (proteksi SSRF), sehingga
// `http://localhost:8000/uploads/...` tetap gagal walau sudah lolos
// `remotePatterns`. Dilonggarkan hanya ketika host API memang alamat lokal
// (situasi dev); di produksi host API publik sehingga flag tetap mati.
const allowLocalIp = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
].includes(apiImageHostname);

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
  images: {
    remotePatterns,
    dangerouslyAllowLocalIP: allowLocalIp,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.gstatic.com; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src ${cspImageSrc}; font-src 'self' data: https:; connect-src ${cspConnectSrc} blob:; frame-src 'self' https://www.youtube.com https://www.google.com https://maps.google.com; media-src 'self' data: blob: https:; object-src 'none'; base-uri 'self'; form-action 'self'` },
        ],
      },
    ];
  },
};

export default nextConfig;
