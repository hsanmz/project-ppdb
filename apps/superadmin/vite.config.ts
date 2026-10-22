import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const apiProxy = {
  target: 'http://localhost:8000',
  changeOrigin: true,
  bypass: (req: any) => {
    // Kalau browser meminta dokumen HTML (navigasi SPA / refresh rute), jangan diproxy ke API!
    if (req.headers?.accept?.includes('text/html')) {
      return '/index.html'
    }
  },
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Gagal cepat kalau port dipakai (jangan geser diam-diam: HMR + API_BASE
    // mengasumsikan port ini).
    strictPort: true,
    proxy: {
      '/companyprofile': apiProxy,
      '/users': apiProxy,
      '/roles': apiProxy,
      '/modules': apiProxy,
      '/superadmin': apiProxy,
      '/ppdb': apiProxy,
      '/notifications': apiProxy,
      '/whatsapp': apiProxy,
    },
  },
  preview: {
    // WAJIB: `preview.proxy` default-nya mewarisi `server.proxy`. Tanpa override
    // ini, `vite preview` (dipakai di container frontend) ikut mem-proxy path
    // SPA seperti `/whatsapp`, `/users`, `/roles` ke `http://localhost:8000`
    // yang tidak ada di dalam container -> respons 502 Bad Gateway setiap kali
    // halaman tersebut dibuka langsung / di-refresh. API di produksi memang
    // dipanggil cross-origin lewat VITE_API_URL, jadi preview tidak perlu proxy.
    proxy: {},
  },
})
