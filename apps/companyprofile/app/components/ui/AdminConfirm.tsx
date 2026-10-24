'use client'

import { useEffect, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { eventBus } from '@/app/lib/event-bus'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
}

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((res) => {
    eventBus.emit('confirm', opts, res)
  })
}

export default function AdminConfirm() {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [resolve, setResolve] = useState<((v: boolean) => void) | null>(null)

  useEffect(() => {
    return eventBus.on('confirm', (options, res) => {
      setOpts(options as ConfirmOptions)
      setOpen(true)
      setResolve(() => res as (v: boolean) => void)
    })
  }, [])

  const answer = (v: boolean) => {
    setOpen(false)
    resolve?.(v)
    setResolve(null)
  }

  const isDanger = opts?.variant === 'danger'

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) answer(false)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs transition-opacity duration-200 data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
        />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-sm p-6 md:p-8 bg-white/95 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl focus:outline-none transition-all duration-200"
          style={{ animation: 'confirmDialogIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div className="flex items-start gap-4">
            <div
              className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                isDanger ? 'bg-red-50' : 'bg-[var(--accent-subtle)]'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${isDanger ? 'text-red-500' : 'text-[var(--accent)]'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <DialogPrimitive.Title asChild>
                <h3 className="font-[var(--font-heading)] text-base font-semibold text-[var(--text)] mb-1">
                  {opts?.title}
                </h3>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description asChild>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {opts?.message}
                </p>
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                onClick={() => answer(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors cursor-pointer p-1 rounded-lg hover:bg-black/5"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => answer(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border)] text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-all duration-200 cursor-pointer"
            >
              {opts?.cancelLabel || 'Batal'}
            </button>
            <button
              type="button"
              onClick={() => answer(true)}
              className={`px-5 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 cursor-pointer ${
                isDanger
                  ? 'bg-red-500 hover:bg-red-600 shadow-md'
                  : 'bg-[var(--accent)] hover:bg-[var(--accent)]/90 shadow-md'
              }`}
            >
              {opts?.confirmLabel || 'Ya, Hapus'}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
