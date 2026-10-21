'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'
import { eventBus } from '@/app/lib/event-bus'

export type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: number
  type: ToastType
  message: string
}

// Penanda toast yang unik. `Date.now()` tidak aman: dua toast yang terbit
// dalam milidetik sama mendapat id sama → React key duplikat dan timer
// pertama ikut menghapus toast kedua.
let nextToastId = 0

export function toast(type: ToastType, message: string) {
  eventBus.emit('toast', type, message)
}

export default function AdminToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextToastId
    setToasts((prev) => [...prev.slice(-4), { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    return eventBus.on('toast', (type, message) => {
      addToast(type as ToastType, message as string)
    })
  }, [addToast])

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
  }
  const colors = {
    success: 'border-l-[var(--accent)] bg-[var(--accent-subtle)]',
    error: 'border-l-red-500 bg-red-50',
    warning: 'border-l-amber-500 bg-amber-50',
  }
  const iconColors = {
    success: 'text-[var(--accent)]',
    error: 'text-red-500',
    warning: 'text-amber-500',
  }

  return (
    // Live region ini SENGAJA selalu ada di DOM, bahkan saat kosong:
    // pembaca layar hanya membacakan pengumuman dari live region yang sudah
    // terpasang sebelum isinya berubah. Kalau kontainer di-unmount saat
    // kosong, notifikasi bisa terlewat tanpa terbaca.
    //
    // `role="status"` + `aria-live="polite"` membuat notifikasi sukses
    // dibacakan saat admin sedang fokus di tempat lain. Toast error memakai
    // `role="alert"` agar diumumkan segera (assertive).
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => {
        const Icon = icons[t.type]
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : undefined}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] shadow-lg border-l-4 ${colors[t.type]} backdrop-blur-md`}
            style={{
              animation: 'toastIn 0.3s ease-out',
            }}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors[t.type]}`} />
            <p className="text-sm text-[var(--text)] flex-1">{t.message}</p>
            <button
              onClick={() => remove(t.id)}
              className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
