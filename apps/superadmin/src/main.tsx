import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query'
import App from './App'
import './index.css'

// Observabilitas: error query/mutation yang tidak ditangani halaman tetap
// meninggalkan jejak di console (dev tools / remote logging), alih-alih
// ditelan senyap. User-facing feedback tetap tanggung jawab tiap halaman.
function logUnhandled(scope: string, err: unknown) {
  console.error(`[superadmin:${scope}]`, err)
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => logUnhandled('query', error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => logUnhandled('mutation', error),
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Jejak terakhir untuk error yang lolos dari React ErrorBoundary dan promise
// yang gagal tanpa handler.
window.addEventListener('unhandledrejection', (e) => logUnhandled('unhandledrejection', e.reason))
window.addEventListener('error', (e) => logUnhandled('error', e.error ?? e.message))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
