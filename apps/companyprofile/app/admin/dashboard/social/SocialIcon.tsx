'use client'

import { cn } from '@/app/lib/utils'
import { Link2 } from 'lucide-react'
import { isRenderableSocialPath } from './social-utils'

/**
 * Renderer ikon tautan sosial.
 *
 * Data `path` dari admin adalah **data atribut `d` SVG** — dipasangkan
 * melalui atribut React `d`, BUKAN lewat `dangerouslySetInnerHTML`, sehingga
 * markup berbahaya (`<script>`, event handler, dsb.) tidak pernah bisa
 * dieksekusi. Nilai tak-valid tidak dirender sama sekali; ikon fallback
 * tampil sebagai tanda bahwa entri perlu diperbaiki.
 *
 * Bentuk SVG-nya sama persis dengan renderer situs publik
 * (`Footer.tsx` & `ContactClient.tsx`: `viewBox 24, fill currentColor`),
 * supaya pratinjau di dashboard merepresentasikan hasil akhir 1:1.
 */
export function SocialIcon({
  path,
  className,
  fallbackClassName,
}: {
  path?: string | null
  className?: string
  fallbackClassName?: string
}) {
  const value = typeof path === 'string' ? path : ''
  if (!isRenderableSocialPath(value)) {
    return (
      <Link2
        aria-hidden="true"
        className={cn('h-5 w-5 text-[var(--text-muted)]', fallbackClassName)}
      />
    )
  }
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d={value} />
    </svg>
  )
}
