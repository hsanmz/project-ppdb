/**
 * Base URL situs publik (company profile), untuk action "Lihat Situs" di
 * dashboard.
 *
 * `configured` sengaja dibiarkan sebagai parameter, bukan dibaca dari
 * `import.meta.env` di dalam paket ini: `packages/ui` dikonsumsi Next.js
 * (companyprofile) DAN Vite (ppdb, superadmin), sedangkan cara akses env-nya
 * berbeda — `process.env.NEXT_PUBLIC_*` vs `import.meta.env.VITE_*`. Membaca
 * env di sini membuat typecheck Next gagal karena `ImportMeta.env` tidak ada
 * di sana. Jadi tiap aplikasi membaca env-nya sendiri lalu meneruskannya.
 *
 * Logika sebelumnya hanya ada di `apps/ppdb/src/components/layout/Footer.tsx`;
 * dipindah ke sini karena semua panel dashboard memakai DashboardShell yang sama.
 */
export function resolveCompanyProfileUrl(configured?: string): string {
  if (configured) return configured.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const { hostname, protocol, port } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return `${protocol}//${hostname}:3000`
    }
    // Subdomain to root domain mapping:
    // e.g. ppdb.ptdarrahman.sch.id -> https://ptdarrahman.sch.id
    // e.g. admin.sekolah.sch.id -> https://sekolah.sch.id
    const rootHost = hostname.replace(/^(?:ppdb|superadmin|admin|portal)\./i, '')
    const portPart = port && port !== '80' && port !== '443' ? `:${port}` : ''
    return `${protocol}//${rootHost}${portPart}`
  }

  return 'http://localhost:3000'
}

/**
 * Dynamic PPDB portal URL resolver based on current active domain/host.
 */
export function resolvePortalUrl(configured?: string): string {
  if (configured) return configured.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const { hostname, protocol, port } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return `${protocol}//${hostname}:5174`
    }
    const baseHost = hostname.replace(/^(?:www\.)/i, '')
    if (/^ppdb\./i.test(baseHost)) {
      const portPart = port && port !== '80' && port !== '443' ? `:${port}` : ''
      return `${protocol}//${baseHost}${portPart}`
    }
    const portPart = port && port !== '80' && port !== '443' ? `:${port}` : ''
    return `${protocol}//ppdb.${baseHost}${portPart}`
  }

  return 'http://localhost:5174'
}
