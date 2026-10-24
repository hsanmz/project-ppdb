'use client'

import { Quote } from 'lucide-react'
import * as api from '@/app/lib/api'
import { resolveImageSrc } from '@/app/lib/image-file'
import { cn } from '@/app/lib/utils'

interface Props {
  name: string
  child: string
  quote: string
  image: string
  className?: string
}

/**
 * Pratinjau ringan yang mengikuti presentasi publik:
 * kutipan miring, foto bulat, lalu nama wali & santri.
 *
 * Komponen ini tidak menyimpan data dan tidak mengubah form; ia hanya membaca
 * nilai yang sedang diketik. Kutipan dipotong empat baris supaya tidak
 * mendorong bagian lain dari kolom form.
 */
export function TestimonialPreview({ name, child, quote, image, className }: Props) {
  const initial = name.trim().charAt(0).toUpperCase()
  const previewSrc = image ? resolveImageSrc(image, api.API_BASE) : ''
  const trimmedQuote = quote.trim()

  return (
    <div
      className={cn(
        'rounded-2xl border border-[var(--border)]/60 bg-white/70 p-4',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--text-muted)] uppercase">
          Pratinjau halaman publik
        </p>
        <span className="shrink-0 rounded-full bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
          Ringkas
        </span>
      </div>

      <Quote className="mx-auto mb-2 h-5 w-5 text-[var(--accent)] opacity-25" aria-hidden="true" />
      <p
        className={cn(
          'line-clamp-4 text-center text-sm leading-relaxed whitespace-pre-line italic',
          trimmedQuote ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]',
        )}
      >
        {trimmedQuote ? `\u201c${trimmedQuote}\u201d` : 'Kutipan testimoni akan tampil di sini.'}
      </p>

      <div className="mt-4 flex items-center justify-center gap-3 border-t border-[var(--border)]/60 pt-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent)]/20 bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">
          {initial || '?'}
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL gambar bebas dari admin; fallback inisial tetap di belakang.
            <img
              src={previewSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : null}
        </span>
        <div className="min-w-0 text-left">
          <p className="truncate font-heading text-sm font-bold text-[var(--text)]">
            {name.trim() || 'Nama wali santri'}
          </p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {child.trim() || 'Nama anak / santri'}
          </p>
        </div>
      </div>
    </div>
  )
}
